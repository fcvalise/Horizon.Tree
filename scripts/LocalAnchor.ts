// LocalAnchor.ts
import * as hz from "horizon/core";

/** Small helpers */
const vAdd = (a: hz.Vec3, b: hz.Vec3) => new hz.Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
const vSub = (a: hz.Vec3, b: hz.Vec3) => new hz.Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
const vMul = (a: hz.Vec3, s: number) => new hz.Vec3(a.x * s, a.y * s, a.z * s);
const vLen = (a: hz.Vec3) => Math.hypot(a.x, a.y, a.z);
const vClamp = (a: hz.Vec3, maxMag: number) => {
  const L = vLen(a); if (L <= maxMag || L === 0) return a;
  const s = maxMag / L; return new hz.Vec3(a.x * s, a.y * s, a.z * s);
};
const qMulV = (q: hz.Quaternion, v: hz.Vec3) => q.mul(hz.Quaternion.fromEuler(v)); // rotate vector by quaternion (adjust if your API differs)

/** Transform a local point to world using parent's TRS (uniform enough for most cases) */
function localToWorld(parentPos: hz.Vec3, parentRot: hz.Quaternion, parentScale: hz.Vec3, local: hz.Vec3): hz.Vec3 {
  const scaled = new hz.Vec3(local.x * parentScale.x, local.y * parentScale.y, local.z * parentScale.z);
  return vAdd(parentPos, qMulV(parentRot, scaled).toEuler());
}

/** Small PD controller returning force/torque-like vector */
function pd(posErr: hz.Vec3, vel: hz.Vec3, kp: number, kd: number): hz.Vec3 {
  // a_desired ~ -kp * x - kd * v  (x = position error, v = current velocity)
  return vAdd(vMul(posErr, -kp), vMul(vel, -kd));
}

export class LocalAnchor extends hz.Component<typeof LocalAnchor> {
  // ——— Tuning (edit in Inspector) ———
  /** Position spring stiffness (higher = snappier) */
  public kp: number = 80;
  /** Position damping (higher = less oscillation) */
  public kd: number = 12;
  /** Safety clamp for force magnitude */
  public maxForce: number = 500;

  /** Also keep original local rotation? */
  public keepRotation: boolean = false;
  public kr: number = 50;  // rotational stiffness
  public dr: number = 8;   // rotational damping
  public maxTorque: number = 200;

  // ——— Internals ———
  private body!: hz.PhysicalEntity
  private parent!: hz.Entity | null;

  private localPos0!: hz.Vec3;
  private localRot0!: hz.Quaternion;

  private prevWorldPos!: hz.Vec3; // fallback velocity estimate if body velocity not exposed

  preStart() {
    // Cache initial local transform
    this.localPos0 = this.entity.transform.localPosition.get();
    this.localRot0 = this.entity.transform.localRotation.get();
  }

  start() {
    // Get physics body (adjust to your API):
    // e.g., this.body = this.entity.as(hz.RigidBody)
    this.body = this.entity.as(hz.PhysicalEntity) ?? null;

    this.parent = this.entity.parent.get();
    this.prevWorldPos = this.entity.position.get();

    // Subscribe to update
    this.connectLocalBroadcastEvent(hz.World.onUpdate, (d) => this.updateAnchor(d.deltaTime));
  }

  private updateAnchor(dt: number) {
    if (!this.parent) return; // requires a parent to define "local" reference

    // Parent world TRS
    const pPos = this.parent.position.get();
    const pRot = this.parent.rotation.get();
    const pScale = this.parent.scale.get();

    // Target world transform of the original local pose
    const targetPos = localToWorld(pPos, pRot, pScale, this.localPos0);

    // Current world pos/rot
    const curPos = this.entity.position.get();
    const posErr = vSub(curPos, targetPos);

    // Velocity of body (prefer body’s linear velocity; else finite-diff)
    let vel = new hz.Vec3(0, 0, 0);
    if (this.body?.velocity?.get) {
      vel = this.body.velocity.get();
    } else {
      const approx = vMul(vSub(curPos, this.prevWorldPos), 1 / Math.max(1e-4, dt));
      vel = approx;
    }
    this.prevWorldPos = curPos;

    // Compute and clamp force
    let force = pd(posErr, vel, this.kp, this.kd);
    force = vClamp(force, this.maxForce);

    // Apply force toward target (adjust to your physics API)
    // Common options:
    //   this.body.applyForce(force)                 // world-space
    //   this.body.applyForceAtPosition(force, curPos)
    //   this.body.addForce(force)
    this.body.applyForce(force, hz.PhysicsForceMode.Force);

    if (this.keepRotation) {
      // Keep original local rotation using torque PD.
      // Desired world rotation = parentRot * localRot0
      const targetRot = pRot.mul(this.localRot0); // adjust mul order if needed
      const curRot = this.entity.rotation.get();

      // Orientation error as axis-angle
      const dq = targetRot.mul(curRot.conjugate()); // rotation to go from current to target
      const axis = dq.axis(); // your API may expose axis()/angle()
      const angle = dq.angle(); // radians

      // Angular velocity (prefer rigidbody’s)
      let angVel = new hz.Vec3(0, 0, 0);
      if (this.body?.angularVelocity?.get) {
        angVel = this.body.angularVelocity.get();
      }

      // PD torque and clamp
      let torque = pd(vMul(axis, angle), angVel, this.kr, this.dr);
      torque = vClamp(torque, this.maxTorque);

      // Apply torque (adjust to your API)
      this.body.applyTorque(torque);
    }
  }
}
hz.Component.register(LocalAnchor)