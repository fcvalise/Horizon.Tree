import * as hz from "horizon/core";
import { OEntity } from "_OEntity";

// ---------- EASING ----------
export type EaseFn = (t: number) => number;
export const Ease = {
  linear: (t: number) => t,
  quadInOut: (t: number) => (t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2),
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
};

// ---------- HELPERS ----------
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Fallback-friendly quaternion slerp: uses engine if present, else lerp→normalize (last resort snap)
function quatSlerp(a: hz.Quaternion, b: hz.Quaternion, t: number): hz.Quaternion {
  const Q: any = hz.Quaternion as any;
  if (typeof Q.slerp === "function") return Q.slerp(a, b, t);
  if (typeof Q.lerp === "function") return Q.lerp(a, b, t);
  return t < 1 ? a.clone() : b.clone();
}

function vec3Lerp(a: hz.Vec3, b: hz.Vec3, t: number): hz.Vec3 {
  return new hz.Vec3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

function colorLerp(a: hz.Color, b: hz.Color, t: number): hz.Color {
  return new hz.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

// ---------- OEntity TWEEN EXTENSIONS ----------
declare module "./_OEntity" { // <-- if this is the same file, you can remove this declare module block
  interface OEntity {
    tweenTo(args: {
      position?: hz.Vec3;
      rotation?: hz.Quaternion;
      scale?: hz.Vec3;
      color?: hz.Color;
      duration: number;        // seconds
      delay?: number;          // seconds
      ease?: EaseFn;
      makeStaticAfter?: boolean; // swap back to static once done
      keepPhysics?: boolean;     // keep physics on while tweening
    }): Promise<void>;

    moveTo(p: hz.Vec3, duration: number, ease?: EaseFn, opts?: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">>): Promise<void>;
    moveBy(delta: hz.Vec3, duration: number, ease?: EaseFn, opts?: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">>): Promise<void>;
    rotateTo(q: hz.Quaternion, duration: number, ease?: EaseFn, opts?: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">>): Promise<void>;
    scaleTo(s: hz.Vec3, duration: number, ease?: EaseFn, opts?: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">>): Promise<void>;
    tintTo(c: hz.Color, duration: number, ease?: EaseFn, opts?: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">>): Promise<void>;

    cancelTweens(): void;
  }
}

// Attach lightweight tween state to each OEntity without changing its shape
interface _TweenState {
  offs: Set<() => void>;
}
function getTweenState(self: OEntity): _TweenState {
  const key = "__tweenState__" as keyof OEntity;
  // @ts-ignore
  if (!self[key]) {
    // @ts-ignore
    self[key] = { offs: new Set<() => void>() } as _TweenState;
  }
  // @ts-ignore
  return self[key] as _TweenState;
}

// Implementations
OEntity.prototype.cancelTweens = function (): void {
  const st = getTweenState(this);
  st.offs.forEach((off) => { try { off(); } catch {} });
  st.offs.clear();
};

/**
 * Tween multiple channels at once (pos/rot/scale/color).
 * - Auto makes entity dynamic while tweening (unless you pass keepPhysics=true it will disable physics).
 * - Optionally swaps back to static after.
 * - Returns a Promise that resolves on completion.
 */
OEntity.prototype.tweenTo = function (args: {
  position?: hz.Vec3;
  rotation?: hz.Quaternion;
  scale?: hz.Vec3;
  color?: hz.Color;
  duration: number;
  delay?: number;
  ease?: EaseFn;
  makeStaticAfter?: boolean;
}): Promise<void> {
  const ease = args.ease ?? Ease.cubicOut;
  const delay = Math.max(0, args.delay ?? 0);
  const dur = Math.max(0.0001, args.duration);

  // Capture starts from current *local* buffers
  const startPos = this.position;
  const startRot = this.rotation;
  const startScl = this.scale;
  const startCol = this.color;

  const endPos = args.position ?? startPos.clone();
  const endRot = args.rotation ?? startRot.clone();
  const endScl = args.scale    ?? startScl.clone();
  const endCol = args.color    ?? startCol.clone();

  // Ensure we can actually move it visually: swap to dynamic and (optionally) turn off physics
  this.makeDynamic();

  let elapsed = 0;
  let started = delay <= 0;
  const st = getTweenState(this);

  return new Promise<void>((resolve) => {
    const off = this.wrapper.onUpdate((dt) => {
      elapsed += dt;

      if (!started) {
        if (elapsed >= delay) {
          started = true;
          elapsed -= delay;
        } else {
          return; // still waiting
        }
      }

      const t = clamp01(elapsed / dur);
      const k = ease(t);

      // Interpolate into your local buffers (your existing .sync will push them)
      if (args.position) this.position = vec3Lerp(startPos, endPos, k);
      if (args.rotation) this.rotation = quatSlerp(startRot, endRot, k);
      if (args.scale)    this.scale    = vec3Lerp(startScl, endScl, k);
      if (args.color)    this.color    = colorLerp(startCol, endCol, k);

      if (t >= 1) {
        // Snap to exact end state
        if (args.position) this.position = endPos.clone();
        if (args.rotation) this.rotation = endRot.clone();
        if (args.scale)    this.scale    = endScl.clone();
        if (args.color)    this.color    = endCol.clone();

        // Cleanup
        try { off(); } catch {}
        st.offs.delete(off);

        if (args.makeStaticAfter) this.makeStatic();
        resolve();
      }
    });

    st.offs.add(off);
  });
};

// Convenience helpers
OEntity.prototype.moveTo = function (
  p: hz.Vec3,
  duration: number,
  ease: EaseFn = Ease.cubicOut,
  opts: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">> = {}
): Promise<void> {
  return this.tweenTo({ position: p, duration, ease, ...opts });
};

OEntity.prototype.moveBy = function (
  delta: hz.Vec3,
  duration: number,
  ease: EaseFn = Ease.cubicOut,
  opts: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">> = {}
): Promise<void> {
  return this.tweenTo({ position: this.position.add(delta), duration, ease, ...opts });
};

OEntity.prototype.rotateTo = function (
  q: hz.Quaternion,
  duration: number,
  ease: EaseFn = Ease.cubicOut,
  opts: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">> = {}
): Promise<void> {
  return this.tweenTo({ rotation: q, duration, ease, ...opts });
};

OEntity.prototype.scaleTo = function (
  s: hz.Vec3,
  duration: number,
  ease: EaseFn = Ease.cubicOut,
  opts: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">> = {}
): Promise<void> {
  return this.tweenTo({ scale: s, duration, ease, ...opts });
};

OEntity.prototype.tintTo = function (
  c: hz.Color,
  duration: number,
  ease: EaseFn = Ease.cubicOut,
  opts: Partial<Pick<Parameters<OEntity["tweenTo"]>[0], "delay" | "makeStaticAfter" | "keepPhysics">> = {}
): Promise<void> {
  return this.tweenTo({ color: c, duration, ease, ...opts });
};
