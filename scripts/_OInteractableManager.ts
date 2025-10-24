import * as hz from "horizon/core";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";

export class Interactable {
    constructor(
        public oEntity: OEntity,
        public price: number,
        public infos: string,
        public interact: (player: hz.Player) => void,
    ) { }
}

export class OInteractableManager {
    private readonly items = new Set<Interactable>();

    constructor(private wrapper: OWrapper) { }

    add(oEntity: OEntity, price: number, infos: string, interact: (player: hz.Player) => void): () => void {
        const item = new Interactable(oEntity, price, infos, interact!);
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