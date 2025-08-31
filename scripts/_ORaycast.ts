import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";

export class ORaycast {
    public static raycastDebug = new hz.NetworkEvent<{ origin: hz.Vec3, direction: hz.Vec3 }>("raycastDebug");
    private readonly raycastDebugAsset = 1305910664434839;

    private gizmo!: hz.RaycastGizmo; 

    constructor(private wrapper: OWrapper) {
        this.gizmo = this.wrapper.entity.as(hz.RaycastGizmo);
        wrapper.component.connectNetworkBroadcastEvent(ORaycast.raycastDebug, (payload) => {
            this.debugServer(payload.origin, payload.direction)
        })
    }

    public cast(origin: hz.Vec3, direction: hz.Vec3, maxDist: number = 100): hz.EntityRaycastHit | undefined {
        const options: hz.RaycastOptions = { layerType: hz.LayerType.Both , maxDistance: maxDist, stopOnFirstHit: true };
        const hit = this.gizmo.raycast(origin.add(direction.mul(1e-3)), direction, options);
        if (hit?.targetType === hz.RaycastTargetType.Entity && hit.distance !== 0) {
            return (hit as hz.EntityRaycastHit);
        }
        return undefined;
    }

    public debug(oWrapper: OWrapper, origin: hz.Vec3, direction: hz.Vec3) {
        if (oWrapper.isServer()) {
            this.debugServer(origin, direction);
        } else {
            this.debugLocal(origin, direction);
        }
    }

    private debugServer(origin: hz.Vec3, direction: hz.Vec3) {
        const rotation = hz.Quaternion.lookRotation(direction);
        const asset = new hz.Asset(BigInt(this.raycastDebugAsset));
        this.wrapper.world.spawnAsset(asset, origin, rotation);
    }

    private debugLocal(origin: hz.Vec3, direction: hz.Vec3) {
        this.wrapper.component.sendNetworkBroadcastEvent(ORaycast.raycastDebug, { origin, direction })
    }
}