import * as hz from "horizon/core";
import "./_OMath";
import { OWrapper } from "_OWrapper";
import { Ease, OEntity } from "_OEntity";
import { OEntityManager } from "_OEntityManager";
import { ORandom } from "_ORandom";
import { OColor } from "_OColor";

/**
 * Procedural boat builder using ONLY the project's base 8-sided cylinder.
 * This version adds extensive logs to help find where it breaks.
 */

export type BoatParams = {
  seed?: number;
  lengthSegments?: number;   // number of longitudinal steps (ribs). 10–24 is typical
  beam?: number;             // max width
  hullHeight?: number;       // waterline -> gunwale
  keelDepth?: number;        // below waterline
  bowSharpness?: number;     // 0=round bow, 1=sharp
  rocker?: number;           // keel curve (0–0.5)
  flare?: number;            // side tilt (0–0.6)
  deckPlanks?: number;       // deck plank count
  addMast?: boolean;
  mastHeight?: number;
  boomLength?: number;
  hullColor?: hz.Color;
  deckColor?: hz.Color;
  trimColor?: hz.Color;
  tag?: string;

  /** Turn on very verbose logs (per-rib/spawn). Default false. */
  debug?: boolean;
};

const DEFAULTS: Required<Pick<BoatParams,
  | "lengthSegments" | "beam" | "hullHeight" | "keelDepth"
  | "bowSharpness" | "rocker" | "flare" | "deckPlanks"
  | "addMast" | "mastHeight" | "boomLength"
>> = {
  lengthSegments: 16,
  beam: 2.0,
  hullHeight: 1.0,
  keelDepth: 0.45,
  bowSharpness: 0.7,
  rocker: 0.2,
  flare: 0.3,
  deckPlanks: 6,
  addMast: true,
  mastHeight: 4.0,
  boomLength: 2.2,
};

export class OBoatBuilder {
  private random!: ORandom;

  constructor(
    private wrapper: OWrapper,
    private manager: OEntityManager,
  ) {}

  public async build(
    position: hz.Vec3,
    rotation: hz.Quaternion,
    p: BoatParams = {}
  ): Promise<OBoat> {
    const params: Required<BoatParams> = {
      seed: p.seed ?? Math.floor(Math.random() * 1e9),
      lengthSegments: p.lengthSegments ?? DEFAULTS.lengthSegments,
      beam: p.beam ?? DEFAULTS.beam,
      hullHeight: p.hullHeight ?? DEFAULTS.hullHeight,
      keelDepth: p.keelDepth ?? DEFAULTS.keelDepth,
      bowSharpness: p.bowSharpness ?? DEFAULTS.bowSharpness,
      rocker: p.rocker ?? DEFAULTS.rocker,
      flare: p.flare ?? DEFAULTS.flare,
      deckPlanks: p.deckPlanks ?? DEFAULTS.deckPlanks,
      addMast: p.addMast ?? DEFAULTS.addMast,
      mastHeight: p.mastHeight ?? DEFAULTS.mastHeight,
      boomLength: p.boomLength ?? DEFAULTS.boomLength,
      hullColor: p.hullColor ?? OColor.Black,
      deckColor: p.deckColor ?? OColor.Orange,
      trimColor: p.trimColor ?? OColor.Grey,
      tag: p.tag ?? "Boat",
      debug: p.debug ?? false,
    } as Required<BoatParams>;

    console.log("[BoatBuilder] build() start", {
      position, rotation, params
    });

    this.random = new ORandom(params.seed!);

    const boat = new OBoat(this.wrapper, this.manager, position, rotation, params);

    try {
      console.log("[BoatBuilder] Keel build…");
      await this.buildKeel(boat);
      console.log("[BoatBuilder] Keel done. Parts so far:", boat.parts.length);

      console.log("[BoatBuilder] Hull ribs build…");
      await this.buildHullRibs(boat);
      console.log("[BoatBuilder] Hull ribs done. Parts so far:", boat.parts.length);

      console.log("[BoatBuilder] Deck build…");
      await this.buildDeck(boat);
      console.log("[BoatBuilder] Deck done. Parts so far:", boat.parts.length);

      if (params.addMast) {
        console.log("[BoatBuilder] Rig build…");
        await this.buildRig(boat);
        console.log("[BoatBuilder] Rig done. Parts so far:", boat.parts.length);
      } else {
        console.log("[BoatBuilder] Skipping rig (addMast=false)");
      }

      console.log("[BoatBuilder] Commit root…");
      boat.commitRoot();
      console.log("[BoatBuilder] Commit root done. Total parts:", boat.parts.length);

    } catch (err) {
      console.error("[BoatBuilder] ERROR while building boat:", err);
      throw err;
    }

    return boat;
  }

  // ——— Internal pieces ————————————————————————————————————————————————

  private async buildKeel(boat: OBoat) {
    const { params } = boat;
    const L = params.lengthSegments;

    for (let i = 0; i < L; i++) {
      try {
        const t = i / (L - 1);
        const x = this.mix(-L * 0.25, L * 0.25, t);
        const y = -params.keelDepth + this.rockerY(t, params.rocker);

        const cyl = await this.spawnCylinder(boat, `${params.tag}:Keel`);
        const scaleX = 0.10;
        const scaleY = 0.10;
        const scaleZ = 0.8;

        const sharp = Ease.cubicOut(1 - t) * params.bowSharpness;
        const tail = 0.2 * (t * t);
        const cross = (1 - sharp) * (1 + tail);

        cyl.scale    = new hz.Vec3(scaleX * cross, scaleY * cross, scaleZ);
        cyl.rotation = hz.Quaternion.fromEuler(new hz.Vec3(0, 0, 90));
        cyl.position = new hz.Vec3(x, y, 0);
        cyl.color    = params.trimColor;

        boat.attach(cyl);
        if (params.debug && (i === 0 || i === L - 1 || i % 4 === 0)) {
          console.log(`[BoatBuilder] Keel piece ${i}/${L-1}`, { x, y, scale: cyl.scale });
        }
      } catch (err) {
        console.error("[BoatBuilder] ERROR keel segment", i, err);
        throw err;
      }
    }
  }

  private async buildHullRibs(boat: OBoat) {
    const { params } = boat;
    const L = params.lengthSegments;

    for (let i = 0; i < L; i++) {
      const t = i / (L - 1);
      const x = this.mix(-L * 0.25, L * 0.25, t);
      const yBase = this.rockerY(t, params.rocker);

      const beamFactor = this.beamProfile(t, params.bowSharpness);
      const halfBeam = 0.5 * params.beam * beamFactor;
      const height = params.hullHeight * this.heightProfile(t);
      const sideRibs = Math.max(4, Math.floor(6 * beamFactor));

      if (params.debug) {
        console.log(`[BoatBuilder] Ribs station ${i}/${L-1}`, {
          t, x, yBase, beamFactor, halfBeam, height, sideRibs
        });
      }

      for (let r = 0; r < sideRibs; r++) {
        try {
          const vr = r / (sideRibs - 1);
          const radius = this.mix(0.1, 0.3, 1 - Math.pow(1 - vr, 1.6));
          const zOffset = halfBeam * Math.pow(vr, 0.85);
          const flareOut = params.flare * vr;
          const y = yBase + this.mix(-params.keelDepth * 0.6, height, vr);

          for (const side of [-1, +1] as const) {
            const cyl = await this.spawnCylinder(boat, `${params.tag}:Hull`);
            cyl.scale = new hz.Vec3(radius, radius, 0.8);
            const yaw = 90 * side;
            const roll = Math.atan2(zOffset, 0.8).toDegrees() * side;
            const tilt = flareOut * 25 * side;
            cyl.rotation = hz.Quaternion.fromEuler(new hz.Vec3(0, yaw + tilt, roll));
            cyl.position = new hz.Vec3(x, y, side * (zOffset + 0.02));
            cyl.color = params.hullColor;
            boat.attach(cyl);
          }

          if (params.debug && (r === 0 || r === sideRibs - 1)) {
            console.log(`[BoatBuilder]   Rib ${r}/${sideRibs-1} at station ${i}`, {
              y, zOffset, radius, flareOut
            });
          }
        } catch (err) {
          console.error("[BoatBuilder] ERROR rib", { i, r }, err);
          throw err;
        }
      }
    }
  }

  private async buildDeck(boat: OBoat) {
    const { params } = boat;
    const L = params.lengthSegments;
    const planks = Math.max(1, params.deckPlanks | 0);

    if (params.debug) {
      console.log("[BoatBuilder] Deck params", { L, planks, beam: params.beam });
    }

    for (let p = 0; p < planks; p++) {
      const z = this.mix(-params.beam * 0.45, params.beam * 0.45, p / Math.max(1, (planks - 1)));
      for (let i = 0; i < L; i++) {
        try {
          const t = i / (L - 1);
          const x = this.mix(-L * 0.25, L * 0.25, t);
          const camber = this.deckCamber(z, params.beam);
          const y = this.rockerY(t, params.rocker) + params.hullHeight * 0.9 + camber;

          const plank = await this.spawnCylinder(boat, `${params.tag}:Deck`);
          plank.scale = new hz.Vec3(0.12, 0.12, 0.9);
          plank.rotation = hz.Quaternion.fromEuler(new hz.Vec3(90, 0, 0)); // horizontal
          plank.position = new hz.Vec3(x, y, z);
          plank.color = params.deckColor;
          boat.attach(plank);

          if (params.debug && (i === 0 || i === L - 1)) {
            console.log(`[BoatBuilder]   Deck plank row ${p}/${planks-1} seg ${i}/${L-1}`, {
              z, x, y, camber
            });
          }
        } catch (err) {
          console.error("[BoatBuilder] ERROR deck", { p, i }, err);
          throw err;
        }
      }
    }
  }

  private async buildRig(boat: OBoat) {
    const { params } = boat;
    const mastX = 0;
    const mastY = params.hullHeight * 0.9 + 0.2;
    const mastZ = 0;

    try {
      const mast = await this.spawnCylinder(boat, `${params.tag}:Mast`);
      mast.scale = new hz.Vec3(0.12, 0.12, params.mastHeight);
      mast.rotation = hz.Quaternion.fromEuler(new hz.Vec3(90, 0, 0)); // make Z vertical
      mast.position = new hz.Vec3(mastX, mastY, mastZ);
      mast.color = params.trimColor;
      boat.attach(mast);
      if (params.debug) console.log("[BoatBuilder] Mast placed", { mastX, mastY, mastZ });

      const boom = await this.spawnCylinder(boat, `${params.tag}:Boom`);
      boom.scale = new hz.Vec3(0.08, 0.08, params.boomLength);
      boom.rotation = hz.Quaternion.fromEuler(new hz.Vec3(0, 90, 0));
      boom.position = new hz.Vec3(mastX + 0.1, mastY + params.mastHeight * 0.25, mastZ);
      boom.color = params.trimColor;
      boat.attach(boom);
      if (params.debug) console.log("[BoatBuilder] Boom placed", {
        x: mastX + 0.1, y: mastY + params.mastHeight * 0.25, z: mastZ
      });

    } catch (err) {
      console.error("[BoatBuilder] ERROR rig", err);
      throw err;
    }
  }

  // ——— Helpers ————————————————————————————————————————————————

  private beamProfile(t: number, bowSharpness: number): number {
    const bow = Math.pow(1 - t, 2);
    const mid = Math.sin(Math.PI * t);
    const stern = Ease.cubicOut(t);
    const shape = (0.5 * mid + 0.35 * (1 - bow) + 0.15 * (1 - stern));
    return (shape * (0.75 + 0.25 * (1 - bowSharpness))).clamp(0.2, 1);
  }

  private heightProfile(t: number): number {
    return 0.65 + 0.35 * Math.sin(Math.PI * t);
  }

  private rockerY(t: number, rocker: number): number {
    const k = Math.cos(Math.PI * t) * 0.5 + 0.5; // 1 at bow/stern, 0 midship
    return rocker * (k * k - 0.5) * 0.8;
  }

  private deckCamber(z: number, beam: number): number {
    const n = (z / (beam * 0.5));
    return (1 - n * n) * 0.08 * beam;
  }

  private mix(a: number, b: number, t: number) { return a + (b - a) * t; }

  private async spawnCylinder(_boat: OBoat, tag: string): Promise<OEntity> {
    // This is the most likely failure point if nothing renders.
    // We try several strategies and log what succeeds/fails.
    let e: OEntity | undefined;

    const oEntity = this.manager.create();
    if (oEntity.makeDynamic()) {
        return oEntity;
    } else {
        return await this.spawnCylinder(_boat, tag);
    }
  }
}

// ————————————————————————————————————————————————————————————————
// Boat instance: holds all parts and lets you move/cleanup as a single unit.
// ————————————————————————————————————————————————————————————————

export class OBoat {
  public readonly parts: OEntity[] = [];
  private root!: OEntity; // handle entity

  constructor(
    private wrapper: OWrapper,
    private manager: OEntityManager,
    public position: hz.Vec3,
    public rotation: hz.Quaternion,
    public readonly params: Required<BoatParams>,
  ) {}

  public attach(e: OEntity) {
    this.parts.push(e);
    if (this.params.debug && this.parts.length % 25 === 0) {
      console.log("[Boat] attach count", this.parts.length);
    }
  }

  /**
   * Finalize: bake local part transforms into world using boat position/rotation
   * and create a root handle at that world transform.
   */
  public commitRoot() {
    try {
      for (const p of this.parts) {
        p.position = this.rotation.rotateVec3(p.position).add(this.position);
        p.rotation = this.rotation.mul(p.rotation);
      }
      this.root = this.manager.create();
      this.root.setTags([`${this.params.tag}:Root`]);
      this.root.position = this.position;
      this.root.rotation = this.rotation;
      if (this.params.debug) {
        console.log("[Boat] commitRoot OK", {
          parts: this.parts.length,
          rootPos: this.root.position,
          rootRot: this.root.rotation
        });
      }
    } catch (err) {
      console.error("[Boat] commitRoot ERROR", err);
      throw err;
    }
  }

  /** Move/rotate the entire assembled boat by delta. */
  public setTransform(pos: hz.Vec3, rot: hz.Quaternion) {
    try {
      const dp = pos.sub(this.position);
      const dq = rot.mul(this.rotation.inverse());

      this.position = pos;
      this.rotation = rot;

      for (const p of this.parts) {
        const rel = p.position.sub(this.root.position);
        const rotated = dq.rotateVec3(rel);
        p.position = pos.add(rotated);
        p.rotation = dq.mul(p.rotation);
      }

      if (this.root) {
        this.root.position = pos;
        this.root.rotation = rot;
      }
      if (this.params.debug) {
        console.log("[Boat] setTransform OK", { pos, rot });
      }
    } catch (err) {
      console.error("[Boat] setTransform ERROR", err);
      throw err;
    }
  }

  public dispose() {
    let errors = 0;
    for (const p of this.parts) {
      try { (p as any).despawn?.(); } catch (e) { errors++; }
    }
    this.parts.length = 0;
    try { (this.root as any)?.despawn?.(); } catch (e) { errors++; }
    if (this.params.debug) {
      console.log("[Boat] dispose done", { errors });
    }
  }
}
