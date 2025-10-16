import * as hz from "horizon/core";
import { Interactable, OInteractableManager } from "_OInteractableManager";
import { OWrapper } from "_OWrapper";

export class OTriggerPool {
  private searchRadius = 8;
  private activateRadius = 3;
  private triggerPool: hz.Entity[] = [];
  private triggerToInteractable = new Map<hz.Entity, Interactable>();

  constructor(private wrapper: OWrapper, private interactableManager: OInteractableManager) {
    const triggerPoolRoot = this.wrapper.world.getEntitiesWithTags(['TriggerPool'])[0];
    this.triggerPool = triggerPoolRoot.children.get();
    for (let i = 0; i < this.triggerPool.length; i++) {
      const triggerEntity = this.triggerPool[i];
      this.wrapper.onPlayerEnter((player: hz.Player) => {
        const target = this.triggerToInteractable.get(triggerEntity);
        target?.interact(player);
      });
    }

    this.wrapper.component.async.setInterval(() => this.updatePool(), 200);
  }

  private updatePool() {
    const players = this.wrapper.component.world.getPlayers() as hz.Player[];
    if (!players.length || !this.triggerPool.length) return;

    const candidates: {
      interactable: Interactable;
      distance: number;
      closestPlayer: hz.Player;
    }[] = [];

    this.interactableManager.forEach((interactable) => {
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
        const meshEntity = triggerEntity.children.get()[0].as(hz.MeshEntity);

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
