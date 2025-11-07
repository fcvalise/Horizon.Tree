import * as hz from "horizon/core";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OInventoryManager } from "_OInventory";
import { Color } from "horizon/core";

export class Interactable {
    public interact: (player: hz.Player) => void

    constructor(
        public wrapper: OWrapper,
        public oEntity: OEntity,
        public price: number,
        public infos: string,
        public inventory: OInventoryManager,
        public interactable: OInteractableManager,
        public onInteract: (player: hz.Player) => void,
    ) {
        this.interact = (player) => {
            if (this.inventory.get(player)?.has(price)) {
                this.inventory.get(player)?.consume(price, oEntity!).then(() => {
                    onInteract(player);
                });
                interactable.delete(this.oEntity)
            } else {
                this.wrapper.world.ui.showPopupForPlayer(player, 'Not enough honey', 1, {
                position: new hz.Vec3(0, -0.2, 0),
                fontSize: 2,
                fontColor: Color.black,
                // backgroundColor: ,
                playSound: false,
                showTimer: false,
                });
            }
        }
    }
}

export class OInteractableManager {
    private readonly items = new Set<Interactable>();

    constructor(
        private wrapper: OWrapper,
        public inventory: OInventoryManager,
    ) { }

    add(oEntity: OEntity, price: number, infos: string, onInteract: (player: hz.Player) => void): () => void {
        const item = new Interactable(this.wrapper, oEntity, price, infos, this.inventory, this, onInteract);
        this.items.add(item);
        return () => this.items.delete(item);
    }

    forEach(visitor: (item: Interactable) => void) {
        this.items.forEach(visitor);
    }

    delete(oEntity: OEntity): boolean {
        this.items.forEach((item) => {
            if (item.oEntity === oEntity) {
                return this.items.delete(item);
            }
        })
        return false;
    }
}