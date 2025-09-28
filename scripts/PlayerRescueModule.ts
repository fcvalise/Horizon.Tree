import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";
import LocalCamera from "horizon/camera";

export class PlayerRescueModule {
    private lastGroundedPos: hz.Vec3 = hz.Vec3.zero;
    private usedThisAir = false;
    private lastRescueTime = -9999;
    private player: hz.Player;
    private yLimit: number = -1;
    private minFallSpeed: number = -2;
    private rescueCooldownSec: number = 2;
    private desiredHorizSpeed: number = 1;
    private minFlightTime: number = 0.35;
    private maxFlightTime: number = 0.8;

    constructor(private wrapper: OWrapper, player: hz.Player) {
        this.player = player;
        this.wrapper.onUpdate(() => this.update());
    }

    private tryRescue() {
        const now = Date.now() / 1000;
        if (now - this.lastRescueTime < this.rescueCooldownSec) return;
        if (this.usedThisAir) return;
        if (this.player.isGrounded.get()) return;

        const vel = this.player.velocity.get();
        const pos = this.player.position.get();
        const falling = vel.y <= this.minFallSpeed;
        const tooLow = pos.y <= this.yLimit;

        if (!(falling && tooLow)) return;

        const target = this.lastGroundedPos;
        const impulse = this.computeBallisticImpulse(target);

        if (!impulse) return;

        this.player.applyForce(impulse);
        this.usedThisAir = true;
        this.lastRescueTime = now;
        // this.player.enterFocusedInteractionMode();
    }

    private update() {
        if (this.player.isGrounded.get()) {
            this.lastGroundedPos = this.player.position.get();
            this.usedThisAir = false;
            // this.player.exitFocusedInteractionMode();
            return;
        }
        this.tryRescue();
    }

       private computeBallisticImpulse(target: hz.Vec3): hz.Vec3 | null {
        const p0 = this.player.position.get();
        const v0 = this.player.velocity.get();
        const gravity = new hz.Vec3(0, -9.81, 0);
        target = target.add(hz.Vec3.up);

        const dx = target.x - p0.x;
        const dz = target.z - p0.z;
        const horizDist = Math.hypot(dx, dz);

        const desiredSpeed = Math.max(0.01, this.desiredHorizSpeed);
        let T = horizDist / desiredSpeed;
        T = T.clamp(this.minFlightTime, this.maxFlightTime);

        // v = (p1 - p0 - 0.5*g*T^2)/T
        const halfGT2 = gravity.mul(0.5 * T * T);
        const neededV = new hz.Vec3(
            (target.x - p0.x - halfGT2.x) / T,
            (target.y - p0.y - halfGT2.y) / T,
            (target.z - p0.z - halfGT2.z) / T
        );

        const deltaV = neededV.sub(v0);
        if (!isFinite(deltaV.x) || !isFinite(deltaV.y) || !isFinite(deltaV.z)) return null;
        return deltaV;
    }
}