import { OisifManager } from "_OManager";
import { TMath } from "_TreeMath";
import * as hz from "horizon/core";

/**
 * QuadrupedWalker (IK-style feet)
 * Legs FOLLOW the body: they try to stay under rotating/moving body
 * and only lift/step when they drift too far from their target under the body.
 *
 * You still provide legs (via pool) and ground hit (raycast).
 */

type LegID = "FL" | "FR" | "BL" | "BR";

class LegState {
    constructor(public id: LegID, public entity: hz.Entity) { }
    planted: hz.Vec3 | null = null;  // last grounded point
    current: hz.Vec3 | null = null;  // animated position
    desired: hz.Vec3 | null = null;  // target under body
    isStepping = false;
    t = 0;
}

export class QuadrupedWalker extends hz.Component<typeof QuadrupedWalker> {
    // body/rig layout (in body local space before rotation)
    private bodyHeight = 0.6;   // body origin height above ground
    private lateral = 0.25;     // half width
    private foreAft = 0.35;     // forward/back offset from body origin

    // stepping behavior
    private stepThreshold = 0.22;  // start a step if horizontal drift exceeds this
    private stepDuration = 0.22;   // seconds
    private stepHeight = 0.12;     // arc height at mid-step
    private lead = 0.18;           // place foot a bit ahead along body forward when replanting

    private legs = new Map<LegID, LegState>();
    private updateSub?: hz.EventSubscription;

    // rotate local Z+ (asset up) -> world Y+ (Horizon up)
    private static readonly Z_TO_Y = hz.Quaternion.fromAxisAngle(hz.Vec3.right, -Math.PI / 2);

    start() {
        // Acquire legs shortly after start; retry until pool ready
        this.async.setTimeout(() => this.createLegs(), 500);
    }

    /** Try to fetch 4 legs from your pool */
    public createLegs() {
        if (OisifManager.I.pool.count(false) >= 4) {
            const fl = OisifManager.I.pool.getRaw();
            const fr = OisifManager.I.pool.getRaw();
            const bl = OisifManager.I.pool.getRaw();
            const br = OisifManager.I.pool.getRaw();

            if (fl && fr && bl && br) {
                this.setLegs(fl, fr, bl, br);
            }
        } else {
            this.async.setTimeout(() => this.createLegs(), 1000);
        }
    }

    /** Register legs — no autonomous body movement */
    public setLegs(fl: hz.Entity, fr: hz.Entity, bl: hz.Entity, br: hz.Entity) {
        this.legs.clear();
        this.legs.set("FL", new LegState("FL", fl));
        this.legs.set("FR", new LegState("FR", fr));
        this.legs.set("BL", new LegState("BL", bl));
        this.legs.set("BR", new LegState("BR", br));

        // Initialize positions directly under body
        const bodyPos = this.entity.position.get();
        // const basis = this.getBodyBasis();

        this.legs.forEach((leg, id) => {
            const lateralSign = (id === "FL" || id === "BL") ? +1 : -1;
            const foreSign = (id === "FL" || id === "FR") ? +1 : -1;

            const localOffset = new hz.Vec3(
                this.foreAft * foreSign, // local +X forward
                0,
                this.lateral * lateralSign // local +Z to the right
            );
            // const worldOffset = this.rotateVecByQuat(localOffset, basis.rot)
            //     .add(new hz.Vec3(0, -this.bodyHeight, 0));
            const worldOffset = this.entity.forward.get().mul(foreSign).add(this.entity.right.get().mul(lateralSign));

            const seed = bodyPos.add(worldOffset);
            const planted = this.getGroundHit(seed);
            leg.planted = planted;
            leg.current = planted;
            leg.desired = planted;
            leg.entity.scale.set(new hz.Vec3(0.3, 0.3, 1));
            leg.entity.position.set(planted);
            leg.entity.collidable.set(false);

            // orient foot: body rotation then convert asset Z-up -> world Y-up
            // const footRot = hz.Quaternion.mul(basis.rot, QuadrupedWalker.Z_TO_Y);
            // leg.entity.rotation.set(footRot);
        });

        if (!this.updateSub) {
            this.updateSub = this.connectLocalBroadcastEvent(hz.World.onUpdate, (d) => this.onUpdate(d.deltaTime));
        }
    }

    /** Replace with your raycast (seed is a point roughly under the body). */
    protected getGroundHit(seed: hz.Vec3): hz.Vec3 {
        const gizmo = this.entity.as(hz.RaycastGizmo);
        if (gizmo) {
            const hit = gizmo.raycast(seed.add(hz.Vec3.up.mul(2)), hz.Vec3.down);
            if (hit) return hit.hitPoint;
        }
        return new hz.Vec3(seed.x, 0, seed.z);
    }

    private onUpdate(dt: number) {
        if (this.legs.size !== 4) return;

        const bodyPos = this.entity.position.get();
        const basis = this.getBodyBasis();

        // For each leg, recompute where it "should" be under the body, then step if too far
        this.legs.forEach((leg, id) => {
            const lateralSign = (id === "FL" || id === "BL") ? +1 : -1;
            const foreSign = (id === "FL" || id === "FR") ? +1 : -1;

            const localSupport = new hz.Vec3(
                this.foreAft * foreSign,
                0,
                this.lateral * lateralSign
            );
            const worldSupport = bodyPos
                .add(this.rotateVecByQuat(localSupport, basis.rot))
                .add(new hz.Vec3(0, -this.bodyHeight, 0));

            // place desired slightly ahead along body forward to reduce stutter
            const lead = this.rotateVecByQuat(new hz.Vec3(this.lead, 0, 0), basis.rot);
            const desired = this.getGroundHit(worldSupport.add(lead));
            leg.desired = desired;

            // measure horizontal drift from current foot to desired
            const cur = leg.current ?? desired;
            const dx = desired.x - cur.x;
            const dz = desired.z - cur.z;
            const horizDist = Math.hypot(dx, dz);

            const pair = this.legs.get(this.getPair(id))!;
            if (!leg.isStepping && horizDist > this.stepThreshold && (!pair.isStepping)) {
                this.beginStep(leg, desired);
            }
        });

        // Animate stepping legs; keep orientation synced
        this.legs.forEach((leg) => {
            // orientation: follow body rot with Z-up->Y-up fix
            const footRot = hz.Quaternion.mul(basis.rot, QuadrupedWalker.Z_TO_Y);
            leg.entity.rotation.set(footRot);

            if (!leg.isStepping) return;
            leg.t = Math.min(leg.t + dt / this.stepDuration, 1);
            const p = this.ease(leg.t);
            const start = leg.planted!;
            const end = leg.desired!;
            const pos = this.lerpVec3(start, end, p);
            const midBoost = this.stepHeight * (1 - Math.pow(2 * p - 1, 2));
            const withArc = new hz.Vec3(pos.x, pos.y + midBoost, pos.z);

            leg.current = withArc;
            leg.entity.position.set(withArc);

            if (leg.t >= 1) {
                leg.isStepping = false;
                leg.planted = end;
                leg.current = end;
                leg.entity.position.set(end);
            }
        });
    }

    private beginStep(leg: LegState, desired: hz.Vec3) {
        leg.isStepping = true;
        leg.t = 0;
        leg.desired = desired;
        if (!leg.planted) leg.planted = leg.entity.position.get();
    }

    private getPair(id: LegID): LegID {
        switch (id) {
            case "FL": return "BR";
            case "BR": return "FL";
            case "FR": return "BL";
            case "BL": return "FR";
        }
    }

    // --- Body basis & math helpers ---

    private getBodyBasis() {
        const rot = this.entity.rotation.get();
        const f = this.rotateVecByQuat(hz.Vec3.right, rot);   // local +X as forward
        const r = this.rotateVecByQuat(hz.Vec3.forward, rot); // local +Z as right
        const u = this.rotateVecByQuat(hz.Vec3.up, rot);      // local +Y as up
        return { forward: f, right: r, up: u, rot };
    }

    /** Rotate vector by quaternion (no engine helper needed). */
    private rotateVecByQuat(v: hz.Vec3, q: hz.Quaternion): hz.Vec3 {
        const x = q.x, y = q.y, z = q.z, w = q.w;
        const vx = v.x, vy = v.y, vz = v.z;
        // t = 2 * cross(q.xyz, v)
        const tx = 2 * (y * vz - z * vy);
        const ty = 2 * (z * vx - x * vz);
        const tz = 2 * (x * vy - y * vx);
        // v' = v + w*t + cross(q.xyz, t)
        const rx = vx + w * tx + (y * tz - z * ty);
        const ry = vy + w * ty + (z * tx - x * tz);
        const rz = vz + w * tz + (x * ty - y * tx);
        return new hz.Vec3(rx, ry, rz);
    }

    private ease(x: number) { return 1 - Math.pow(1 - x, 3); }
    private lerpVec3(a: hz.Vec3, b: hz.Vec3, t: number) {
        return new hz.Vec3(
            TMath.lerp(a.x, b.x, t),
            TMath.lerp(a.y, b.y, t),
            TMath.lerp(a.z, b.z, t)
        );
    }
}

hz.Component.register(QuadrupedWalker);
