// import { Easing } from "_Easing";
// import * as hz from "horizon/core";

// /** ---------- Simple Tween Manager (per-component) ---------- */
// type Easer = (x: number) => number;
// export const easeOutCubic: Easer = (x) => 1 - Math.pow(1 - x, 3);

// type TransformTween = {
//   entity: hz.Entity;

//   fromScale: hz.Vec3;
//   toScale: hz.Vec3;

//   fromPos: hz.Vec3;
//   toPos: hz.Vec3;

//   fromRot: hz.Quaternion;
//   toRot: hz.Quaternion;

//   duration: number;
//   timer: number;
//   ease: Easer;
//   onDone?: () => void;
// };

// export class TreeTween {
//   private list: TransformTween[] = [];

//   constructor(private comp: hz.Component) {
//     comp.connectLocalBroadcastEvent(hz.World.onUpdate, (d) => this.update(d.deltaTime));
//   }

//   /** Backward-compatible: only scale. */
//   public scaleTo(
//     entity: hz.Entity,
//     to: hz.Vec3,
//     seconds = 0.25,
//     ease: Easer = easeOutCubic,
//     onDone?: () => void
//   ) {
//     const curScale = entity.scale.get();
//     const curPos = entity.position.get?.() ?? new hz.Vec3(0, 0, 0);
//     const curRot = entity.rotation.get?.() ?? new hz.Quaternion(0, 0, 0, 1);
//     this.moveAndScaleTo(entity, to, curPos, curRot, seconds, ease, onDone);
//   }

//   /** New: tween scale, position, and rotation together. */
//   public moveAndScaleTo(
//     entity: hz.Entity,
//     scaleTo: hz.Vec3,
//     posTo: hz.Vec3,
//     rotTo: hz.Quaternion,
//     seconds = 0.25,
//     ease: Easer = easeOutCubic,
//     onDone?: () => void
//   ) {
//     // If zero/instant duration, snap and finish.
//     if (seconds <= 0) {
//       entity.scale.set(new hz.Vec3(scaleTo.x, scaleTo.y, scaleTo.z));
//       entity.position.set?.(new hz.Vec3(posTo.x, posTo.y, posTo.z));
//       entity.rotation.set?.(new hz.Quaternion(rotTo.x, rotTo.y, rotTo.z, rotTo.w));
//       onDone?.();
//       return;
//     }

//     // Remove any existing tween for this entity
//     if (this.list.find(t => t.entity === entity)) {
//       console.warn(`Entity was tweening already`);
      
//     }
//     this.list = this.list.filter(t => t.entity !== entity);

//     const curScale = entity.scale.get();
//     const curPos = entity.position.get?.() ?? new hz.Vec3(0, 0, 0);
//     const curRot = entity.rotation.get?.() ?? new hz.Quaternion(0, 0, 0, 1);

//     this.list.push({
//       entity,
//       fromScale: new hz.Vec3(curScale.x, curScale.y, curScale.z),
//       toScale: new hz.Vec3(scaleTo.x, scaleTo.y, scaleTo.z),

//       fromPos: new hz.Vec3(curPos.x, curPos.y, curPos.z),
//       toPos: new hz.Vec3(posTo.x, posTo.y, posTo.z),

//       fromRot: new hz.Quaternion(curRot.x, curRot.y, curRot.z, curRot.w),
//       toRot: new hz.Quaternion(rotTo.x, rotTo.y, rotTo.z, rotTo.w),

//       duration: Math.max(0.0001, seconds),
//       timer: 0,
//       ease,
//       onDone
//     });
//   }

//   public isTweening(entity: hz.Entity): boolean {
//     return Boolean(this.list.find(t => t.entity === entity));
//   }

//   public stop(entity: hz.Entity) {
//     const tween = this.list.find(t => t.entity === entity);
//     if (tween) this.list.splice(this.list.indexOf(tween), 1);
//   }

//   public stopAll() { this.list = []; }

//   private update(dt: number) {
//     if (this.list.length === 0) return;

//     for (let i = this.list.length - 1; i >= 0; --i) {
//       const tw = this.list[i];
//       tw.timer += dt;
//       const u = Math.min(1, tw.timer / tw.duration);
//       const elastic = Easing.easeInOutSine(u);// tw.ease(u);
      
//       // Guard: entity may be gone/pool-returned
//       if (!tw.entity) { this.list.splice(i, 1); continue; }
      
//       // Scale
//       const sx = lerp(tw.fromScale.x, tw.toScale.x, elastic);
//       const sy = lerp(tw.fromScale.y, tw.toScale.y, elastic);
//       const sz = lerp(tw.fromScale.z, tw.toScale.z, elastic);
//       tw.entity.scale.set(new hz.Vec3(sx, sy, sz));
      
//       const xz = Easing.easeInExpo(u);// tw.ease(u);
//       const y = Easing.easeInQuart(xz);// tw.ease(u);

//       // Position (if supported on this entity)
//       if (tw.entity.position?.set) {
//         const px = lerp(tw.fromPos.x, tw.toPos.x, xz);
//         const py = lerp(tw.fromPos.y, tw.toPos.y, y);
//         const pz = lerp(tw.fromPos.z, tw.toPos.z, xz);
//         tw.entity.position.set(new hz.Vec3(px, py, pz));
//       }

//       // Rotation (normalized lerp to avoid needing Quaternion.slerp)
//       if (tw.entity.rotation?.set) {
//         const q = nlerpQuat(tw.fromRot, tw.toRot, u);
//         tw.entity.rotation.set(q);
//       }

//       if (u >= 1) { tw.onDone?.(); this.list.splice(i, 1); }
//     }
//   }

//   static waitFor(component: hz.Component, condition: () => boolean, checkEveryMs = 50): Promise<void> {
//     return new Promise(resolve => {
//       if (condition()) return resolve();
//       const i = component.async.setInterval(() => {
//         if (condition()) { component.async.clearInterval(i); resolve(); }
//       }, checkEveryMs);
//     });
//   }
// }

// /** ---------- Helpers ---------- */
// function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// /** Safe, dependency-free quaternion nlerp (normalized linear interpolation). */
// function nlerpQuat(a: hz.Quaternion, b: hz.Quaternion, t: number): hz.Quaternion {
//   // Ensure shortest path by flipping b if needed (approximate using sign of dot)
//   // Since we don't have Quaternion.dot, estimate with manual dot product:
//   const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
//   const bx = dot < 0 ? -b.x : b.x;
//   const by = dot < 0 ? -b.y : b.y;
//   const bz = dot < 0 ? -b.z : b.z;
//   const bw = dot < 0 ? -b.w : b.w;

//   const x = a.x + (bx - a.x) * t;
//   const y = a.y + (by - a.y) * t;
//   const z = a.z + (bz - a.z) * t;
//   const w = a.w + (bw - a.w) * t;

//   // Normalize
//   const len = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
//   return new hz.Quaternion(x / len, y / len, z / len, w / len);
// }
