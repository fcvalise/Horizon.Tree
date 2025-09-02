// SimpleBoidForces.ts
import { RNG } from "_RNG";
import { TMath } from "_TreeMath";
import * as hz from "horizon/core";

export class SimpleBoidForces extends hz.Component<typeof SimpleBoidForces> {
  neighborRadius: number = 6.0;
  separationRadius: number = 1.2;

  alignWeight: number = 1.0;
  cohesionWeight: number = 0.8;
  separationWeight: number = 1;
  wanderWeight: number = 0.2;
  boundsWeight: number = 0.6;

  maxSpeed: number = 10.0;
  maxAccel: number = 22.0;
  turnResponse: number = 2.0;
  wanderJitter: number = 0.2;

  playerAvoidRadius: number = 3;
  playerAvoidWeight: number = 100;

  worldCenter: hz.Vec3 = hz.Vec3.zero;
  worldRadius: number = 15.0;

  private static All: SimpleBoidForces[] = [];
  private wander: hz.Vec3 = hz.Vec3.forward;
  private body!: hz.PhysicalEntity;
  private rng!: RNG;
  private jumpingTimer: number = 0;

  constructor() {
    super();
    this.connectLocalBroadcastEvent(hz.World.onUpdate, (d) => this.onUpdate(d.deltaTime));
    this.rng = new RNG('Default');
    this.separationRadius = this.rng.range(1, 4)
  }

  preStart() {
    SimpleBoidForces.All.push(this);
    // this.wander = hz.Vec3.randomUnit();
  }

  start() {
    this.body = this.entity.as(hz.PhysicalEntity) ?? this.entity;
  }

  onDestroy() {
    const i = SimpleBoidForces.All.indexOf(this);
    if (i >= 0) SimpleBoidForces.All.splice(i, 1);
  }

  private onUpdate(dt: number) {
    if (dt <= 0) return;

    const pos = this.entity.position.get() ?? hz.Vec3.zero;
    const vel = this.body.velocity.get() as hz.Vec3;
    const mass = 1;
    const nR2 = this.neighborRadius * this.neighborRadius;
    const sR2 = this.separationRadius * this.separationRadius;

    let n = 0;
    let sumPos = hz.Vec3.zero;
    let sumVel = hz.Vec3.zero;
    let sep = hz.Vec3.zero;

    for (const o of SimpleBoidForces.All) {
      if (o === this) continue;
      const op = o.entity.position.get() ?? hz.Vec3.zero;
      const to = hz.Vec3.sub(op, pos);
      const d2 = hz.Vec3.dot(to, to);
      if (d2 > nR2) continue;

      n++;
      sumPos = hz.Vec3.add(sumPos, op);
      sumVel = hz.Vec3.add(sumVel, (o.body.velocity.get() as hz.Vec3));

      if (d2 < sR2 && d2 > 1e-6) {
        sep = hz.Vec3.sub(sep, TMath.vScale(to, 1 / Math.max(0.0001, d2)));
      }
    }

    let accel = hz.Vec3.zero;

    if (n > 0) {
      const avgVel = TMath.vScale(sumVel, 1 / n);
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(this.scaleToSpeed(avgVel, this.maxSpeed), vel), this.alignWeight));

      const center = TMath.vScale(sumPos, 1 / n);
      const toCenter = this.scaleToSpeed(hz.Vec3.sub(center, pos), this.maxSpeed);
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(toCenter, vel), this.cohesionWeight));
    }

    if (!this.isZero(sep)) {
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(this.scaleToSpeed(sep, this.maxSpeed), vel), this.separationWeight));
    }

    this.wander = hz.Vec3.normalize(hz.Vec3.lerp(this.wander, this.rng.vector(), this.wanderJitter * dt));
    accel = hz.Vec3.add(accel, TMath.vScale(this.wander, this.wanderWeight));

    if (this.entity.position.get().y < 0.5) {
      accel = hz.Vec3.add(accel, hz.Vec3.up.mul(10));
    }

    const playerList = this.world.getPlayers();
    for (const player of playerList) {

    }
    const playerAvoid = this.computePlayerAvoidance(pos);
    if (playerAvoid) {
      const desired = this.steerTowards(this.scaleToSpeed(playerAvoid, this.maxSpeed), vel);
      accel = hz.Vec3.add(accel, TMath.vScale(desired, this.playerAvoidWeight));
    }

    const toC = hz.Vec3.sub(this.worldCenter, pos);
    const dist = Math.sqrt(hz.Vec3.dot(toC, toC));
    if (dist > this.worldRadius * 0.9) {
      const back = this.scaleToSpeed(toC, this.maxSpeed);
      const t = (dist - this.worldRadius * 0.9) / (this.worldRadius * 0.3);
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(back, vel), this.boundsWeight * (0.5 + 2.5 * t)));
    }

    // --- Clamp and scale ---
    accel = this.clampMag(TMath.vScale(accel, this.turnResponse), this.maxAccel);

    const steerForce = TMath.vScale(accel, mass);
    this.body.applyForce(steerForce, hz.PhysicsForceMode.Force);

    if (hz.Vec3.dot(vel, vel) > 1e-6) {
      const desiredDir = hz.Vec3.normalize(vel);
      const forward = this.entity.forward.get();   // current facing
      const torqueAxis = hz.Vec3.cross(forward, desiredDir);
      const angle = Math.asin(Math.min(1, Math.max(-1, TMath.vLen(torqueAxis))));
      const torque = TMath.vScale(hz.Vec3.normalize(torqueAxis), angle * this.turnResponse);
      this.body.applyTorque(torque);
    }

    // Brake if over max speed
    const speed2 = hz.Vec3.dot(vel, vel);
    if (speed2 > this.maxSpeed * this.maxSpeed) {
      const speed = Math.sqrt(speed2);
      const excess = speed - this.maxSpeed;
      const brakeGain = mass * this.maxAccel * 0.75;
      const brake = TMath.vScale(hz.Vec3.normalize(vel), -brakeGain * (excess / this.maxSpeed));
      this.body.applyForce(brake, hz.PhysicsForceMode.Force);
    }

    const rotation = hz.Quaternion.lookRotation(this.entity.forward.get());
    this.entity.rotation.set(rotation);
  }

  private computePlayerAvoidance(selfPos: hz.Vec3): hz.Vec3 | null {
    const r2 = this.playerAvoidRadius * this.playerAvoidRadius;
    let sum = hz.Vec3.zero;
    let count = 0;

    const players = this.world.getPlayers();
    for (const p of players) {
      const to = hz.Vec3.sub(p.position.get(), selfPos);
      const d2 = hz.Vec3.dot(to, to);
      if (d2 > r2 || d2 <= 1e-6) continue;

      // push away inverse-square, capped
      const push = TMath.vScale(to, -1 / Math.max(0.0001, d2));
      sum = hz.Vec3.add(sum, push);
      count++;
    }

    if (count === 0) return null;
    // Normalize so many players don’t explode the force
    return hz.Vec3.normalize(sum);
  }

  private steerTowards(desiredVel: hz.Vec3, currentVel: hz.Vec3): hz.Vec3 {
    return this.clampMag(hz.Vec3.sub(desiredVel, currentVel), this.maxAccel);
  }

  private scaleToSpeed(dir: hz.Vec3, speed: number): hz.Vec3 {
    const d2 = hz.Vec3.dot(dir, dir);
    if (d2 < 1e-8) return hz.Vec3.zero;
    return TMath.vScale(hz.Vec3.normalize(dir), speed);
  }

  private clampMag(v: hz.Vec3, m: number): hz.Vec3 {
    const d2 = hz.Vec3.dot(v, v);
    if (d2 <= m * m) return v;
    return TMath.vScale(hz.Vec3.normalize(v), m);
  }

  private isZero(v: hz.Vec3) {
    return hz.Vec3.dot(v, v) < 1e-10;
  }
}
hz.Component.register(SimpleBoidForces)