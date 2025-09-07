// import { Library } from '_Library';
// import { OisifManager } from '_OManager';
// import { TreeEvent } from '_TreeEvent';
// import { TreePool } from '_TreePool';
// import LocalCamera from 'horizon/camera';
// import * as hz from 'horizon/core';

// type State = {showEntity: hz.Entity};

// class TreeSpawnObject extends hz.Component<typeof TreeSpawnObject> {
//   private isTrigger: boolean = false;
//   private loadTreeDuration: number = 0.5;
//   private loadTreeTimer: number = 0;
//   private loadList: hz.Entity[] = []
//   private currentPose: hz.AvatarGripPose = hz.AvatarGripPose.Default;
//   private poseTimeout: number = 0;
//   private showEntity!: hz.Entity;

//   start() {
//     this.loadList = this.entity.children.get().find(e => e.tags.contains('Load'))?.children.get()!;
//     this.createShowEntity();

//     this.connectLocalBroadcastEvent(hz.World.onUpdate, (data) => {
//       this.update(data.deltaTime);
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
//       player.clearAvatarGripPoseOverride();
//       this.async.setTimeout(() => {
//         this.entity.as(hz.GrabbableEntity).forceHold(player, hz.Handedness.Right, true);
//       }, 2000);
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnGrabStart, (isRightHand, player) => {
//       this.setAvatarPose(player, hz.AvatarGripPose.Default);
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnGrabEnd, (player) => {
//       player.clearAvatarGripPoseOverride();
//       this.async.setTimeout(() => {
//         this.entity.as(hz.GrabbableEntity).forceHold(player, hz.Handedness.Right, true);
//       }, 5000)
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnButton1Up, (player) => {
//       this.sendNetworkBroadcastEvent(TreeEvent.resetAllTree, { player: this.entity.owner.get()});
//       // this.spawnTree(player)
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnButton2Up, (player) => {
//       this.sendNetworkBroadcastEvent(TreeEvent.resetAllTree, { player: this.entity.owner.get()});
//       // this.spawnTree(player);
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnIndexTriggerDown, (player) => {
//       this.setAvatarPose(player, hz.AvatarGripPose.Sword);
//       this.isTrigger = true;
//       this.spawnTree(player);
//     });

//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnIndexTriggerUp, (player) => {
//       if (this.loadTreeTimer >= this.loadTreeDuration) {
//         this.spawnTree(player);
//         this.loadTreeTimer = 0;
//       } else {
//         this.setAvatarPose(player, hz.AvatarGripPose.CarryLight);
//         this.poseTimeout = this.async.setTimeout(() => {this.setAvatarPose(player, hz.AvatarGripPose.Default)}, this.loadTreeTimer * 1000);
//       }
//       this.isTrigger = false;
//     });
//   }

//   receiveOwnership(state: State | null, fromPlayer: hz.Player, toPlayer: hz.Player) {
//     this.showEntity = state?.showEntity ?? this.showEntity;
//     LocalCamera.collisionEnabled.set(false);
//   }
//   transferOwnership(fromPlayer: hz.Player, toPlayer: hz.Player): State {
//     return {showEntity: this.showEntity};
//   }

//   private update(deltaTime: number) {
//     if (this.entity.owner.get() == this.world.getServerPlayer()) return;
//     if (this.isTrigger) {
//       this.loadTreeTimer = Math.min(this.loadTreeDuration, this.loadTreeTimer + deltaTime);
//     } else {
//       this.loadTreeTimer = Math.max(0, this.loadTreeTimer - deltaTime);
//     }
//     const t = this.loadTreeTimer / this.loadTreeDuration;

//     if (this.isTrigger && t >= 0.95 && this.currentPose != hz.AvatarGripPose.Pistol) {
//       this.setAvatarPose(this.entity.owner.get(), hz.AvatarGripPose.Pistol);
//     }

//     const hit = this.castCameraRay();
//     if (this.isTrigger && hit) {
//       const rotation = hz.Quaternion.lookRotation(hit.normal);
//       this.showEntity.position.set(hit.hitPoint);
//       this.showEntity.rotation.set(rotation);
//       this.showEntity.visible.set(true);
//     } else {
//       this.showEntity.visible.set(false);
//     }
    
//     const count = this.loadList.length;
//     let index = 1;
//     for (const load of this.loadList) {
//       load.visible.set(t * 1.1 >= index / count);
//       index++;
//     }
//   }

//   private onInput(input: string, isUp: boolean) {
//     switch (input) {
//       case 'Grab':
//         break;
//       case 'Trigger':
//         break;
//       case '1':
//         break;
//       case '2':
//         break;
//     }
//   }

//   private createShowEntity() {
//     const asset = new hz.Asset(BigInt(Library.segementIgnoreCast));
//     this.world.spawnAsset(asset, hz.Vec3.zero, hz.Quaternion.zero).then((entityList) => {
//       this.showEntity = entityList[0];
//       this.showEntity.visible.set(false);
//       this.showEntity.collidable.set(false);
//       this.showEntity.owner.set(this.entity.owner.get());
//       this.showEntity.scale.set(new hz.Vec3(0.2, 0.2, 0.5));
//     });
//   }

//   private setAvatarPose(player: hz.Player, pose: hz.AvatarGripPose) {
//     this.async.clearTimeout(this.poseTimeout);
//     player.setAvatarGripPoseOverride(pose);
//     this.currentPose = pose;
//   }

//   private spawnTree(player: hz.Player) {
//     // this.sendNetworkBroadcastEvent(TreeEvent.localRacastDebug, { position: cameraPos, direction: cameraFwd });
//     const hit = this.castCameraRay();
//     if (hit && hit.targetType == hz.RaycastTargetType.Entity) {
//       // const oEntity = OisifManager.I.manager.get(hit.target);
//       // if (oEntity) {
//       //   console.log(`Touch ${oEntity.entity?.name.get()}`);
//       //   oEntity.makeDynamic();
//       //   oEntity.entity?.simulated.set(true);
//       // } else {
//       //   console.log(`No touch`);
//       // }

//       // var hitEntity = hit.target.as(hz.Entity);
//       // // hitEntity.as(hz.MeshEntity).style.tintColor.set(hz.Color.blue)
//       // if (hit.target.tags.contains('Soil')) {
//       //   console.log(`Sent spawn tree event`);
        
//       //   this.sendNetworkBroadcastEvent(TreeEvent.spawnTree, { player: player, position: hit.hitPoint });
//       // } else {
//       //   console.log(`Sent spawn tree event`);
//       //   this.sendNetworkBroadcastEvent(TreeEvent.spawnTree, { player: player, position: hit.hitPoint });

//       //   this.sendNetworkBroadcastEvent(TreeEvent.pruneTree, { entity: hit.target, player: player });
//       // }
//     }

//     this.setAvatarPose(player, hz.AvatarGripPose.Shield);
//     this.poseTimeout = this.async.setTimeout(() => {
//       this.setAvatarPose(player, hz.AvatarGripPose.Default);
//     }, 2000)
//   }

//   private castCameraRay(): hz.RaycastHit {
//     const cameraFwd = LocalCamera.forward.get();
//     const cameraPos = LocalCamera.position.get();
//     const raycast = this.entity.children.get().find(e => e.tags.contains('Raycast'))?.as(hz.RaycastGizmo);
//     return raycast?.raycast(cameraPos, cameraFwd, { layerType: hz.LayerType.Objects })!;
//   }
// }
// hz.Component.register(TreeSpawnObject);