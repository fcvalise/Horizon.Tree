import * as hz from 'horizon/core';
import LocalCamera from 'horizon/camera';
import { Library } from '_Library';

type TransferState = { cursor: hz.Entity };

export class PlayerLocal extends hz.Component {
    public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit, player: hz.Player }>("onTouch");
    private cursor!: hz.Entity;
    private isTrigger: boolean = false;

    async start() {
        this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
            this.async.setTimeout(() => {
                this.entity.as(hz.GrabbableEntity).forceHold(player, hz.Handedness.Right, true);
                player.setAvatarGripPoseOverride(hz.AvatarGripPose.Default);
                this.cursor.owner.set(player);
            }, 2000) // Wait for cursor to be spawned
        });
        
        this.createCursor();

        if (this.entity.owner.get() != this.world.getServerPlayer()) {
            this.connectLocalBroadcastEvent(hz.World.onUpdate, (data) => { this.update() });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => { });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnGrabStart, (isRightHand, player) => { });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnGrabEnd, (player) => { });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnButton1Up, (player) => { });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnButton2Up, (player) => { });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnIndexTriggerDown, (player) => {
                this.isTrigger = true;
                
            });
            this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnIndexTriggerUp, (player) => {
                this.isTrigger = false;
                const hit = this.castCameraRay();
                if (hit && hit.targetType == hz.RaycastTargetType.Entity) {
                    this.sendNetworkBroadcastEvent(PlayerLocal.onTouch, {hit: hit, player: player})
                }
            });
        }
    }

    private update() {
        this.updateCursor();
    }

    receiveOwnership(state: TransferState | null, fromPlayer: hz.Player, toPlayer: hz.Player) {
        this.cursor = state?.cursor ?? this.cursor;
        // LocalCamera.collisionEnabled.set(false);
    }
    transferOwnership(fromPlayer: hz.Player, toPlayer: hz.Player): TransferState {
        return { cursor: this.cursor };
    }

    private castCameraRay(): hz.RaycastHit {
        const cameraFwd = LocalCamera.forward.get();
        const cameraPos = LocalCamera.position.get();
        const raycast = this.entity.children.get()[0].as(hz.RaycastGizmo);
        return raycast?.raycast(cameraPos, cameraFwd, { layerType: hz.LayerType.Objects })!;
    }

    private createCursor() {
        const asset = new hz.Asset(BigInt(Library.cursor));
        this.world.spawnAsset(asset, hz.Vec3.zero, hz.Quaternion.zero).then((entityList) => {
            this.cursor = entityList[0];
            this.cursor.visible.set(false);
            this.cursor.collidable.set(false);
            this.cursor.owner.set(this.entity.owner.get());
        });
    }

    public updateCursor() {
        if (!this.cursor) return;
        const hit = this.castCameraRay();

        if (hit && hit.targetType == hz.RaycastTargetType.Entity) {
            const entity = hit.target;
            const position = entity.position.get().sub(entity.forward.get().mul(0.05));
            const rotation = entity.rotation.get();
            const scale = this.getScale(entity);

            this.cursor.position.set(position);
            this.cursor.rotation.set(rotation);
            this.cursor.scale.set(scale);
            this.cursor.visible.set(true);
        } else {
            this.cursor.visible.set(false);
        }
    }

    // Uniform Border
    private getScale(target: hz.Entity) {
        const R0 = 0.5;
        const H0 = 1.0;

        const tSide = 0.05;
        const tTop = 0.05;
        const s = target.scale.get();
        const ax = s.x * R0;
        const az = s.z * R0;
        const hy = s.y * H0;

        const sx = (ax + tSide) / R0;
        const sz = (az + tSide) / R0;
        const sy = (hy + tTop) / H0;

        return new hz.Vec3(sx, sy, sz)
    }

}
hz.Component.register(PlayerLocal);