// // SimpleTreeHZ.ts
// import * as hz from "horizon/core";

// /** Raycast API (ray-only) */
// type HitResult = {
//   hit: boolean;
//   point?: hz.Vec3;
//   normal?: hz.Vec3;
//   distance?: number;
//   entity?: hz.Entity;
// };
// export interface RaycastAPI {
//   raycastNonSelf(origin: hz.Vec3, dir: hz.Vec3, maxDist: number, selfRoot: hz.Entity): HitResult;
// }
// const NullRaycastAPI: RaycastAPI = { raycastNonSelf: () => ({ hit: false }) };

// /** Settings (colonization removed) */
// type GrowthSettings = {
//   maxDepth: number; segmentLength: number; initialBudCount: number; branchChance: number; branchAngle: number;
// };
// type TropismSettings = {
//   raysPerBud: number; avoidanceDistance: number; avoidanceWeight: number;
//   phototropismWeight: number; gravitropismWeight: number; apicalWeight: number; jitterStrength: number;
// };
// type RenderSettings = { segmentAssetId: number; leafAssetId?: number; bottomWidth: number; topWidth: number; leafScale: number; };
// type LeafSettings = {
//   placeLeavesPerNode: boolean; virtualNodesPerSegment: number; petioleLength: number; axialJitter: number;
//   spiralDivergence: number; whorlCount: number;
//   branchPhyllotaxy: "Spiral" | "Distichous" | "OppositeDecussate" | "Whorled";
//   trunkPhyllotaxy: "Spiral" | "Distichous" | "OppositeDecussate" | "Whorled";
// };
// type ArchitectureSettings = {
//   growthRhythm: "Continuous" | "Rhythmic"; tropism: "Orthotropic" | "Plagiotropic" | "None";
//   mainAxis: "Sympodial" | "Monopodial"; branchingPhase: "Sylleptic" | "Proleptic";
// };
// type TreeSettings = { growth: GrowthSettings; tropism: TropismSettings; render: RenderSettings; leaf: LeafSettings; architecture: ArchitectureSettings; };

// const DefaultSettings: TreeSettings = {
//   growth: { maxDepth: 18, segmentLength: 0.6, initialBudCount: 1, branchChance: 0.18, branchAngle: 35 },
//   tropism: {
//     raysPerBud: 8, avoidanceDistance: 1, avoidanceWeight: 20,
//     phototropismWeight: 0.9, gravitropismWeight: 0.6, apicalWeight: 0.7, jitterStrength: 0.05
//   },
//   render: { segmentAssetId: 123, leafAssetId: 456, bottomWidth: 0.22, topWidth: 0.06, leafScale: 0.22 },
//   leaf: {
//     placeLeavesPerNode: true, virtualNodesPerSegment: 2, petioleLength: 0.05, axialJitter: 0.08,
//     spiralDivergence: 137.5, whorlCount: 3, branchPhyllotaxy: "Spiral", trunkPhyllotaxy: "Spiral"
//   },
//   architecture: { growthRhythm: "Rhythmic", tropism: "Orthotropic", mainAxis: "Monopodial", branchingPhase: "Sylleptic" },
// };

// // --------- Types ---------
// type Bud = {
//   pos: hz.Vec3; dir: hz.Vec3; depth: number; isBranchStart: boolean; axisId: number; nodeIndex: number; isBranchAxis: boolean; axisOrder: number;
// };

// export class SimpleTreeHZ {
//   public autoRegenerate = false;
//   public flushPeriodFrames = 12;
//   public flushBurstFrames = 4;

//   public occlusionSkin = 0.1;
//   public ignoreGroundLikeHits = true;
//   public groundNormalDot = 0.85;

//   public minSelfSpacing = 1.0;
//   public selfSeparationWeight = 2.0;

//   public neighborSpacing = 0.3;
//   public neighborSeparationWeight = 1.5;

//   public branchRollRandomness = 15;

//   private world!: hz.World;
//   private component!: hz.Component;
//   private settings: TreeSettings = DefaultSettings;

//   private growthQueue: Bud[] = [];
//   private nextAxisId = 1;
//   private frameCount = 0;

//   private rc: RaycastAPI = NullRaycastAPI;

//   /** Unique tag to identify THIS tree's parts (since we cannot parent). */
//   private selfTag = `TreeSelf_${Math.floor(Math.random() * 1e9)}`;

//   /** Let the wrapper pass in a specific selfTag so it can configure the raycaster to ignore self. */
//   public setSelfTag(tag: string) { this.selfTag = tag; }
//   public getSelfTag(): string { return this.selfTag; }

//   public initialize(component: hz.Component, overrides?: Partial<TreeSettings>, rcImpl?: RaycastAPI) {
//     this.component = component;
//     this.world = component.world;
//     if (overrides) this.settings = this.mergeSettings(DefaultSettings, overrides);
//     if (rcImpl) this.rc = rcImpl;

//     this.prepAndStart();

//     this.component.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
//       this.frameCount++;
//       if (this.autoRegenerate) {
//         this.prepAndStart();
//         this.autoRegenerate = false;
//       }
//       this.stepGrow();
//     });
//   }

//   private mergeSettings(base: TreeSettings, patch: Partial<TreeSettings>): TreeSettings {
//     const clone: any = JSON.parse(JSON.stringify(base));
//     const merge = (a: any, b: any) => {
//       Object.keys(b || {}).forEach((k) => {
//         if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { a[k] = a[k] || {}; merge(a[k], b[k]); }
//         else { a[k] = b[k]; }
//       });
//     };
//     merge(clone, patch);
//     return clone as TreeSettings;
//   }

//   private prepAndStart() {
//     this.growthQueue = [];
//     for (let i = 0; i < this.settings.growth.initialBudCount; i++) {
//       const yaw = this.randRange(-30, 30);
//       const pitch = this.randRange(-5, 5);
//       const baseUp = this.rotateVec(new hz.Vec3(0, 1, 0), yaw, pitch);
//       this.growthQueue.push({
//         pos: this.component.entity.position.get(),
//         dir: hz.Vec3.normalize(baseUp),
//         depth: 0,
//         isBranchStart: false,
//         axisId: this.nextAxisId++,
//         nodeIndex: 0,
//         isBranchAxis: false,
//         axisOrder: 0,
//       });
//     }
//   }

//   private stepGrow() {
//     if (this.growthQueue.length === 0) return;
//     if (this.settings.architecture.growthRhythm === "Rhythmic" && !this.inFlushWindow()) return;

//     const bud = this.growthQueue.shift()!;
//     if (bud.depth >= this.settings.growth.maxDepth) return;

//     const photoVec = this.computeLightDirectionFor(bud);
//     let combined = this.combineTropisms(bud, photoVec, this.vZero()); // colonization removed

//     const segLen = this.settings.growth.segmentLength;
//     let candidatePos = this.vAdd(bud.pos, this.vScale(combined, segLen));
//     let midPos = this.vAdd(bud.pos, this.vScale(combined, segLen * 0.5));

//     // Ray-only separation (ring)
//     const sepSelf = this.vAdd(
//       this.rayOnlySeparation(bud.pos, candidatePos, this.minSelfSpacing, /*selfOnly*/ true),
//       this.vScale(this.rayOnlySeparation(bud.pos, midPos, this.minSelfSpacing, true), 0.5)
//     );
//     const sepNei = this.vAdd(
//       this.rayOnlySeparation(bud.pos, candidatePos, this.neighborSpacing, /*selfOnly*/ false),
//       this.vScale(this.rayOnlySeparation(bud.pos, midPos, this.neighborSpacing, false), 0.5)
//     );

//     if (this.vLen2(sepSelf) > 1e-6 || this.vLen2(sepNei) > 1e-6) {
//       combined = hz.Vec3.normalize(
//         this.vAdd(combined,
//           this.vAdd(this.vScale(sepSelf, this.selfSeparationWeight), this.vScale(sepNei, this.neighborSeparationWeight))
//         )
//       );
//       candidatePos = this.vAdd(bud.pos, this.vScale(combined, segLen));
//       midPos = this.vAdd(bud.pos, this.vScale(combined, segLen * 0.5));
//     }

//     // Ray-only occlusion & slide
//     if (this.tryOcclusionRayOnly(bud, combined)) {
//       const ok = this.trySlideAroundRayOnly(bud, combined, (slide) => (combined = slide));
//       if (!ok) return;
//     }

//     if (bud.isBranchAxis || bud.axisOrder > 0) {
//       const branchAxisMinUpDot = 0.1;
//       const up = new hz.Vec3(0, 1, 0);
//       if (this.vDot(combined, up) < branchAxisMinUpDot) {
//         combined = this.ensureUpwardish(combined, branchAxisMinUpDot);
//       }
//     }

//     this.createSegment(bud, combined);
//   }

//   private ensureUpwardish(v: hz.Vec3, minUpDot: number): hz.Vec3 {
//     const up = new hz.Vec3(0, 1, 0);
//     const dot = this.vDot(v, up);                 // how much 'up' is in v
//     if (dot >= minUpDot) return v;                     // already upward enough
//     const boosted = this.vAdd(                        // nudge toward UP just enough
//       v,
//       this.vScale(up, (minUpDot - dot) + 1e-3)   // tiny epsilon to avoid zero-length
//     );
//     return hz.Vec3.normalize(boosted);
//   }

//   private inFlushWindow(): boolean {
//     const period = Math.max(1, this.flushPeriodFrames);
//     const burst = Math.max(1, Math.min(this.flushBurstFrames, period));
//     return (this.frameCount % period) < burst;
//   }

//   // ---------- Tropisms ----------
//   private sunDir(): hz.Vec3 { return new hz.Vec3(0, 1, 0); }

//   private computePhototropismVector(bud: Bud): hz.Vec3 {
//     const rays = Math.max(1, this.settings.tropism.raysPerBud);
//     let bestDir = hz.Vec3.normalize(this.sunDir());
//     let bestClear = 0;
//     const maxRange = 50;

//     for (let i = 0; i < rays; i++) {
//       const sampleDir = hz.Vec3.normalize(this.vAdd(bestDir, this.randomUnitVector()));
//       const hit = this.rc.raycastNonSelf(bud.pos, sampleDir, maxRange, this.component.entity);
//       // Ignore self via tag check:
//       const clearDist = (hit.hit && hit.entity && this.entityHasSelfTag(hit.entity)) ? 0 : (hit.hit ? (hit.distance ?? 0) : maxRange);
//       if (clearDist > bestClear) {
//         bestClear = clearDist;
//         bestDir = sampleDir;
//         if (bestClear >= maxRange) break;
//       }
//     }
//     return bestDir;
//   }

//   private computeLightDirectionFor(bud: Bud): hz.Vec3 {
//     let v = this.computePhototropismVector(bud);
//     v = this.applyArchitectureOrientation(v);
//     return v;
//   }

//   private combineTropisms(bud: Bud, photo: hz.Vec3, colon: hz.Vec3): hz.Vec3 {
//     const t = this.settings.tropism;
//     const grav = new hz.Vec3(0, 1, 0);
//     const jitter = this.vScale(this.randomUnitVector(), t.jitterStrength);

//     const pre = this.vAdd(
//       this.vAdd(
//         this.vAdd(this.vScale(grav, t.gravitropismWeight), this.vScale(photo, t.phototropismWeight)),
//         this.vAdd(this.vScale(bud.dir, t.apicalWeight), this.vScale(colon, 0))
//       ),
//       jitter
//     );

//     const avoid = this.vScale(this.computeAvoidanceVector(bud, hz.Vec3.normalize(pre)), t.avoidanceWeight);
//     return hz.Vec3.normalize(this.vAdd(pre, avoid));
//   }

//   private computeAvoidanceVector(bud: Bud, baseDir: hz.Vec3): hz.Vec3 {
//     const maxD = Math.max(0.05, this.settings.tropism.avoidanceDistance);
//     const fwd = hz.Vec3.normalize(baseDir);

//     // Build basis ⟂ fwd
//     let u = hz.Vec3.normalize(new hz.Vec3(-fwd.z, 0, fwd.x));
//     if (this.vLen2(u) < 1e-8) u = hz.Vec3.normalize(new hz.Vec3(0, -fwd.z, fwd.y));
//     const v = hz.Vec3.normalize(this.vCross(fwd, u));

//     // Probe a small cone ahead to sense blockers; push away from the nearest
//     const RING = 6;
//     let bestVec: hz.Vec3 | null = null;
//     let bestScore = -Infinity;

//     const tryRay = (d: hz.Vec3, w: number) => {
//       const h = this.rc.raycastNonSelf(bud.pos, d, maxD, this.component.entity);
//       if (!h.hit || !h.entity || this.entityHasSelfTag(h.entity)) return;

//       const hp = h.point ?? this.vAdd(bud.pos, this.vScale(d, maxD));
//       const away = this.vSub(bud.pos, hp);                              // push-away vector
//       const dist = Math.max(1e-3, this.vLen(away));
//       const vec = this.vScale(this.vNorm(away), 1.0 / (dist * dist));   // inverse-square
//       const score = w * (1.0 / dist);

//       if (score > bestScore) { bestScore = score; bestVec = vec; }
//     };

//     // center
//     tryRay(fwd, 1.0);

//     // ring (±~12° cone)
//     const ang = 12 * Math.PI / 180;
//     for (let i = 0; i < RING; i++) {
//       const a = (i / RING) * Math.PI * 2;
//       const dir = hz.Vec3.normalize(
//         this.vAdd(
//           this.vAdd(this.vScale(fwd, Math.cos(ang)), this.vScale(u, Math.cos(a) * Math.sin(ang))),
//           this.vScale(v, Math.sin(a) * Math.sin(ang))
//         )
//       );
//       tryRay(dir, 0.7);
//     }

//     return bestVec ?? this.vZero();
//   }

//   private applyArchitectureOrientation(v: hz.Vec3): hz.Vec3 {
//     switch (this.settings.architecture.tropism) {
//       case "Orthotropic": return hz.Vec3.normalize(this.vAdd(this.vScale(v, 0.4), new hz.Vec3(0, 1, 0)));
//       case "Plagiotropic": {
//         const planar = this.projectOnPlane(v, new hz.Vec3(0, 1, 0));
//         return this.vLen2(planar) > 1e-6 ? hz.Vec3.normalize(planar) : new hz.Vec3(1, 0, 0);
//       }
//       default: return v;
//     }
//   }

//   private rayOnlySeparation(fromPos: hz.Vec3, candidatePos: hz.Vec3, radius: number, selfOnly: boolean): hz.Vec3 {
//     if (radius <= 0) return this.vZero();

//     // Cast slightly *before* and *after* the candidate (prevents starting inside colliders)
//     const dir = this.vSub(candidatePos, fromPos);
//     const dist = this.vLen(dir);
//     const fwd = dist > 1e-6 ? this.vScale(dir, 1 / dist) : new hz.Vec3(0, 1, 0);
//     const backOrigin = this.vAdd(candidatePos, this.vScale(fwd, -Math.min(0.2, radius * 0.5)));
//     const fwdOrigin  = this.vAdd(candidatePos, this.vScale(fwd,  Math.min(0.2, radius * 0.5)));

//     // Basis ⟂ fwd
//     let u = hz.Vec3.normalize(new hz.Vec3(-fwd.z, 0, fwd.x));
//     if (this.vLen2(u) < 1e-8) u = hz.Vec3.normalize(new hz.Vec3(0, -fwd.z, fwd.y));
//     const v = hz.Vec3.normalize(this.vCross(fwd, u));

//     const RING = 8;
//     let sum = this.vZero(), count = 0;

//     const sample = (origin: hz.Vec3, d: hz.Vec3) => {
//       const h = this.rc.raycastNonSelf(origin, d, radius, this.component.entity);
//       if (!h.hit || !h.entity) return;

//       const isSelf = this.entityHasSelfTag(h.entity);
//       // If selfOnly=true we only repel from self; otherwise only from non-self
//       if (selfOnly ? !isSelf : isSelf) return;

//       // Repel from *any* geometry (we no longer filter to "Tree")
//       const hp = h.point ?? origin;
//       const away = this.vSub(origin, hp);
//       const dlen = Math.max(1e-3, this.vLen(away));
//       sum = this.vAdd(sum, this.vScale(this.vNorm(away), 1 / (dlen * dlen)));
//       count++;
//     };

//     // center and opposite
//     sample(fwdOrigin, fwd);
//     sample(backOrigin, this.vScale(fwd, -1));

//     // ring
//     for (let i = 0; i < RING; i++) {
//       const a = (i / RING) * Math.PI * 2;
//       const off = new hz.Vec3(
//         u.x * Math.cos(a) * radius + v.x * Math.sin(a) * radius,
//         u.y * Math.cos(a) * radius + v.y * Math.sin(a) * radius,
//         u.z * Math.cos(a) * radius + v.z * Math.sin(a) * radius
//       );
//       const o1 = this.vAdd(fwdOrigin, off);
//       const o2 = this.vAdd(backOrigin, off);
//       sample(o1, fwd);                  // forward probe
//       sample(o2, this.vScale(fwd, -1)); // backward probe
//     }

//     return count === 0 ? this.vZero() : this.vNorm(sum);
//   }

//   // Replace tryOcclusionRayOnly(...)
//   private tryOcclusionRayOnly(bud: Bud, dir: hz.Vec3): boolean {
//     const t = bud.depth / Math.max(1, this.settings.growth.maxDepth);
//     const radius = this.lerp(this.settings.render.bottomWidth, this.settings.render.topWidth, t) * 0.5;
//     const startOffset = radius + Math.max(0, this.occlusionSkin);

//     const origin = this.vAdd(bud.pos, this.vScale(dir, startOffset));
//     const fwd = hz.Vec3.normalize(dir);

//     // Basis ⟂ fwd
//     let u = hz.Vec3.normalize(new hz.Vec3(-fwd.z, 0, fwd.x));
//     if (this.vLen2(u) < 1e-8) u = hz.Vec3.normalize(new hz.Vec3(0, -fwd.z, fwd.y));
//     const v = hz.Vec3.normalize(this.vCross(fwd, u));

//     const maxDist = this.settings.growth.segmentLength;
//     const RING = 8;

//     const blocked = (o: hz.Vec3) => {
//       const h = this.rc.raycastNonSelf(o, fwd, maxDist, this.component.entity);
//       if (!h.hit || !h.entity) return false;
//       if (this.entityHasSelfTag(h.entity)) return false;                // ignore self
//       if (this.ignoreGroundLikeHits && this.isGroundLike(h, dir)) return false;
//       return true; // any other geometry blocks
//     };

//     if (blocked(origin)) return true;
//     for (let i = 0; i < RING; i++) {
//       const a = (i / RING) * Math.PI * 2;
//       const off = new hz.Vec3(
//         u.x * Math.cos(a) * radius + v.x * Math.sin(a) * radius,
//         u.y * Math.cos(a) * radius + v.y * Math.sin(a) * radius,
//         u.z * Math.cos(a) * radius + v.z * Math.sin(a) * radius
//       );
//       if (blocked(this.vAdd(origin, off))) return true;
//     }
//     return false;
//   }

//   // Replace trySlideAroundRayOnly(...)
//   private trySlideAroundRayOnly(bud: Bud, dir: hz.Vec3, apply: (slide: hz.Vec3) => void): boolean {
//     const t = bud.depth / Math.max(1, this.settings.growth.maxDepth);
//     const radius = this.lerp(this.settings.render.bottomWidth, this.settings.render.topWidth, t) * 0.5;
//     const startOffset = radius + Math.max(0, this.occlusionSkin);
//     const origin = this.vAdd(bud.pos, this.vScale(dir, startOffset));
//     const maxDist = this.settings.growth.segmentLength;

//     const fwd = hz.Vec3.normalize(dir);
//     let u = hz.Vec3.normalize(new hz.Vec3(-fwd.z, 0, fwd.x));
//     if (this.vLen2(u) < 1e-8) u = hz.Vec3.normalize(new hz.Vec3(0, -fwd.z, fwd.y));
//     const v = hz.Vec3.normalize(this.vCross(fwd, u));

//     // Gather one blocking normal (non-self)
//     const normals: hz.Vec3[] = [];
//     const sample = (o: hz.Vec3) => {
//       const h = this.rc.raycastNonSelf(o, fwd, maxDist, this.component.entity);
//       if (h.hit && h.normal && h.entity && !this.entityHasSelfTag(h.entity) && !this.isGroundLike(h, dir)) normals.push(h.normal);
//     };
//     sample(origin);
//     const RING = 8;
//     for (let i = 0; i < RING; i++) {
//       const a = (i / RING) * Math.PI * 2;
//       const off = new hz.Vec3(
//         u.x * Math.cos(a) * radius + v.x * Math.sin(a) * radius,
//         u.y * Math.cos(a) * radius + v.y * Math.sin(a) * radius,
//         u.z * Math.cos(a) * radius + v.z * Math.sin(a) * radius
//       );
//       sample(this.vAdd(origin, off));
//     }
//     if (normals.length === 0) return false;

//     // Project along surface
//     const n = normals[0];
//     let candidate = hz.Vec3.normalize(this.projectOnPlane(dir, n));
//     if (this.vLen2(candidate) <= 1e-6) {
//       const tangent = hz.Vec3.normalize(this.vCross(n, dir));
//       candidate = hz.Vec3.normalize(this.projectOnPlane(tangent, n));
//     }
//     if (this.vLen2(candidate) <= 1e-6) return false;

//     // Ensure new direction isn’t immediately blocked
//     const blocked = this.rc.raycastNonSelf(origin, candidate, maxDist, this.component.entity).hit;
//     if (blocked) return false;

//     apply(candidate);
//     return true;
//   }

//   private isGroundLike(hit: HitResult, growDir: hz.Vec3): boolean {
//     if (!hit.normal) return false;
//     const upwardish = this.vDot(hit.normal, new hz.Vec3(0, 1, 0)) > this.groundNormalDot;
//     const growingUp = this.vDot(growDir, new hz.Vec3(0, 1, 0)) > 0.1;
//     return upwardish && growingUp;
//   }

//   // ---------- Segment / Leaves ----------
//   private async createSegment(bud: Bud, dir: hz.Vec3) {
//     const segLen = this.settings.growth.segmentLength;
//     const pos = bud.pos;
//     const newPos = this.vAdd(bud.pos, this.vScale(dir, segLen));
//     const fwd = hz.Vec3.normalize(this.vSub(newPos, bud.pos));
//     const rot = this.lookRotation(fwd, new hz.Vec3(0, 1, 0));
//     const t = bud.depth / Math.max(1, this.settings.growth.maxDepth);
//     const width = this.lerp(this.settings.render.bottomWidth, this.settings.render.topWidth, t);
//     const scale = new hz.Vec3(width, width, segLen);
//     const asset = new hz.Asset(BigInt(this.settings.render.segmentAssetId));

//     const segEnts = await this.world.spawnAsset(asset, pos, rot, scale);
//     const seg = segEnts[0];
//     this.setTreeTags(seg); // "Tree" + selfTag

//     if (this.settings.leaf.placeLeavesPerNode && this.settings.render.leafAssetId) {
//       await this.placeNodeLeavesForSegment(bud, dir, segLen);
//     }
//     this.enqueueChildren(bud, dir, newPos);
//   }

//   /** FIX: ensure every spawned part has "Tree" and this instance's selfTag */
//   private setTreeTags(e: hz.Entity) {
//     if (!e.tags.contains("Tree")) e.tags.add("Tree");
//     if (!e.tags.contains(this.selfTag)) e.tags.add(this.selfTag);
//   }

//   private entityHasSelfTag(e: hz.Entity): boolean {
//     return e.tags.contains(this.selfTag);
//   }

//   private isEntityTaggedTree(e: hz.Entity): boolean {
//     return e.tags.contains("Tree");
//   }

//   private async placeNodeLeavesForSegment(bud: Bud, forward: hz.Vec3, segLen: number) {
//     if (!this.settings.render.leafAssetId) return;

//     const vcount = Math.max(1, this.settings.leaf.virtualNodesPerSegment);
//     const fwd = hz.Vec3.normalize(forward);

//     let side = this.vCross(new hz.Vec3(0, 1, 0), fwd);
//     if (this.vLen2(side) < 1e-6) side = this.vCross(new hz.Vec3(1, 0, 0), fwd);
//     side = hz.Vec3.normalize(side);
//     const up = hz.Vec3.normalize(this.vCross(fwd, side));

//     const ph = bud.isBranchAxis ? this.settings.leaf.branchPhyllotaxy : this.settings.leaf.trunkPhyllotaxy;

//     const placeAt = async (nodeOrigin: hz.Vec3, phiDeg: number) => {
//       const radial = hz.Vec3.normalize(this.rotateAroundAxis(side, fwd, phiDeg));
//       const basePos = this.vAdd(nodeOrigin, this.vScale(radial, Math.max(0, this.settings.leaf.petioleLength)));
//       const rightX = hz.Vec3.normalize(this.vCross(fwd, radial));
//       const upY = hz.Vec3.normalize(this.vCross(radial, rightX));
//       const rot = this.basisToQuat(radial, upY);
//       const scale = new hz.Vec3(this.settings.render.leafScale, this.settings.render.leafScale, this.settings.render.leafScale);
//       const asset = new hz.Asset(BigInt(this.settings.render.leafAssetId!));

//       const leafEnts = await this.world.spawnAsset(asset, basePos, rot, scale);
//       const leaf = leafEnts[0];
//       this.setTreeTags(leaf);
//     };

//     for (let v = 0; v < vcount; v++) {
//       const frac = (v + 1) / (vcount + 1);
//       const jitter = this.settings.leaf.axialJitter !== 0 ? this.randRange(-this.settings.leaf.axialJitter, this.settings.leaf.axialJitter) : 0;
//       const nodeOrigin = this.vAdd(bud.pos, this.vScale(fwd, segLen * this.clamp01(frac + jitter)));
//       const subIndex = bud.nodeIndex * vcount + v;

//       switch (ph) {
//         case "Spiral": await placeAt(nodeOrigin, subIndex * this.settings.leaf.spiralDivergence); break;
//         case "Distichous": await placeAt(nodeOrigin, (subIndex % 2 === 0) ? 0 : 180); break;
//         case "OppositeDecussate": {
//           const base = (subIndex % 2 === 0) ? 0 : 90;
//           await placeAt(nodeOrigin, base + 0); await placeAt(nodeOrigin, base + 180); break;
//         }
//         case "Whorled": {
//           const n = Math.max(2, this.settings.leaf.whorlCount);
//           const step = 360 / n;
//           for (let i = 0; i < n; i++) await placeAt(nodeOrigin, i * step);
//           break;
//         }
//       }
//     }
//   }

//   private shouldBranch(bud: Bud): boolean {
//     const phaseOK = this.settings.architecture.branchingPhase === "Sylleptic" || bud.depth > 0;
//     if (!phaseOK) return false;
//     if (bud.depth + 1 >= this.settings.growth.maxDepth) return false;
//     return Math.random() < this.settings.growth.branchChance;
//   }

//   private shouldContinue(bud: Bud, willBranch: boolean): boolean {
//     if (this.settings.architecture.mainAxis === "Sympodial" && !bud.isBranchStart && willBranch) return false;
//     return true;
//   }

//   private enqueueChildren(bud: Bud, combined: hz.Vec3, newPos: hz.Vec3) {
//     const willBranch = this.shouldBranch(bud);
//     const allowCont = this.shouldContinue(bud, willBranch);

//     if (allowCont) {
//       this.growthQueue.push({
//         pos: newPos, dir: combined, depth: bud.depth + 1, isBranchStart: false,
//         axisId: bud.axisId, nodeIndex: bud.nodeIndex + 1, isBranchAxis: bud.isBranchAxis, axisOrder: bud.axisOrder
//       });
//     }

//     if (willBranch) {
//       let axis = this.vCross(combined, new hz.Vec3(0, 1, 0));
//       if (this.vLen2(axis) < 1e-6) axis = this.vCross(combined, new hz.Vec3(1, 0, 0));
//       axis = hz.Vec3.normalize(axis);

//       let split = this.rotateAroundAxis(combined, axis, this.settings.growth.branchAngle);
//       if (this.branchRollRandomness > 0) split = this.rotateAroundAxis(split, combined, this.randRange(-this.branchRollRandomness, this.branchRollRandomness));
//       split = hz.Vec3.normalize(split);

//       const newAxisId = this.nextAxisId++;
//       this.growthQueue.push({
//         pos: newPos, dir: split, depth: bud.depth + 1, isBranchStart: true,
//         axisId: newAxisId, nodeIndex: 0, isBranchAxis: true, axisOrder: bud.axisOrder + 1
//       });
//     }
//   }

//   // ---------- Math helpers ----------
//   private vZero(): hz.Vec3 { return new hz.Vec3(0, 0, 0); }
//   private vAdd(a: hz.Vec3, b: hz.Vec3): hz.Vec3 { return new hz.Vec3(a.x + b.x, a.y + b.y, a.z + b.z); }
//   private vSub(a: hz.Vec3, b: hz.Vec3): hz.Vec3 { return new hz.Vec3(a.x - b.x, a.y - b.y, a.z - b.z); }
//   private vScale(a: hz.Vec3, s: number): hz.Vec3 { return new hz.Vec3(a.x * s, a.y * s, a.z * s); }
//   private vDot(a: hz.Vec3, b: hz.Vec3): number { return a.x * b.x + a.y * b.y + a.z * b.z; }
//   private vCross(a: hz.Vec3, b: hz.Vec3): hz.Vec3 {
//     return new hz.Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
//   }
//   private vLen2(a: hz.Vec3): number { return a.x*a.x + a.y*a.y + a.z*a.z; }
//   private vLen(a: hz.Vec3): number { return Math.sqrt(this.vLen2(a)); }
//   private vNorm(a: hz.Vec3): hz.Vec3 { const L = this.vLen(a); return L > 1e-8 ? this.vScale(a, 1/L) : this.vZero(); }

//   private projectOnPlane(v: hz.Vec3, n: hz.Vec3): hz.Vec3 {
//     const nn = this.vNorm(n); const d = this.vDot(v, nn); return this.vSub(v, this.vScale(nn, d));
//   }

//   private rotateAroundAxis(v: hz.Vec3, axis: hz.Vec3, deg: number): hz.Vec3 {
//     const rad = (deg * Math.PI) / 180; const u = this.vNorm(axis);
//     const cos = Math.cos(rad), sin = Math.sin(rad);
//     const term1 = this.vScale(v, cos);
//     const term2 = this.vScale(this.vCross(u, v), sin);
//     const term3 = this.vScale(u, this.vDot(u, v) * (1 - cos));
//     return this.vAdd(this.vAdd(term1, term2), term3);
//   }

//   private rotateVec(v: hz.Vec3, yawDeg: number, pitchDeg: number): hz.Vec3 {
//     const yaw = (yawDeg * Math.PI) / 180, pitch = (pitchDeg * Math.PI) / 180;
//     const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
//     const vx = v.x * cY + v.z * sY, vz = -v.x * sY + v.z * cY, vy = v.y;
//     const px = vx, pz = vz * cP - vy * sP, py = vz * sP + vy * cP;
//     return new hz.Vec3(px, py, pz);
//   }

//   private lookRotation(forward: hz.Vec3, up: hz.Vec3): hz.Quaternion {
//     const f = hz.Vec3.normalize(forward); const r = hz.Vec3.normalize(this.vCross(up, f)); const u = this.vCross(f, r);
//     return this.basisToQuat(f, u);
//   }

//   private basisToQuat(forward: hz.Vec3, up: hz.Vec3): hz.Quaternion {
//     const f = hz.Vec3.normalize(forward); const r = hz.Vec3.normalize(this.vCross(up, f)); const u = this.vCross(f, r);
//     const m00 = r.x, m01 = u.x, m02 = f.x, m10 = r.y, m11 = u.y, m12 = f.y, m20 = r.z, m21 = u.z, m22 = f.z;
//     const tr = m00 + m11 + m22;
//     let qw: number, qx: number, qy: number, qz: number;
//     if (tr > 0) { const S = Math.sqrt(tr + 1.0) * 2; qw = 0.25 * S; qx = (m21 - m12) / S; qy = (m02 - m20) / S; qz = (m10 - m01) / S; }
//     else if (m00 > m11 && m00 > m22) { const S = Math.sqrt(1.0 + m00 - m11 - m22) * 2; qw = (m21 - m12) / S; qx = 0.25 * S; qy = (m01 + m10) / S; qz = (m02 + m20) / S; }
//     else if (m11 > m22) { const S = Math.sqrt(1.0 + m11 - m00 - m22) * 2; qw = (m02 - m20) / S; qx = (m01 + m10) / S; qy = 0.25 * S; qz = (m12 + m21) / S; }
//     else { const S = Math.sqrt(1.0 + m22 - m00 - m11) * 2; qw = (m10 - m01) / S; qx = (m02 + m20) / S; qy = (m12 + m21) / S; qz = 0.25 * S; }
//     return new hz.Quaternion(qx, qy, qz, qw);
//   }

//   private randomUnitVector(): hz.Vec3 {
//     const u = Math.random(), v = Math.random();
//     const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1), s = Math.sin(phi);
//     return new hz.Vec3(Math.cos(theta) * s, Math.cos(phi), Math.sin(theta) * s);
//   }

//   private clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
//   private lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
//   private randRange(min: number, max: number): number { return min + Math.random() * (max - min); }
// }
