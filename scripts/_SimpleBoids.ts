// SimpleBoids.ts
import { RNG } from "_RNG";
import { TMath } from "_TreeMath";
import * as hz from "horizon/core";

export class SimpleBoids extends hz.Component<typeof SimpleBoids> {
  neighborRadius: number = 20.0;
  separationRadius: number = 3;
  
  alignWeight: number = 0.6;
  cohesionWeight: number = 0.8;
  separationWeight: number = 1;
  wanderWeight: number = 0.8;
  boundsWeight: number = 0.8;

  maxSpeed: number = 6.0;
  maxAccel: number = 1.0;
  turnResponse: number = 1.0;
  wanderJitter: number = 0.7;

  playerAvoidRadius: number = 3;
  playerAvoidWeight: number = 1.2;

  worldCenter: hz.Vec3 = new hz.Vec3(0, 20, 0);
  worldRadius: number = 10.0;

  private static All: SimpleBoids[] = [];
  private wander: hz.Vec3 = hz.Vec3.forward;
  private rng!: RNG;
  private vel: hz.Vec3 = hz.Vec3.zero;

  start(): void {
    this.connectLocalBroadcastEvent(hz.World.onUpdate, (d) => this.onUpdate(d.deltaTime));
    this.rng = new RNG("Default");
    this.entity.simulated.set(false);
    this.separationRadius = this.rng.range(3, 12);
  }

  preStart() {
    SimpleBoids.All.push(this);
  }

  onDestroy() {
    const i = SimpleBoids.All.indexOf(this);
    if (i >= 0) SimpleBoids.All.splice(i, 1);
  }

  private onUpdate(dt: number) {
    if (dt <= 0) return;

    const pos = this.entity.position.get() ?? hz.Vec3.zero;
    const nR2 = this.neighborRadius * this.neighborRadius;
    const sR2 = this.separationRadius * this.separationRadius;

    let n = 0;
    let sumPos = hz.Vec3.zero;
    let sumVel = hz.Vec3.zero;
    let sep = hz.Vec3.zero;

    for (const o of SimpleBoids.All) {
      if (o === this) continue;
      const op = o.entity.position.get() ?? hz.Vec3.zero;
      const to = hz.Vec3.sub(op, pos);
      const d2 = hz.Vec3.dot(to, to);
      if (d2 > nR2) continue;

      n++;
      sumPos = hz.Vec3.add(sumPos, op);
      sumVel = hz.Vec3.add(sumVel, o.vel);

      if (d2 < sR2 && d2 > 1e-6) {
        sep = hz.Vec3.sub(sep, TMath.vScale(to, 1 / Math.max(0.0001, d2)));
      }
    }

    let accel = hz.Vec3.zero;

    if (n > 0) {
      const avgVel = TMath.vScale(sumVel, 1 / n);
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(this.scaleToSpeed(avgVel, this.maxSpeed), this.vel), this.alignWeight));

      const center = TMath.vScale(sumPos, 1 / n);
      const toCenter = this.scaleToSpeed(hz.Vec3.sub(center, pos), this.maxSpeed);
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(toCenter, this.vel), this.cohesionWeight));
    }

    if (!this.isZero(sep)) {
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(this.scaleToSpeed(sep, this.maxSpeed), this.vel), this.separationWeight));
    }

    this.wander = hz.Vec3.normalize(hz.Vec3.lerp(this.wander, this.rng.vector(), this.wanderJitter * dt));
    accel = hz.Vec3.add(accel, TMath.vScale(this.wander, this.wanderWeight));

    const playerAvoid = this.computePlayerAvoidance(pos);
    if (playerAvoid) {
      const desired = this.steerTowards(this.scaleToSpeed(playerAvoid, this.maxSpeed), this.vel);
      accel = hz.Vec3.add(accel, TMath.vScale(desired, this.playerAvoidWeight));
      this.maxAccel = 12;
    } else {
      this.maxAccel = 2;
    }

    let center = this.world.getPlayers().find(p => p.name.get() == "OisifGames")?.position.get()!;
    center.y += this.worldRadius;
    const toC = hz.Vec3.sub(center, pos);
    const dist = Math.sqrt(hz.Vec3.dot(toC, toC));
    if (dist > this.worldRadius * 0.9) {
      const back = this.scaleToSpeed(toC, this.maxSpeed);
      const t = (dist - this.worldRadius * 0.9) / (this.worldRadius * 0.3);
      accel = hz.Vec3.add(accel, TMath.vScale(this.steerTowards(back, this.vel), this.boundsWeight * (0.5 + 2.5 * t)));
    }

    // Clamp and integrate
    accel = this.clampMag(TMath.vScale(accel, this.turnResponse), this.maxAccel);
    this.vel = this.clampMag(hz.Vec3.add(this.vel, TMath.vScale(accel, dt)), this.maxSpeed);

    const newPos = hz.Vec3.add(pos, TMath.vScale(this.vel, dt));
    this.entity.position.set(newPos);

    if (hz.Vec3.dot(this.vel, this.vel) > 1e-6) {
      this.entity.rotation.set(hz.Quaternion.lookRotation(hz.Vec3.normalize(this.vel), hz.Vec3.up));
    }
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

      const push = TMath.vScale(to, -1 / Math.max(0.0001, d2));
      sum = hz.Vec3.add(sum, push);
      count++;
    }

    if (count === 0) return null;
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
hz.Component.register(SimpleBoids);
