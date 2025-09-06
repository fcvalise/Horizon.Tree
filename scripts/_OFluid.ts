import * as hz from 'horizon/core';
import "./_OMath";
import { OEntity } from '_OEntity';
import { OisifManager } from '_OManager';
import { OWrapper } from '_OWrapper';
import { ORandom } from '_ORandom';

type DropState = { falling: boolean; impactT: number };

class _OFluid extends hz.Component<typeof _OFluid> {
  private readonly alignZupToYup = new hz.Quaternion(-0.7071, 0, 0, 0.7071);

  private wrapper!: OWrapper;
  private random!: ORandom;
  private dropList: OEntity[] = [];
  private state = new WeakMap<OEntity, DropState>();

  private maxCount = 50;
  private timer = 0;
  private interval = 0.05;
  private index = 0;

  // tuning
  private baseScale = 0.1;
  private orientSpeed = 50;
  private splashTime = 0.12;
  private splashXY = 6;
  private splashZMin = 0.03;

  // falling stretch targets (for non-splash frames)
  private fallMinXY = 0.2;   // how thin XY gets at max fall
  private fallMaxZ = 10.0;    // how tall Z gets at max fall
  private maxVertSpeed = 10;  // |vy| that maps to full stretch
  private readonly eps = 0.02; // small deadzone to avoid jittering impacts at rest


  // color palette & weights
  private colRest = new hz.Color(0.20, 0.55, 1.00); // calm blue
  private colFast = new hz.Color(0.35, 0.90, 1.00); // cyan-ish for speed
  private colImpact = hz.Color.white;                 // flash on impact
  private colStretch = new hz.Color(0.65, 0.45, 1.00); // slight purple when stretched
  private colNearGround = new hz.Color(0.85, 0.95, 1.00); // bright foam near ground

  private colorStretchAmt = 0.35; // how much stretch influences tint
  private colorGroundAmt = 0.25; // how much near-ground influences tint
  private colorImpactAmt = 1.00; // full flash weighting (scaled by impactT/splashTime)

  start() {
    this.wrapper = new OWrapper(this);
    this.wrapper.onUpdate((dt) => this.update(dt));
    this.random = new ORandom('Oisif');
    for (let i = 0; i < this.maxCount; i++) {
      const oEntity = OisifManager.I.manager.create();
      this.dropList.push(oEntity);
      this.state.set(oEntity, { falling: false, impactT: 0 });
    }
  }

  private update(dt: number) {
    this.timer += dt;
    if (this.timer > this.interval) {
      this.timer = 0;
      this.index = this.index + 1 >= this.maxCount ? 0 : this.index + 1;
      const drop = this.dropList[this.index];
      if (drop.makeDynamic()) {
        drop.makePhysic();
      }
      const randomSize = 20;
      const position = this.entity.position.get();
      const randomPosition = new hz.Vec3(this.random.next() * randomSize - randomSize * 0.5, 0, this.random.next() * randomSize - randomSize * 0.5)
      drop.position = position.add(randomPosition);
      drop.rotation = this.entity.rotation.get();
      // drop.scale = hz.Vec3.one.mul(this.baseScale);
      drop.color = hz.Color.blue;
      this.state.set(drop, { falling: false, impactT: 0 });
    }

    for (const drop of this.dropList) {
      const physics = drop.entity?.as(hz.PhysicalEntity);
      if (!physics) continue;

      const v = physics.velocity.get();
      const speedY = Math.abs(v.y) * 0.5;
      const st = this.state.get(drop)!;

      const isFalling = v.y < -this.eps;
      const impacted = st.falling && v.y >= -this.eps;

      if (isFalling || st.impactT > 0) {
        drop.rotation = hz.Quaternion.slerp(
          drop.rotation,
          this.alignZupToYup,
          Math.min(1, this.orientSpeed * dt)
        );
      }

      if (impacted) {
        st.impactT = this.splashTime;
      }

      if (st.impactT > 0) {
        st.impactT = Math.max(0, st.impactT - dt);

        const targetXY = this.baseScale * this.splashXY;
        const targetZ = Math.max(this.splashZMin, (this.baseScale * this.baseScale * this.baseScale) / (targetXY * targetXY));

        drop.scale = new hz.Vec3(
          drop.scale.x * 0.9 + targetXY * 0.1,
          drop.scale.y * 0.9 + targetXY * 0.1,
          drop.scale.z * 0.7 + targetZ * 0.3
        );

      } else {
        const t = Math.min(1, speedY / this.maxVertSpeed);
        const targetXY = this.baseScale * (1 - t * (1 - this.fallMinXY));
        const targetZ = this.baseScale * (1 + t * (this.fallMaxZ - 1));

        drop.scale = new hz.Vec3(
          drop.scale.x * 0.98 + targetXY * 0.02,
          drop.scale.y * 0.98 + targetXY * 0.02,
          drop.scale.z * 0.98 + targetZ * 0.02
        );
      }

      st.falling = isFalling;

      const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
      const tSpeed = clamp01(Math.abs(v.y) / this.maxVertSpeed);
      const xyMean = (drop.scale.x + drop.scale.y) * 0.5;
      const stretch = clamp01((drop.scale.z / Math.max(1e-6, xyMean) - 1) / (this.fallMaxZ - 1));
      const posY = drop.entity!.position.get().y;
      const d = Math.max(0, posY - 0);
      const lateral = Math.hypot(v.x, v.z);
      const slide = clamp01(lateral / 4);
      let c = hz.Color.lerp(this.colRest, this.colFast, tSpeed);
      if (stretch > 0) c = hz.Color.lerp(c, this.colStretch, stretch * this.colorStretchAmt);
      if (st.impactT > 0 && this.splashTime > 0) {
        const pulse = clamp01(st.impactT / this.splashTime);
        c = hz.Color.lerp(c, this.colImpact, pulse * this.colorImpactAmt);
      }
      if (slide > 0) c = hz.Color.lerp(c, new hz.Color(0.65, 1.0, 0.75), 0.15 * slide);

      drop.color = c;
    }
  }
}
hz.Component.register(_OFluid);
