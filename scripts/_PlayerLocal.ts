import * as hz from 'horizon/core';
import LocalCamera from 'horizon/camera';
import { Library } from '_Library';

type TransferState = { cursor: hz.Entity };

export class PlayerLocal extends hz.Component {
    public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit, player: hz.Player }>("onTouch");
    private cursor!: hz.Entity;
    private isTrigger: boolean = false;

    start() {
        this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
            this.entity.as(hz.GrabbableEntity).forceHold(player, hz.Handedness.Right, true);
            player.setAvatarGripPoseOverride(hz.AvatarGripPose.Default);
        });
        
        // this.createCursor();
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
        // this.updateCursor();
    }

    receiveOwnership(state: TransferState | null, fromPlayer: hz.Player, toPlayer: hz.Player) {
        this.cursor = state?.cursor ?? this.cursor;
        LocalCamera.collisionEnabled.set(false);
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
        const asset = new hz.Asset(BigInt(Library.segementIgnoreCast));
        this.world.spawnAsset(asset, hz.Vec3.zero, hz.Quaternion.zero).then((entityList) => {
            this.cursor = entityList[0];
            this.cursor.visible.set(false);
            this.cursor.collidable.set(false);
            this.cursor.owner.set(this.entity.owner.get());
            this.cursor.scale.set(new hz.Vec3(0.2, 0.2, 0.5));
        });
    }

    public updateCursor() {
        const hit = this.castCameraRay();
        if (this.isTrigger && hit) {
            const rotation = hz.Quaternion.lookRotation(hit.normal);
            this.cursor.position.set(hit.hitPoint);
            this.cursor.rotation.set(rotation);
            this.cursor.visible.set(true);
        } else {
            this.cursor.visible.set(false);
        }
    }
}
hz.Component.register(PlayerLocal);