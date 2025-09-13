import { OEntity } from "_OEntity";
import * as hz from "horizon/core";

export class Interactable {
  constructor(public oEntity: OEntity, public interact: (player: hz.Player) => void) {}
  static inline(oEntity: OEntity, interact: (player: hz.Player) => void) { return new Interactable(oEntity, interact); }
}

export class InteractableRegistry {
  static readonly I = new InteractableRegistry();
  private readonly items = new Set<Interactable>();

  add(item: Interactable): () => void { this.items.add(item); return () => this.items.delete(item); }
  addInline(oEntity: OEntity, interact: (player: hz.Player) => void) { return this.add(Interactable.inline(oEntity, interact)); }
  forEach(visitor: (item: Interactable) => void) { this.items.forEach(visitor); }
}

class OTriggerPool extends hz.Component<typeof OTriggerPool> {
  static propsDefinition = {
    radius:       { type: hz.PropTypes.Number, default: 4 },
    tickSeconds:  { type: hz.PropTypes.Number, default: 0.2 },
  };

  private triggerPool: hz.Entity[] = [];
  private triggerToInteractable = new Map<hz.Entity, Interactable>();

  start() {
    this.triggerPool = this.entity.children.get();
    for (let i = 0; i < this.triggerPool.length; i++) {
      const triggerEntity = this.triggerPool[i];
      this.connectCodeBlockEvent(triggerEntity, hz.CodeBlockEvents.OnPlayerEnterTrigger, (player: hz.Player) => {
        const target = this.triggerToInteractable.get(triggerEntity);
        target?.interact(player);
      });
    }

    this.async.setInterval(() => this.updatePool(), Number(this.props.tickSeconds ?? 0.2));
  }

  private updatePool() {
    const players = this.world.getPlayers() as hz.Player[];
    if (!players.length || !this.triggerPool.length) return;
    const searchRadius = Number(this.props.radius ?? 4);
    const candidateList: { interactable: Interactable; distance: number; playerPosition: hz.Vec3 }[] = [];

    InteractableRegistry.I.forEach((interactable) => {
      let closestDistance = Infinity;
      let closestPlayerPosition = players[0].position.get();

      for (let i = 0; i < players.length; i++) {
        const playerPosition = players[i].position.get();
        const distance = interactable.oEntity.position.distance(playerPosition);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlayerPosition = playerPosition;
        }
      }

      if (closestDistance <= searchRadius) {
        candidateList.push({ interactable, distance: closestDistance, playerPosition: closestPlayerPosition });
      }
    });

    candidateList.sort((a, b) => a.distance - b.distance);

    const assignedCount = Math.min(this.triggerPool.length, candidateList.length);
    for (let i = 0; i < this.triggerPool.length; i++) {
      const triggerEntity = this.triggerPool[i];

      if (i < assignedCount) {
        const candidate = candidateList[i];
        const oEntity = candidate.interactable.oEntity;
        const position = oEntity.position;
        const targetPosition = position.add(oEntity.rotation.forward.mul(oEntity.scale.z * 0.5));

        this.triggerToInteractable.set(triggerEntity, candidate.interactable);
        triggerEntity.position.set(targetPosition);
      } else {
        this.triggerToInteractable.delete(triggerEntity);
        triggerEntity.position.set(new hz.Vec3(0, -999, 0));
      }
    }
  }
}

hz.Component.register(OTriggerPool);
