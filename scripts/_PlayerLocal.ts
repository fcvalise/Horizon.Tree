import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';
import { OMobileController } from '_OMobileController';
import { PlayerRescueModule } from 'PlayerRescueModule';

export class PlayerLocal extends hz.Component {
  public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit; player: hz.Player }>("onTouch");

  private mobile!: OMobileController;
  private rescue?: PlayerRescueModule;

  async start() {
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
      this.entity.owner.set(player);
    });

    const owner = this.entity.owner.get();
    if (owner != this.world.getServerPlayer()) {
      const wrapper = new OWrapper(this);
      this.mobile = new OMobileController(wrapper, owner);
      this.rescue = new PlayerRescueModule(wrapper, owner);
    }
  }
}
hz.Component.register(PlayerLocal);