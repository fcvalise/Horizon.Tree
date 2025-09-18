import * as hz from 'horizon/core';
import * as npc from 'horizon/npc'
import { ORandom } from '_ORandom';
import { OUtils } from '_OUtils';
import { OWrapper } from '_OWrapper';

class NPCTest extends hz.Component<typeof NPCTest> {
  private wrapper!: OWrapper;
  private random!: ORandom;

  async start() {
    // this.wrapper = new OWrapper(this);
    this.random = new ORandom('Oisif');
    this.wrapper = new OWrapper(this);

    this.moveNpc();
    this.async.setInterval(() => {
      this.moveNpc();
    }, 2000)
  }
  
  private async moveNpc() {
    const closestPlayer = OUtils.closestPlayer(this.wrapper, this.entity.position.get());
    const randomPos = new hz.Vec3(this.random.range(-1, 1), 0, this.random.range(-1, -1));
    const targetPos = closestPlayer.player.position.get().add(randomPos);
    const enemy = this.entity.as(npc.Npc);
    const moveOptions: npc.NpcLocomotionOptions = {
      movementSpeed: 3,
      faceMovementDirection: true
    };
    const player = await enemy.tryGetPlayer();
    const result = await player?.moveToPosition(targetPos, moveOptions)!;

    if (result != npc.NpcLocomotionResult.Complete) {
      console.error("Something went wrong trying to go to the Banana!");
      return;
    }
  }
}
hz.Component.register(NPCTest);