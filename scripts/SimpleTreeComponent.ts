// SimpleTreeWithRaycast.ts
import * as hz from "horizon/core";
import { SimpleTreeHZ, RaycastAPI } from "./SimpleTree"; // FIX: correct import

type HitResult = { hit: boolean; point?: hz.Vec3; normal?: hz.Vec3; distance?: number; entity?: hz.Entity; };

export class GizmoRaycastSystem implements RaycastAPI {
  constructor(private gizmo: hz.RaycastGizmo, private selfTag: string) {}
  private static EPS = 0.01;

  private len2(a: hz.Vec3): number { return a.x*a.x + a.y*a.y + a.z*a.z; }
  private len(a: hz.Vec3): number { return Math.sqrt(this.len2(a)); }
  private sub(a: hz.Vec3, b: hz.Vec3): hz.Vec3 { return new hz.Vec3(a.x-b.x, a.y-b.y, a.z-b.z); }
  private norm(a: hz.Vec3): hz.Vec3 { const L=this.len(a); return L>1e-8? new hz.Vec3(a.x/L,a.y/L,a.z/L) : new hz.Vec3(0,0,0); }

  private entityHasTag(e: hz.Entity, tag: string): boolean {
    try { if ((e as any).hasTag?.(tag)) return true; } catch {}
    try { if ((e as any).tags?.has?.(tag)) return true; } catch {}
    try { if ((e as any).tags?.contains?.(tag)) return true; } catch {}
    try { if ((e as any).getTag?.(tag)) return true; } catch {}
    return false;
  }

  public raycastRaw(origin: hz.Vec3, dir: hz.Vec3) {
    const o = new hz.Vec3(
      origin.x + dir.x * GizmoRaycastSystem.EPS,
      origin.y + dir.y * GizmoRaycastSystem.EPS,
      origin.z + dir.z * GizmoRaycastSystem.EPS
    );
    return this.gizmo.raycast(o, dir);
  }

  /** Accept ANY target type. If it’s an Entity with selfTag, ignore. Build hitPoint from 'distance' if needed. */
  private firstHit(origin: hz.Vec3, dir: hz.Vec3, maxDist: number): HitResult {
    const hit = this.raycastRaw(origin, dir);
    // console.log(`Raycast origin (${origin}) direction (${dir}) : ${hit?.targetType} ${hit?.distance}`);
    
    if (!hit) return { hit: false };

    const target = (hit as any).target as hz.Entity | undefined;

    // Ignore THIS tree’s own spawned parts (if the hit is an Entity with our selfTag)
    if (target && this.entityHasTag(target, this.selfTag)) return { hit: false };

    // Try to read common fields regardless of target type
    let hp: hz.Vec3 | undefined = (hit as any).hitPoint ?? (hit as any).point;
    const nrm: hz.Vec3 | undefined = (hit as any).hitNormal ?? (hit as any).normal;

    let dist: number | undefined = (hit as any).distance ?? (hit as any).t ?? undefined;
    if (!hp && typeof dist === "number") {
      // synthesize a hit point from the distance if provided
      hp = new hz.Vec3(origin.x + dir.x * dist, origin.y + dir.y * dist, origin.z + dir.z * dist);
    }
    if (!dist && hp) dist = this.len(this.sub(hp, origin));
    if (!dist || dist <= 0 || dist > maxDist) return { hit: false };

    return { hit: true, point: hp, normal: nrm ?? new hz.Vec3(0, 1, 0), distance: dist, entity: target };
  }

  raycastNonSelf(origin: hz.Vec3, dir: hz.Vec3, maxDist: number, _selfRoot: hz.Entity): HitResult {
    const d = this.norm(dir);
    return this.firstHit(origin, d, maxDist);
  }
}

/**
 * Component: spawns and grows a tree, with a Raycast system wired in.
 * Add this component to an entity that has a RaycastGizmo (as a child or sibling).
 */
export default class SimpleTreeWithRaycast extends hz.Component {
  start(): void {}

  // --- Inspector-configurable ---
  public segmentAssetId: number = 1465004591204214;
  public leafAssetId: number = 1540906950211699;

  public maxDepth: number = 18;
  public segmentLength: number = 0.4;
  public branchChance: number = 0.4;
  public branchAngle: number = 35;

  public bottomWidth: number = 0.22;
  public topWidth: number = 0.06;
  public leafScale: number = 0.22;

  public growthRhythm: "Continuous" | "Rhythmic" = "Rhythmic";
  public tropismMode: "Orthotropic" | "Plagiotropic" | "None" = "Orthotropic";
  public mainAxis: "Sympodial" | "Monopodial" = "Sympodial";

  private raycastGizmo?: hz.RaycastGizmo;
  private tree!: SimpleTreeHZ;

  public preStart() {
    // 1) Create the tree and assign a unique selfTag we’ll also give to the raycaster:
    this.tree = new SimpleTreeHZ();
    const selfTag = `TreeSelf_${Math.floor(Math.random()*1e9)}`;
    this.tree.setSelfTag(selfTag);

    // 2) Find RaycastGizmo & set up raycaster that ignores selfTag
    this.raycastGizmo = this.findRaycastGizmo();
    if (!this.raycastGizmo) console.log("[SimpleTreeWithRaycast] No RaycastGizmo found; growth will ignore occluders.");
    const rc = this.raycastGizmo ? new GizmoRaycastSystem(this.raycastGizmo, selfTag) : undefined;

    // 3) Configure (no colonization, ray-only)
    const overrides = {
      render: { segmentAssetId: this.segmentAssetId, leafAssetId: this.leafAssetId, bottomWidth: this.bottomWidth, topWidth: this.topWidth, leafScale: this.leafScale },
      growth: { maxDepth: this.maxDepth, segmentLength: this.segmentLength, branchChance: this.branchChance, branchAngle: this.branchAngle, initialBudCount: 1 },
      architecture: { growthRhythm: this.growthRhythm, tropism: this.tropismMode, mainAxis: this.mainAxis },
    } as Partial<Parameters<SimpleTreeHZ["initialize"]>[1]>;

    // 4) Spin it up
    this.tree.initialize(this, overrides, rc);
  }

  /** Looks for a RaycastGizmo as a child of this entity; returns first match or undefined. */
  private findRaycastGizmo(): hz.RaycastGizmo | undefined {
    const root = this.entity;
    const stack: hz.Entity[] = [...root.children.get()];
    while (stack.length > 0) {
      const n = stack.pop()!;
      try { const giz = n.as(hz.RaycastGizmo); if (giz) return giz; } catch {}
      const kids = n.children?.get?.(); if (kids && kids.length) stack.push(...kids);
    }
    return undefined;
  }
}
hz.Component.register(SimpleTreeWithRaycast);
