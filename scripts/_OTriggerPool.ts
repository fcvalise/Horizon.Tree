import * as hz from "horizon/core";
import { Interactable, OInteractableManager } from "_OInteractableManager";
import { OWrapper } from "_OWrapper";
import { OTrigger } from "_OTrigger";

export class OTriggerPool {
  private triggerList: OTrigger[] = [];

  constructor(private wrapper: OWrapper, private interactableManager: OInteractableManager) {
    this.wrapper.onPlayerEnter((player) => {
      const trigger = OTrigger.Create(wrapper, player, interactableManager);
      this.triggerList.push(trigger);
    })

    this.wrapper.onPlayerExit((player) => {
      const trigger = this.triggerList.find((t) => t.player == player);
      if (trigger) trigger.dispose();
    })
  }
}
