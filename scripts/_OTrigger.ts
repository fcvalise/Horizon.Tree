import { OEntity } from "_OEntity";
import * as hz from "horizon/core";

// --- Interactable: register an OEntity with a callback ---
export class Interactable {
  constructor(
    public oEntity: OEntity,
    public interact: (player: hz.Player) => void
  ) {}

  static inline(oEntity: OEntity, interact: (player: hz.Player) => void) {
    return new Interactable(oEntity, interact);
  }
}

// --- Registry: store OEntities + callbacks, search by point ---
export class InteractableRegistry {
  private static _inst: InteractableRegistry | null = null;
  static get I(): InteractableRegistry {
    return (this._inst ??= new InteractableRegistry());
  }

  private readonly items = new Set<Interactable>();

  add(item: Interactable): () => void {
    this.items.add(item);
    return () => this.items.delete(item);
  }

  addInline(oEntity: OEntity, interact: (player: hz.Player) => void): () => void {
    return this.add(Interactable.inline(oEntity, interact));
  }

  /** Find nearest registered OEntity to a point, capped by maxDist. */
  nearest(pos: hz.Vec3, maxDist = Number.POSITIVE_INFINITY): Interactable | null {
    let best: Interactable | null = null;
    let bestD = maxDist;
    this.items.forEach((it) => {
      const d = it.oEntity.position.distance(pos);
      if (d < bestD) {
        best = it;
        bestD = d;
      }
    });
    return best;
  }
}

class OTrigger extends hz.Component<typeof OTrigger> {
  private attachRadius = 6;
  private scanEvery = 0.2;
  private attached: Interactable | null = null;

  async start() {
    // Fire the attached callback when someone enters this trigger volume.
    this.connectCodeBlockEvent(
      this.entity,
      hz.CodeBlockEvents.OnPlayerEnterTrigger,
      (player: hz.Player) => {
        this.attached?.interact(player);
      }
    );

    this.async.setInterval(() => this.scanAndSnap(), this.scanEvery);
  }

  private scanAndSnap() {
    let winner: { item: Interactable; d: number } | null = null;

    for (const p of this.world.getPlayers()) {
      const pPos = p.position.get();
      const nearest = InteractableRegistry.I.nearest(pPos, this.attachRadius);
      if (!nearest) continue;

      const d = nearest.oEntity.position.distance(pPos);
      if (!winner || d < winner.d) {
        winner = { item: nearest, d };
      }
    }

    if (winner) {
      this.attached = winner.item;
      this.entity.position.set(this.attached.oEntity.position);
    } else {
      this.attached = null;
    }
  }
}

hz.Component.register(OTrigger);
