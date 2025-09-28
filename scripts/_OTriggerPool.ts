import { OEntity } from "_OEntity";
import * as hz from "horizon/core";
import { MeshEntity } from "horizon/core";

export class Interactable {
  constructor(public oEntity: OEntity, public interact: (player: hz.Player) => void) { }
  static create(oEntity: OEntity, interact: (player: hz.Player) => void) { return new Interactable(oEntity, interact); }
}

export class InteractableRegistry {
  static readonly I = new InteractableRegistry();
  private readonly items = new Set<Interactable>();

  add(item: Interactable): () => void;
  add(oEntity: OEntity, interact: (player: hz.Player) => void): () => void;

  add(arg1: Interactable | OEntity, arg2?: (player: hz.Player) => void): () => void {
    if (arg1 instanceof Interactable) {
      this.items.add(arg1);
      return () => this.items.delete(arg1);
    } else {
      const item = Interactable.create(arg1, arg2!);
      this.items.add(item);
      return () => this.items.delete(item);
    }
  }

  forEach(visitor: (item: Interactable) => void) {
    this.items.forEach(visitor);
  }

  delete(oEntity: OEntity): boolean;
  delete(item: Interactable): boolean;
  delete(arg: Interactable | OEntity): boolean {
    if (arg instanceof Interactable) {
      return this.items.delete(arg);
    }
    this.items.forEach((item) => {
      if (item.oEntity === arg) {
        return this.items.delete(item);
      }
    })
    return false;
  }
}


class OTriggerPool extends hz.Component<typeof OTriggerPool> {
  private searchRadius = 8;
  private activateRadius = 3;
  private tickSeconds = 0.2;
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

    this.async.setInterval(() => this.updatePool(), Number(this.tickSeconds));
  }

  private updatePool() {
    const players = this.world.getPlayers() as hz.Player[];
    if (!players.length || !this.triggerPool.length) return;

    const candidates: {
      interactable: Interactable;
      distance: number;
      closestPlayer: hz.Player;
    }[] = [];

    InteractableRegistry.I.forEach((interactable) => {
      if (!interactable?.oEntity) return;

      let closestDistance = Infinity;
      let closestPlayer = players[0];

      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const dist = interactable.oEntity.position.distance(player.position.get());
        if (dist < closestDistance) {
          closestDistance = dist;
          closestPlayer = player;
        }
      }

      if (closestDistance <= this.activateRadius) {
        interactable.interact(closestPlayer);
      }

      if (closestDistance <= this.searchRadius) {
        candidates.push({ interactable, distance: closestDistance, closestPlayer });
      }
    });

    candidates.sort((a, b) => a.distance - b.distance);

    const assignedCount = Math.min(this.triggerPool.length, candidates.length);
    for (let i = 0; i < this.triggerPool.length; i++) {
      const triggerEntity = this.triggerPool[i];

      if (i < assignedCount) {
        const candidate = candidates[i];
        const oEntity = candidate.interactable.oEntity;
        const meshEntity = triggerEntity.children.get()[0].as(MeshEntity);

        if (meshEntity) {
          meshEntity.style.tintColor.set(oEntity.color);
          meshEntity.scale.set(new hz.Vec3(0.5, 0.5, 0.2));
        }

        triggerEntity.position.set(oEntity.position);
        triggerEntity.rotation.set(oEntity.rotation);

        this.triggerToInteractable.set(triggerEntity, candidate.interactable);
      } else {
        this.triggerToInteractable.delete(triggerEntity);
        triggerEntity.position.set(new hz.Vec3(0, -999, 0));
      }
    }
  }
}

hz.Component.register(OTriggerPool);
