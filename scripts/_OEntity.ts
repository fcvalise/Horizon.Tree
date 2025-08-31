import * as hz from "horizon/core";
import { Library } from "_Library";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

export class OEntity {
    private oPosition: hz.Vec3 = hz.Vec3.zero;
    private oRotation: hz.Quaternion = hz.Quaternion.zero;
    private oScale: hz.Vec3 = hz.Vec3.zero;
    private oColor: hz.Color = hz.Color.white;

    private syncAll: boolean = true;
    private syncPosition: boolean = true;
    private syncRotation: boolean = true;
    private syncScale: boolean = true;
    private syncColor: boolean = true;

    private staticProxy: hz.Entity | undefined;
    private isReady: boolean = true;
    
    constructor(
      public entity: hz.Entity | undefined,
      public wrapper: OWrapper,
      private pool: OPoolManager
    ) { }

    public dynamicCount() {
      return this.pool.count();
    }

    public makeDynamic(): boolean {
        if (this.getDynamic()) {
            this.cancelTweens();
            this.deleteStatic();
            return true;
        }
        return false;
    }

    public makeStatic(): boolean {
        if (this.getStatic()) {
          this.cancelTweens();
          return true;
        }
        return false;
    }
    
    public makeInvisible() {
        this.deleteDynamic();
        this.deleteStatic();
        this.cancelTweens();
    }

    private getDynamic(): boolean {
        if (!this.entity && this.pool.count() > 0) {
            this.entity = this.pool.get();
            this.syncAll = true;
            this.wrapper.onUpdateUntil(()=> this.sync(), () => !Boolean(this.entity));
            return true;
        }
        return false;
    }

    private deleteDynamic() {
        if (this.entity) {
            this.pool.release(this.entity);
            this.entity = undefined;
        }
    }

    private getStatic(): boolean {
        if (!this.staticProxy && this.isReady && this.entity) {
            this.isReady = false;
            const asset = new hz.Asset(BigInt(Library.matterStatic));
            this.wrapper.world.spawnAsset(asset, this.oPosition.add(hz.Vec3.up.mul(0.01)), this.oRotation, this.oScale.mul(1.02))
            .then((promise) => {
                this.staticProxy = promise[0];
                this.pool.staticCount++;
                this.isReady = true;
                this.deleteDynamic();
            });
            return true;
        }
        return false;
    }

    private deleteStatic() {
        if (this.staticProxy && this.isReady) {
            this.isReady = false;
            this.wrapper.world.deleteAsset(this.staticProxy).then(() => {
                this.staticProxy = undefined;
                this.pool.staticCount--;
                this.isReady = true;
            });
        }
    }

    public sync() {
        if (this.entity) {
            const mesh = this.entity.as(hz.MeshEntity);
            if (this.syncScale || this.syncAll) { this.entity.scale.set(this.oScale); this.syncScale = false; }
            if (this.syncColor || this.syncAll) { mesh.style.tintColor.set(this.oColor); this.syncColor = false; }
            if (this.syncPosition || this.syncAll) { this.entity.position.set(this.oPosition); this.syncPosition = false; }
            if (this.syncRotation || this.syncAll) { this.entity.rotation.set(this.oRotation); this.syncRotation = false; }
            this.syncAll = false;
        }
    }

    get position(): hz.Vec3 { return this.oPosition.clone(); }
    get rotation(): hz.Quaternion { return this.oRotation.clone(); }
    get scale(): hz.Vec3 { return this.oScale.clone(); }
    get color(): hz.Color { return this.oColor.clone(); }
    get isDynamic(): boolean { return Boolean(this.entity); }
    get isStatic(): boolean { return Boolean(this.staticProxy); }
    get isPhysics(): boolean { return this.entity?.simulated.get() ?? false; }

    set position(p: hz.Vec3) { this.oPosition = p; this.syncPosition = true }
    set rotation(p: hz.Quaternion) { this.oRotation = p; this.syncRotation = true }
    set scale(p: hz.Vec3) { this.oScale = p; this.syncScale = true }
    set color(p: hz.Color) { this.oColor = p; this.syncColor = true}
}


// --- EASING ---
type EaseFn = (t: number) => number;
const Ease = {
  linear: (t: number) => t,
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
} as const;

// --- HELPERS ---
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

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
    a.b + (b.b - a.b) * t,
  );
}
function quatSlerp(a: hz.Quaternion, b: hz.Quaternion, t: number): hz.Quaternion {
  const Q: any = hz.Quaternion as any;
  if (typeof Q.slerp === "function") return Q.slerp(a, b, t);
  if (typeof Q.lerp === "function")  return Q.lerp(a, b, t);
  return t < 1 ? a.clone() : b.clone();
}

// ---- unsubscribe helper (covers various Horizon shapes)
function unsubscribe(sub: any) {
  try {
    if (!sub) return;
    if (typeof sub === "function") { sub(); return; }
    if (typeof sub.disconnect === "function") { sub.disconnect(); return; }
    if (typeof sub.off === "function") { sub.off(); return; }
    if (typeof sub.cancel === "function") { sub.cancel(); return; }
    if (typeof sub.unsubscribe === "function") { sub.unsubscribe(); return; }
  } catch { /* ignore */ }
}

// --- OEntity tween methods (prototype extension) ---
interface TweenArgs {
  position?: hz.Vec3;
  rotation?: hz.Quaternion;
  scale?: hz.Vec3;
  color?: hz.Color;
  duration: number;   // seconds
  delay?: number;     // seconds
  ease?: EaseFn;
  makeStatic?: boolean;
}

declare module "_OEntity" {
  interface OEntity {
    tweenTo(args: TweenArgs): Promise<void>;
    moveTo(p: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    moveBy(d: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    rotateTo(q: hz.Quaternion, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    scaleTo(s: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    scaleZeroTo(s: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    tintTo(c: hz.Color, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    cancelTweens(): void;
    /** @internal */ __tweenSubs?: Set<any>;
  }
}

OEntity.prototype.cancelTweens = function (): void {
  if (!this.__tweenSubs) return;
  this.__tweenSubs.forEach((sub) => unsubscribe(sub));
  this.__tweenSubs.clear();
};

OEntity.prototype.tweenTo = function (args: TweenArgs): Promise<void> {
  const makeStatic = args.makeStatic ?? true;
  const ease  = args.ease ?? Ease.cubicOut;
  const delay = Math.max(0, args.delay ?? 0);
  const dur   = Math.max(0.0001, args.duration);

  // capture starts from LOCAL buffers (getters clone)
  const p0 = this.position, p1 = args.position ?? p0.clone();
  const q0 = this.rotation, q1 = args.rotation ?? q0.clone();
  const s0 = this.scale,    s1 = args.scale    ?? s0.clone();
  const c0 = this.color,    c1 = args.color    ?? c0.clone();

  if (!this.__tweenSubs) this.__tweenSubs = new Set<any>();

  // ensure a flush on next frame even if your constructor's sync loop isn't running yet
  (this as any).syncAll = true;

  let tAcc = 0;
  let started = (delay <= 0);

  return new Promise<void>((resolve) => {
    const sub = this.wrapper.onUpdate((dt: number) => {
      tAcc += dt;

      if (!started) {
        if (tAcc >= delay) { started = true; tAcc -= delay; } else { return; }
      }

      const t = clamp01(tAcc / dur);
      const k = ease(t);

      if (args.position) this.position = vec3Lerp(p0, p1, k);
      if (args.rotation) this.rotation = quatSlerp(q0, q1, k);
      if (args.scale)    this.scale    = vec3Lerp(s0, s1, k);
      if (args.color)    this.color    = colorLerp(c0, c1, k);

      if (t >= 1) {
        // snap to exact end
        if (args.position) this.position = p1.clone();
        if (args.rotation) this.rotation = q1.clone();
        if (args.scale)    this.scale    = s1.clone();
        if (args.color)    this.color    = c1.clone();
        if (makeStatic) this.makeStatic()

        unsubscribe(sub);
        this.__tweenSubs!.delete(sub);
        resolve();
      }
    });

    this.__tweenSubs!.add(sub);
  });
};

// convenience wrappers
OEntity.prototype.moveTo = function (p, duration, makeStatic, ease = Ease.cubicOut, delay = 0) {
  return this.tweenTo({ position: p, duration, makeStatic, ease, delay });
};
OEntity.prototype.moveBy = function (d, duration, makeStatic, ease = Ease.cubicOut, delay = 0) {
  return this.tweenTo({ position: this.position.add(d), duration, makeStatic, ease, delay });
};
OEntity.prototype.rotateTo = function (q, duration, makeStatic, ease = Ease.cubicOut, delay = 0) {
  return this.tweenTo({ rotation: q, duration, makeStatic, ease, delay });
};
OEntity.prototype.scaleTo = function (s, duration, makeStatic, ease = Ease.cubicOut, delay = 0) {
  return this.tweenTo({ scale: s, duration, makeStatic, ease, delay });
};
OEntity.prototype.tintTo = function (c, duration, makeStatic, ease = Ease.cubicOut, delay = 0) {
  return this.tweenTo({ color: c, duration, makeStatic, ease, delay });
};
OEntity.prototype.scaleZeroTo = function (s, duration, makeStatic, ease = Ease.cubicOut, delay = 0) {
  this.scale = hz.Vec3.zero;
  return this.tweenTo({ scale: s, duration, makeStatic, ease, delay });
};
