import * as hz from "horizon/core";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";

export class Interactable {
    constructor(
        public oEntity: OEntity,
        public interact: (player: hz.Player) => void
    ) { }

    static create(oEntity: OEntity, interact: (player: hz.Player) => void) {
        return new Interactable(oEntity, interact);
    }
}

export class OInteractableManager {
    private readonly items = new Set<Interactable>();

    constructor(private wrapper: OWrapper) { }

    add(oEntity: OEntity, interact: (player: hz.Player) => void): () => void {
        const item = Interactable.create(oEntity, interact!);
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