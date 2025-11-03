import * as hz from "horizon/core";
import { Interactable, OInteractableManager } from "_OInteractableManager";
import { OWrapper } from "_OWrapper";
import { OTrigger } from "_OTrigger";
import { OInventory, OInventoryManager } from "_OInventory";

export class OTriggerPool {
  private triggerList: OTrigger[] = [];

  constructor(
    private wrapper: OWrapper,
    private interactable: OInteractableManager,
    private inventory: OInventoryManager
  ) {
    this.wrapper.onPlayerEnter((player) => {
      const trigger = OTrigger.Create(wrapper, player, interactable, inventory);
      this.triggerList.push(trigger);
    })

    this.wrapper.onPlayerExit((player) => {
      const trigger = this.triggerList.find((t) => t.player == player);
      if (trigger) trigger.dispose();
    })
  }
}
