import * as hz from "horizon/core";
import "./_OMath";
import { Library } from "_Library";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";
import { OColor } from "_OColor";
import { Easing } from "_Easing";
import { OMelody } from "_OMelody";
import { OTrail } from "_OTrail";

export class OEntity {
  public static melody: OMelody | undefined = undefined;
  private static trail: OTrail | undefined = undefined; // TODO : Use trail

  public staticProxy: hz.Entity | undefined;

  private oPosition: hz.Vec3 = hz.Vec3.zero;
  private oRotation: hz.Quaternion = hz.Quaternion.zero;
  private oScale: hz.Vec3 = hz.Vec3.zero;
  private oColor: hz.Color = OColor.White;
  private oSimulated: boolean = false;

  private syncAll: boolean = true;
  private syncPosition: boolean = true;
  private syncRotation: boolean = true;
  private syncScale: boolean = true;
  private syncColor: boolean = true;

  private isReady: boolean = true;
  private timestamp: number = Date.now();

  public tags: string[] = [];
  public isAutoSleep = true;
  public isAutoMelody = true;
  public isCollectible = false;
  public isSleeping = false;
  public isFalling = false;

  constructor(
    public entity: hz.Entity | undefined,
    public wrapper: OWrapper,
    private pool: OPoolManager
  ) { }

  public makeDynamic(deleteStatic: boolean = true): boolean {
    if (this.getDynamic()) {
      this.cancelTweens();
      if (this.isAutoMelody) this.playMelody();
      if (deleteStatic) this.deleteStatic();
      return true;
    }
    return false;
  }

  public makePhysic(): boolean {
    if (this.entity) {
      this.cancelTweens();
      this.entity.simulated.set(true);
      this.entity.interactionMode.set(hz.EntityInteractionMode.Physics);
      this.oSimulated = true;
      this.isSleeping = false;
      this.isFalling = false;
      this.updatePhysics();
      this.enableTrail(true)
      this.timestamp = Date.now();
      return true;
    }
    return false;
  }
  
  public makeStatic(needDynamic: boolean = true): boolean {
    if (this.getStatic(needDynamic)) {
      this.cancelTweens();
      return true;
    }
    return false;
  }

  public makeInvisible() {
    if (this.staticProxy) {
      this.deleteStatic();
    }
    if (this.entity) {
      this.deleteDynamic();
    }
  }

  private getDynamic(): boolean {
    if (this.entity || (!this.entity && this.pool.count() > 0)) {
      if (!this.entity) {
        this.entity = this.pool.get();
      }
      this.syncAll = true;
      this.entity?.tags.set(this.tags);
      this.wrapper.onUpdateUntil(() => this.sync(), () => !Boolean(this.entity));
      this.timestamp = Date.now();
      return true;
    }
    return false;
  }

  private deleteDynamic() {
    if (this.entity) {
      this.cancelTweens();
      this.pool.release(this.entity);
      this.entity = undefined;
    }
  }

  private getStatic(needDynamic: boolean): boolean {
    if (!this.staticProxy && this.isReady && (this.entity || !needDynamic)) {
      this.isReady = false;
      const id = Library.colorMap.get(this.oColor)!;
      const asset = new hz.Asset(BigInt(id));
      const position = this.oPosition.add(this.oRotation.forward.mul(0))
      const timestamp = this.timestamp = Date.now();
      this.wrapper.world.spawnAsset(asset, position, this.oRotation, this.oScale.mul(1))
      .then((promise) => {
        this.staticProxy = promise[0];
        this.staticProxy?.tags.set(this.tags);
        this.pool.staticCount++;
        this.isReady = true;
        if (timestamp < this.timestamp) {// something happen in between
          this.deleteStatic();
        } else {
          const colorCache = this.color.clone();
          const scaleCache = this.scale.clone();
          this.entity?.collidable.set(false);
          this.deleteDynamic();

          // this.tweenTo({
          //   duration: 0.3,
          //   color: this.color.mul(0.8),
          //   scale: this.scale.mul(1.1),
          //   ease: Ease.quadInOut,
          //   makeStatic: false,
          // }).then(() => {
          //   this.playMelody();
          //   this.tweenTo({
          //       duration: 0.2,
          //       color: colorCache,
          //       scale: scaleCache,
          //       ease: Ease.quadInOut,
          //       makeStatic: false,
          //   }).then(() => {
              // this.deleteDynamic();
            // })
          // })
        }
      });
      return true;
    }
    return false;
  }

  private deleteStatic() {
    if (this.staticProxy && this.isReady) {
      this.isReady = false;
      this.staticProxy.visible.set(false);
      this.wrapper.world.deleteAsset(this.staticProxy)
      .then(() => {
        this.staticProxy = undefined;
        this.pool.staticCount--;
        this.isReady = true;
      });
    }
  }

  private updatePhysics() {
    this.wrapper.onUpdateUntil(() => {
      this.oPosition = this.entity!.position.get();
      this.oRotation = this.entity!.rotation.get();
      const physics = this.entity?.as(hz.PhysicalEntity);
      const velocity = physics?.velocity.get().length2()!;
      if (!this.isFalling && velocity > 0.01) this.isFalling = true;
      else if (this.isFalling && !this.isSleeping && velocity < 0.1) {
        this.enableTrail(false);
        this.isSleeping = true;
      }
    }, () => (!Boolean(this.entity) || !this.oSimulated))
  }

  public enableTrail(isEnable: boolean = true) {
    if (!OEntity.trail) {
      OEntity.trail = new OTrail(this.wrapper);
    }
    if (isEnable) {
      OEntity.trail.attach(this);
    } else {
      OEntity.trail.detach(this);
    }
  }

  public setTags(tags: string[]) {
    this.entity?.tags.set(tags);
    this.tags = tags;
  }

  public playMelody() {
    
    if (!OEntity.melody) {
      OEntity.melody = new OMelody(this.wrapper, "Note")
        .useScale("dorian")
        .useKey("D")
        .setOctaves(0, 2)
        .setQuantize(true, { bpm: 300, maxPerTick: 12 });
    }
    this.wrapper.component.async.setTimeout(() => {
      OEntity.melody?.triggerWithTags(this.oPosition, this.tags);
    }, 30)
  }

  public sync() {
    if (this.entity) {
      const mesh = this.entity.as(hz.MeshEntity);
      if (this.syncPosition || this.syncAll) {
        this.entity.position.set(this.oPosition);
        this.syncPosition = false;
      }
      if (this.syncRotation || this.syncAll) {
        this.entity.rotation.set(this.oRotation);
        this.syncRotation = false;
      }
      if (this.syncScale || this.syncAll) {
        this.entity.scale.set(this.oScale);
        this.syncScale = false;
      }
      if (this.syncColor || this.syncAll) {
        mesh.style.tintColor.set(this.oColor);
        this.syncColor = false;
      }
      this.syncAll = false;
    }
  }

  get position(): hz.Vec3 { return this.oPosition.clone(); }
  get rotation(): hz.Quaternion { return this.oRotation.clone(); }
  get scale(): hz.Vec3 { return this.oScale.clone(); }
  get color(): hz.Color { return this.oColor.clone(); }
  get isDynamic(): boolean { return Boolean(this.entity); }
  get isStatic(): boolean { return Boolean(this.staticProxy); }
  get isPhysics(): boolean { return (this.entity && this.oSimulated) ?? false; } 
  get isInvisible(): boolean { return !this.staticProxy && this.isReady && !this.entity; }

  set position(p: hz.Vec3) { this.oPosition = p; this.syncPosition = true }
  set rotation(p: hz.Quaternion) { this.oRotation = p; this.syncRotation = true }
  set scale(p: hz.Vec3) { this.oScale = p; this.syncScale = true }
  set color(p: hz.Color) { this.oColor = p; this.syncColor = true }
}


// --- EASING ---
type EaseFn = (t: number) => number;
export const Ease = {
  linear: (t: number) => t,
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBounce: (t:number) => Easing.easeOutBounce(t),
  easeOutElastic: (t:number) => Easing.easeOutElastic(t),
  easeOutBack: (t:number) => Easing.easeOutBack(t),
  easeInQuart: (t:number) => Easing.easeInQuart(t),
  // custom: (t:number) => Easing.fastInBumpOut(t),
  custom: (t:number) => Easing.easeOutElastic(t),
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
  if (typeof Q.lerp === "function") return Q.lerp(a, b, t);
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

interface TweenArgs {
  position?: hz.Vec3;
  positionGetter?: () => hz.Vec3;
  rotation?: hz.Quaternion;
  rotationGetter?: () => hz.Quaternion;
  scale?: hz.Vec3;
  color?: hz.Color;
  duration: number;
  delay?: number;
  ease?: EaseFn;
  makeStatic?: boolean;
}

declare module "_OEntity" {
  interface OEntity {
    tweenTo(args: TweenArgs): Promise<void>;
    moveTo(p: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    moveToDynamic(getTargetPosition: () => hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    moveBy(d: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    rotateTo(q: hz.Quaternion, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    scaleTo(s: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    scaleZeroTo(s: hz.Vec3, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    tintTo(c: hz.Color, duration: number, makeStatic?: boolean, ease?: EaseFn, delay?: number): Promise<void>;
    isTweening(): boolean;
    cancelTweens(): void;
    /** @internal */ __tweenSubs?: Set<any>;
  }
}

OEntity.prototype.isTweening = function (): boolean {
  return Boolean(this.__tweenSubs && this.__tweenSubs.size > 0);
};

OEntity.prototype.cancelTweens = function (): void {
  if (!this.__tweenSubs) return;
  this.__tweenSubs.forEach((sub) => unsubscribe(sub));
  this.__tweenSubs.clear();
};

OEntity.prototype.tweenTo = function (args: TweenArgs): Promise<void> {
  if (this.isTweening()) this.cancelTweens();
  const makeStatic = args.makeStatic ?? true;
  const ease = args.ease ?? Ease.easeOutElastic;
  const delay = Math.max(0, args.delay ?? 0);
  const duration = Math.max(0.0001, args.duration);

  // capture starts from local buffers (getters clone)
  const startPosition = this.position;
  const startRotation = this.rotation;
  const startScale = this.scale;
  const startColor = this.color;

  // static end values (used when no getter is provided)
  const staticEndPosition = args.position ?? startPosition.clone();
  const staticEndRotation = args.rotation ?? startRotation.clone();
  const staticEndScale = args.scale ?? startScale.clone();
  const staticEndColor = args.color ?? startColor.clone();

  if (!this.__tweenSubs) this.__tweenSubs = new Set<any>();

  // ensure a flush on next frame even if your constructor's sync loop is not running yet
  (this as any).syncAll = true;

  let accumulatedTime = 0;
  let started = (delay <= 0);

  return new Promise<void>((resolve) => {
    const subscription = this.wrapper.onUpdate((deltaSeconds: number) => {
      accumulatedTime += deltaSeconds;

      if (!started) {
        if (accumulatedTime >= delay) { started = true; accumulatedTime -= delay; }
        else { return; }
      }

      const t = clamp01(accumulatedTime / duration);
      const k = ease(t);

      // If a positionGetter is provided, fetch the CURRENT target each frame.
      // Otherwise use the static value captured at start.
      const currentTargetPosition =
        typeof args.positionGetter === "function"
          ? args.positionGetter()
          : staticEndPosition;

      const currentTargetRotation =
        typeof args.rotationGetter === "function"
          ? args.rotationGetter()
          : staticEndRotation;

      if (args.position || args.positionGetter) {
        this.position = vec3Lerp(startPosition, currentTargetPosition, k);
      }
      if (args.rotation || args.rotationGetter) {
        this.rotation = quatSlerp(startRotation, currentTargetRotation, k);
      }
      if (args.scale) {
        this.scale = vec3Lerp(startScale, staticEndScale, k);
      }
      if (args.color) {
        this.color = colorLerp(startColor, staticEndColor, k);
      }

      if (t >= 1) {
        // Snap to exact end values at completion.
        if (args.position || args.positionGetter) this.position = currentTargetPosition.clone();
        if (args.rotation || args.rotationGetter) this.rotation = currentTargetRotation.clone();
        if (args.scale) this.scale = staticEndScale.clone();
        if (args.color) this.color = staticEndColor.clone();
        if (makeStatic) this.makeStatic();

        unsubscribe(subscription);
        this.__tweenSubs!.delete(subscription);
        resolve();
      }
    });

    this.__tweenSubs!.add(subscription);
  });
};

// convenience wrappers
OEntity.prototype.moveTo = function (p, duration, makeStatic, ease = Ease.custom, delay = 0) {
  return this.tweenTo({ position: p, duration, makeStatic, ease, delay });
};
OEntity.prototype.moveBy = function (d, duration, makeStatic, ease = Ease.custom, delay = 0) {
  return this.tweenTo({ position: this.position.add(d), duration, makeStatic, ease, delay });
};
OEntity.prototype.rotateTo = function (q, duration, makeStatic, ease = Ease.custom, delay = 0) {
  return this.tweenTo({ rotation: q, duration, makeStatic, ease, delay });
};
OEntity.prototype.scaleTo = function (s, duration, makeStatic, ease = Ease.custom, delay = 0) {
  return this.tweenTo({ scale: s, duration, makeStatic, ease, delay });
};
OEntity.prototype.tintTo = function (c, duration, makeStatic, ease = Ease.custom, delay = 0) {
  return this.tweenTo({ color: c, duration, makeStatic, ease, delay });
};
OEntity.prototype.scaleZeroTo = function (s, duration, makeStatic, ease = Ease.custom, delay = 0) {
  this.scale = hz.Vec3.zero;
  return this.tweenTo({ scale: s, duration, makeStatic, ease, delay });
};
OEntity.prototype.moveToDynamic = function (getTargetPosition, duration, makeStatic, ease = Ease.custom, delay = 0) {
  return this.tweenTo({ positionGetter: getTargetPosition, duration, makeStatic, ease, delay });
};