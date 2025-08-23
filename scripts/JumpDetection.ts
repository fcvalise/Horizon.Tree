import * as hz from 'horizon/core';
import { TreeSpawner } from 'TreeSpawner';

export class JumpDetection extends hz.Component<typeof JumpDetection> {
  static propsDefinition = {
  };

  private wasGrounded: boolean = true;

  override start() {


    if (this.entity.owner.get() != this.world.getServerPlayer()) {
      this.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
        this.monitorPlayerJump();
      });
    }
  }

  private monitorPlayerJump() {
    // const localPlayer = this.entity.owner.get();
    // const isCurrentlyGrounded = localPlayer.isGrounded.get();
    // if (this.wasGrounded && !isCurrentlyGrounded) {
    //   this.sendNetworkBroadcastEvent(TreeSpawner.spawnTree, {player: localPlayer});
    // }
    // this.wasGrounded = isCurrentlyGrounded;
  }
}

hz.Component.register(JumpDetection);