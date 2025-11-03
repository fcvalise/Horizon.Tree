import * as hz from 'horizon/core';

export class PlayerEvent {
  public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit; player: hz.Player }>("onTouch");
  public static onTouchUI = new hz.NetworkEvent("onTouchUI");
  public static enableTriggerUI = new hz.NetworkEvent<{isEnable: boolean}>("enableTriggerUI");
  public static onToggleMap = new hz.NetworkEvent<{isEnable: boolean}>("onToggleMap");

}