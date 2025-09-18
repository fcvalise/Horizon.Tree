import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';

class Computer extends hz.Component<typeof Computer> {
  private wrapper: OWrapper = new OWrapper(this);

  start() {
    this.wrapper.onPlayerEnter((player) => {
      console.log(`Player ${player.name.get()} entered`);
      const attachable = this.entity.as(hz.AttachableEntity)
      // attachable.attachToPlayer(player, hz.AttachablePlayerAnchor.Head);
    });
  }
}
hz.Component.register(Computer);