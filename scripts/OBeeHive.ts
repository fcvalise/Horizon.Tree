// OBeeHive.ts — pure TS builder (no Component)
// Usage:
//   const hive = new OBeeHive(wrapper, { levels: 6 });
//   hive.setRoot(myAnchorEntity);
//   await hive.rebuild();
//   // later: hive.set({ seed: 42 }); await hive.rebuild();
//   // cleanup: hive.destroy();

import * as hz from "horizon/core";
import "./_OMath";
import { OWrapper } from "_OWrapper";
import { ORandom } from "_ORandom";
import { Ease, OEntity } from "_OEntity";
import { OEntityManager } from "_OEntityManager";
import { OColor } from "_OColor";
import { OUtils } from "_OUtils";

export type BeeHiveParams = {
  // Assets (BigInt ids given as strings)
  cylinderMeshId: string; // 8-sided cylinder mesh
  entranceMeshId: string;

  // Shape
  levels: number;            // stacked tiers
  baseRadius: number;        // bottom radius (m)
  topRadius: number;         // top radius (m)
  tierHeight: number;        // base height per tier (m)
  bulge: number;             // sinusoidal mid bulge
  twistPerLevelDeg: number;  // twist per tier (deg)
  verticalPadding: number;   // gap between tiers (m)

  // Entrance (short cylinder pushed into hive)
  entranceEnabled: boolean;
  entranceRadius: number;
  entranceDepth: number;
  entranceHeightL: number;   // tier index (0 = bottom)
  entranceYawDeg: number;    // around hive (deg)

  // Randomness (tiny wobble to avoid “too perfect”)
  seed: number;
  jitterPos: number;         // meters (small)
  jitterRotDeg: number;      // degrees (small)
  jitterScale: number;       // scalar (small)
};

const DEFAULTS: BeeHiveParams = {
  cylinderMeshId: "2044830499680411",
  entranceMeshId: "756320273787757",

  levels: 5,
  baseRadius: 1.6,
  topRadius: 0.9,
  tierHeight: 0.6,
  bulge: 0.7,
  twistPerLevelDeg: 5,
  verticalPadding: 0.1,

  entranceEnabled: true,
  entranceRadius: 0.7,
  entranceDepth: 0.3,
  entranceHeightL: 1,
  entranceYawDeg: 0,

  seed: 1337,
  jitterPos: 0.1,
  jitterRotDeg: 5,
  jitterScale: 0.1,
};

export class OBeeHive {
  public params: BeeHiveParams;
  private random!: ORandom;

  private tiers: OEntity[] = [];
  private entrance?: OEntity;
  private parts: OEntity[] = [];

  constructor(
    private wrapper: OWrapper,
    private position: hz.Vec3,
    private manager: OEntityManager,
    params?: Partial<BeeHiveParams>
) {
    this.params = { ...DEFAULTS, ...(params ?? {}) };
    this.random = new ORandom(position.toString());
  }

  public set(p: Partial<BeeHiveParams>): this {
    this.params = { ...this.params, ...p };
    return this;
  }

  public getEntrance(): OEntity | undefined {
    return this.entrance;
  }

  public getTop(): OEntity | undefined {
    if (this.tiers.length == 0) return undefined;
    return this.tiers[this.tiers.length - 1]
  }

  public async destroy(): Promise<void> {
    for (const part of this.parts) {
      if (part.makeDynamic()) {
        await part.tweenTo({
            duration: this.random.range(0.4, 0.6),
            scale: hz.Vec3.zero,
            makeStatic: false,
            ease: Ease.easeOutBounce
          });
        part.makeInvisible();
      }
    }

    const w = this.wrapper.world;
    for (const oe of this.parts) this.manager.delete(oe);
    this.parts.length = 0;
    this.entrance = undefined;
    this.tiers = [];
  }

  public async rebuild() {
    await this.destroy();
    
    const clampedLevels = Math.max(1, Math.floor(this.params.levels));
    let y = 0;

    for (let i = 0; i < clampedLevels; i++) {
      const t = clampedLevels <= 1 ? 0 : i / (clampedLevels - 1);
      const position = new hz.Vec3(
        this.jitter(this.position.x, this.params.jitterPos),
        this.position.y + y,
        this.jitter(this.position.z, this.params.jitterPos)
      );

      const yawDeg = this.params.twistPerLevelDeg * i + this.jitter(0, this.params.jitterRotDeg);
      const euler = new hz.Vec3(
        this.jitter(270, this.params.jitterRotDeg),
        this.jitter(0, this.params.jitterRotDeg),
        this.jitter(yawDeg, this.params.jitterRotDeg)
      );
      const rotation = hz.Quaternion.fromEuler(euler);
      const mid = Math.sin(t * Math.PI);
      const radius = Number.lerp(this.params.baseRadius, this.params.topRadius, t) + this.params.bulge * mid;
      const denom = Math.max(1e-6, Math.abs(this.params.baseRadius - this.params.topRadius));
      const heightCoef = Math.max(0.4, Math.abs(radius - this.params.topRadius) / denom);
      const height = this.params.tierHeight * heightCoef;
      const scale = new hz.Vec3(
        this.jitter(radius * 2, this.params.jitterScale),
        this.jitter(radius * 2, this.params.jitterScale),
        this.jitter(height, this.params.jitterScale)
      );

      const oEntity = this.manager.create();
      oEntity.position = position;
      oEntity.rotation = rotation;
      oEntity.scale = scale;
      oEntity.color = OColor.Orange;
      oEntity.setTags(['Walkable', 'Hive']);
      this.tiers.push(oEntity);
      this.parts.push(oEntity);

      y += height + this.params.verticalPadding;
    }
    
    if (this.params.entranceEnabled && this.tiers.length > 2) {
      this.entrance = await this.spawnEntrance();
      this.parts.push(this.entrance); // just for being part of reaveal animation
    }

    await this.animate();
  }

  private async animate() {
    let index = 0;
    let readyIndex = 0;
    this.wrapper.onUpdateUntil(() => {
      const part = this.parts[index];
      if (!part.isTweening()) {
        if (part.makeDynamic()) {
          const scale = part.scale;
          part.scale = hz.Vec3.zero;
          part.tweenTo({
            duration: this.random.range(0.8 + (index * 0.2), 1.2 + (index * 0.2)),
            scale: scale,
            makeStatic: true,
            ease: Ease.easeOutBounce
          }).then(() => {
            readyIndex++;
          })
          index++;
        }
      }
    }, () => index >= this.parts.length)
    
    await OUtils.waitFor(this.wrapper, () => readyIndex >= this.parts.length, 50);
  }

  private jitter(val: number, amt: number): number {
    if (amt <= 0) return val;
    return val + this.random.range(-amt, amt);
  }

  private async spawnEntrance(): Promise<OEntity> {
    const idx = this.params.entranceHeightL.clamp(0, Math.max(0, this.tiers.length - 1));
    const tier = this.tiers[idx] ?? this.tiers[0];
    const tierScale = tier.scale; // X=diameter
    const tierRadius = tierScale.x * 0.5;
    const tierRight = tier.rotation.getRight();
    const yawRad = (this.params.entranceYawDeg * Math.PI) / 180;
    const yawQ = hz.Quaternion.fromAxisAngle(hz.Vec3.up, yawRad);
    const dir = hz.Quaternion.mulVec3(yawQ, tierRight).normalize();
    const tierPos = tier.position;
    const position = tierPos.add(dir.mul(tierRadius));

    const scale = new hz.Vec3(
      this.params.entranceRadius * 2,
      this.params.entranceRadius * 2,
      this.params.entranceDepth
    );

    const rotation = hz.Quaternion.lookRotation(dir);

    const oEntity = this.manager.create();
    oEntity.position = position;
    oEntity.rotation = rotation;
    oEntity.scale = scale;
    oEntity.color = OColor.Black;
    oEntity.setTags(['Entrance', 'Hive']);
    return oEntity;
  }
}
