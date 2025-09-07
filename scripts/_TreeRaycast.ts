// import * as hz from "horizon/core";
// import { GizmoRaycastSystem } from "SimpleTreeComponent";

// const raycastDebug = 1305910664434839;

// export class TreeRaycast {
//     private gizmo!: hz.RaycastGizmo;
//     private test!: GizmoRaycastSystem;

//     constructor(
//         rootEntity: hz.Entity,
//         private component: hz.Component
//     ) {
        
//         this.gizmo = rootEntity.as(hz.RaycastGizmo);
//         if (!this.gizmo) {
//             const children = rootEntity.children.get();
//             for (const child of children) {
//                 this.gizmo = child.as(hz.RaycastGizmo);
//                 if (this.gizmo) {
//                     break;
//                 }
//             }
//         }
//         this.test = new GizmoRaycastSystem(this.gizmo, '');
//         if (!this.gizmo) {
//             console.error(`A raycast gizmo is needed`);
//         }
//     }

//     public cast(origin: hz.Vec3, dir: hz.Vec3, maxDist: number): hz.EntityRaycastHit | undefined {
//         const EPS = 1e-3;
//         const o = new hz.Vec3(
//             origin.x + dir.x * EPS,
//             origin.y + dir.y * EPS,
//             origin.z + dir.z * EPS
//         );
//         const hit = this.gizmo.raycast(o, dir, {maxDistance: maxDist});
        
//         if (hit?.targetType === hz.RaycastTargetType.Entity && hit.distance !== 0) {
//             return (hit as hz.EntityRaycastHit);
//         }
//         return undefined;
//     }

//     public debug(origin: hz.Vec3, dir: hz.Vec3) {
//         const rot = hz.Quaternion.lookRotation(dir);
//         this.component.world.spawnAsset(new hz.Asset(BigInt(raycastDebug)), origin, rot);
//     }
// }