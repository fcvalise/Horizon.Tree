// ORaft.ts — pure TS builder (no Component)
// Usage:
//   const raft = new ORaft(wrapper, myPos, manager, { rows: 3, cols: 4 });
//   await raft.rebuild();
//   raft.translate(new hz.Vec3(2,0,0)); // move whole raft
//   raft.rotateEuler(new hz.Vec3(0,45,0)); // rotate whole raft
//   await raft.destroy();

import * as hz from "horizon/core";
import "./_OMath";
import { OWrapper } from "_OWrapper";
import { ORandom } from "_ORandom";
import { Ease, OEntity } from "_OEntity";
import { OEntityManager } from "_OEntityManager";
import { OColor } from "_OColor";
import { OUtils } from "_OUtils";

export type RaftParams = {
  lenght: number,          // (sic) keep your spelling for backward compatibility
  width: number,
  truncRow: number,
  ropeColumn: number,
  truncRadius: number,
  mastLength: number,
  mastRadius: number,
  sailRadius: number,
  sailPartCount: number
};

const DEFAULTS: RaftParams = {
  lenght: 4,
  width: 1.6,
  truncRow: 8,
  truncRadius: 0.4,
  ropeColumn: 2,
  mastRadius: 0.4,
  mastLength: 5,
  sailRadius: 2.5,
  sailPartCount: 10,
};

type PartLocal = {
  entity: OEntity;
  lpos: hz.Vec3;         // local position (relative to raft root)
  lrot: hz.Quaternion;   // local rotation
  lscale: hz.Vec3;       // local scale
};

export class ORaft {
  public params: RaftParams;
  private random!: ORandom;

  // Root transform (virtual parent)
  private rootPos: hz.Vec3;
  private rootRot: hz.Quaternion = hz.Quaternion.lookRotation(hz.Vec3.forward);

  private logs: OEntity[] = [];
  private mast?: OEntity;

  // Parts (entities) and their locals
  private parts: OEntity[] = [];
  private locals: PartLocal[] = [];

  constructor(
    private wrapper: OWrapper,
    position: hz.Vec3,
    private manager: OEntityManager,
    params?: Partial<RaftParams>
  ) {
    this.params = { ...DEFAULTS, ...(params ?? {}) };
    this.random = new ORandom(`Oisif`);
    this.rootPos = position.clone();
  }

  public set(p: Partial<RaftParams>): this {
    this.params = { ...this.params, ...p };
    return this;
  }

  // ---------------- Root transform API ----------------

  public setRoot(position?: hz.Vec3, rotation?: hz.Quaternion): this {
    if (position) this.rootPos = position.clone();
    if (rotation) this.rootRot = rotation.clone();
    this.applyRoot();
    return this;
  }

  public setPosition(position: hz.Vec3): this {
    this.rootPos = position.clone();
    this.applyRoot();
    return this;
  }

  public setRotation(rotation: hz.Quaternion): this {
    this.rootRot = rotation.clone();
    this.applyRoot();
    return this;
  }

  public translate(delta: hz.Vec3): this {
    this.rootPos = this.rootPos.add(delta);
    this.applyRoot();
    return this;
  }

  public rotateEuler(eulerDeg: hz.Vec3): this {
    const q = hz.Quaternion.fromEuler(eulerDeg);
    this.rootRot = hz.Quaternion.mul(q, this.rootRot);
    this.applyRoot();
    return this;
  }

  public lookAt(target: hz.Vec3, up: hz.Vec3 = hz.Vec3.up): this {
    const dir = target.sub(this.rootPos);
    this.rootRot = hz.Quaternion.lookRotation(dir, up);
    this.applyRoot();
    return this;
  }

  // Applies root transform to all parts (no parenting required)
  private applyRoot() {
    for (const it of this.locals) {
      const wpos = this.rootPos.add(hz.Quaternion.mulVec3(this.rootRot, it.lpos));
      const wrot = hz.Quaternion.mul(this.rootRot, it.lrot);
      it.entity.position = wpos;
      it.entity.rotation = wrot;
      it.entity.scale = it.lscale; // no root scale (simpler & cheap)
    }
  }

  // ---------------- Lifecycle ----------------

  public async destroy(): Promise<void> {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const part = this.parts[i];
      if (part.makeDynamic()) {
        const delay = (this.parts.length - 1 - i) * 0.025;
        part.tweenTo({
          delay,
          duration: this.random.range(0.22, 0.32),
          scale: hz.Vec3.zero,
          makeStatic: false,
          ease: Ease.easeOutBack
        });
        part.makeInvisible();
      }
    }
    for (const oe of this.parts) this.manager.delete(oe);

    this.logs.length = 0;
    this.parts.length = 0;
    this.locals.length = 0;
    this.mast = undefined;
  }

  public async rebuild(): Promise<void> {
    await this.destroy();

    // Build everything in LOCAL SPACE around (0,0,0).
    const xRight = -this.params.width;
    const xLeft =  this.params.width;

    for (let i = 0; i < this.params.truncRow; i++) {
      const trunc = this.manager.create();

      const lerpValue = i / this.params.truncRow;
      const lposX = this.jitter(Number.lerp(xLeft, xRight, lerpValue), 0.02);
      const lposZ = this.jitter(0, this.params.lenght * 0.02) - this.params.lenght;
      const lpos = new hz.Vec3(lposX, 0, lposZ);

      const lrot = hz.Quaternion.lookRotation(
        hz.Vec3.forward.mul(100).add(this.random.vectorHalf(hz.Vec3.forward))
      );

      const scaleXY = this.jitter(this.params.truncRadius, this.params.truncRadius * 0.2);
      const scaleZ  = this.jitter(this.params.lenght,     this.params.lenght * 0.04);
      const lscale = new hz.Vec3(scaleXY, scaleXY, scaleZ);

      this.attachLocal(trunc, lpos, lrot, lscale, OColor.Black, ["Raft","RaftLog","Walkable"]);
      this.logs.push(trunc);

      // Ropes along the log (still local)
      for (let k = 0; k < this.params.ropeColumn; k++) {
        const rope = this.manager.create();
        const percent = (k + 1) / (this.params.ropeColumn + 1);
        const along = hz.Quaternion.mulVec3(lrot, hz.Vec3.forward).mul(scaleZ * percent);
        const rpos = lpos.add(along);
        const rrot = lrot;
        const rscale = new hz.Vec3(scaleXY * 1.2, scaleXY * 1.2, this.random.range(0.15, 0.2));
        this.attachLocal(rope, rpos, rrot, rscale, OColor.White, ["Raft","Rope"]);
      }
    }

    // Mast in local space
    const mat = this.manager.create();
    const mastX = Number.lerp(xLeft, xRight, 0.5);
    const mastZ = -this.params.lenght * 0.3;
    const mpos = new hz.Vec3(mastX, 0, mastZ);
    const mrot = hz.Quaternion.lookRotation(hz.Vec3.up.mul(10).add(this.random.vectorHalf()));
    const mscale = new hz.Vec3(this.params.mastRadius, this.params.mastRadius, this.jitter(this.params.mastLength, this.params.mastLength * 0.1));
    this.attachLocal(mat, mpos, mrot, mscale, OColor.Black, ["Raft","RaftMast"]);
    this.mast = mat;

    // Leafy sail (local)
    for (let index = 0; index < this.params.sailPartCount; index++) {
      const sail = this.manager.create();
      const base = new hz.Vec3(mpos.x, mscale.z * 0.7, mpos.z);
      const lookAt = base.add(hz.Vec3.backward.mul(this.params.sailRadius * 1.8));
      let random = this.random.vectorHalf(hz.Vec3.forward).mul(this.params.sailRadius);
      random.z = random.z * 0.3;
      const spos = base.add(random);

      const dir = spos.sub(lookAt).add(this.random.vector().mul(this.params.sailRadius * 0.2));
      const srot = hz.Quaternion.lookRotation(dir);

      let sscale = new hz.Vec3(this.params.sailRadius, this.params.sailRadius, 0.1);
      const distance = Ease.cubicOut(1 + this.random.next() - spos.distance(base) / this.params.sailRadius);
      sscale = sscale.mul(distance);

      this.attachLocal(sail, spos, srot, sscale, OColor.LightGreen, ["Raft","Sail"]);
    }

    // Convert locals -> world once for initial placement
    this.applyRoot();

    // Reveal animation uses the *world* targets derived from locals
    await this.animateReveal();
    console.log(this.parts.length);
    
  }

  // Attach an entity with local transform + common bookkeeping
  private attachLocal(
    entity: OEntity,
    lpos: hz.Vec3,
    lrot: hz.Quaternion,
    lscale: hz.Vec3,
    color: hz.Color,
    tags: string[]
  ) {
    this.locals.push({ entity, lpos, lrot, lscale });
    this.parts.push(entity);

    // Set immediate world pose now (will be overridden by animateReveal later)
    const wpos = this.rootPos.add(hz.Quaternion.mulVec3(this.rootRot, lpos));
    const wrot = hz.Quaternion.mul(this.rootRot, lrot);

    entity.position = wpos;
    entity.rotation = wrot;
    entity.scale = lscale;
    entity.color = color;
    entity.setTags(tags);
  }

  // ---------------- Helpers ----------------

  private jitter(val: number, amt: number): number {
    if (amt <= 0) return val;
    return val + this.random.range(-amt, amt);
  }

  private async animateReveal() {
    // Organic order: lightly shuffle parts
    const order = [...this.parts];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.random.range(0, i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }

    let idx = 0;
    let done = 0;

    this.wrapper.onUpdateUntil(() => {
      const part = order[idx];
      if (!part) return;

      // Look up this part's local target and compute current world target
      const local = this.locals.find(l => l.entity === part)!;
      const targetPos = this.rootPos.add(hz.Quaternion.mulVec3(this.rootRot, local.lpos));
      const targetRot = hz.Quaternion.mul(this.rootRot, local.lrot);
      const targetScale = local.lscale.clone();

      if (!part.isTweening() && part.makeDynamic()) {
        // random start pose
        const startPos = this.random.vectorHalf();
        const startRot = this.random.rotation();

        const savedPos = part.position.clone();
        const savedRot = part.rotation.clone();
        const savedScale = part.scale.clone();

        part.position = startPos;
        part.rotation = startRot;
        part.scale = hz.Vec3.zero;

        part.tweenTo({
          delay: idx * 0.03,
          duration: this.random.range(0.42, 0.68),
          position: targetPos,
          rotation: targetRot,
          scale: targetScale,
          makeStatic: false,
          ease: Ease.easeOutBounce
        }).then(() => { done++; });

        // In case something cancels tween, restore last known values
        savedPos; savedRot; savedScale; // not used afterward; kept for clarity
        idx++;
      }
    }, () => idx >= order.length);

    await OUtils.waitFor(this.wrapper, () => done >= this.parts.length, 50);
  }
}
