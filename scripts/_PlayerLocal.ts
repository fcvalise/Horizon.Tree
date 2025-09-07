import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';
import { OMobileController } from '_OMobileController';

export class PlayerLocal extends hz.Component {
    public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit, player: hz.Player }>("onTouch");
    private mobile!: OMobileController;

    async start() {
        this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
            this.entity.owner.set(player);
        });
        
        const owner = this.entity.owner.get();
        if (owner != this.world.getServerPlayer()) {
            this.mobile = new OMobileController(new OWrapper(this), owner);
        }
    }
}
hz.Component.register(PlayerLocal);