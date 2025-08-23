import { TreeEvent } from '_TreeEvent';
import { TMath } from '_TreeMath';
import * as hz from 'horizon/core';

class TreeSpawnObject extends hz.Component<typeof TreeSpawnObject> {
  start() {
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
      player.clearAvatarGripPoseOverride();
      this.async.setTimeout(() => {
        this.entity.as(hz.GrabbableEntity).forceHold(player, hz.Handedness.Right, true);
      }, 5000)
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnGrabStart, (isRightHand, player) => {
      player.setAvatarGripPoseOverride(hz.AvatarGripPose.CarryLight);
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnGrabEnd, (player) => {
      player.clearAvatarGripPoseOverride();
      this.async.setTimeout(() => {
        this.entity.as(hz.GrabbableEntity).forceHold(player, hz.Handedness.Right, true);
      }, 5000)
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnButton1Up, (player) => {
      this.spawnTree(player)
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnButton2Up, (player) => {
      this.spawnTree(player);
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnIndexTriggerUp, (player) => {
      this.spawnTree(player);
    });
  }

  private spawnTree(player: hz.Player) {
    const playerPos = player.position.get();
    const playerFwd = player.forward.get();
    const position = TMath.vAdd(playerPos, TMath.vScale(playerFwd, 1));
    this.sendNetworkBroadcastEvent(TreeEvent.spawnTree, { player: player, position: playerPos });

    player.setAvatarGripPoseOverride(hz.AvatarGripPose.CarryHeavy);
    this.async.setTimeout(() => {
      player.setAvatarGripPoseOverride(hz.AvatarGripPose.CarryLight);
    }, 500)
  }
}
hz.Component.register(TreeSpawnObject);