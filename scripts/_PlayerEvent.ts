import { OEntity } from '_OEntity';
import * as hz from 'horizon/core';

export class PlayerEvent {
  public static onAskStart = new hz.NetworkEvent("onAskStart");
  public static onGetStart = new hz.NetworkEvent<{position: hz.Vec3}>("onGetStart");
  public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit; player: hz.Player }>("onTouch");
  public static onTouchUI = new hz.NetworkEvent("onTouchUI");
  public static enableTriggerUI = new hz.NetworkEvent<{isEnable: boolean}>("enableTriggerUI");
  public static onToggleMap = new hz.NetworkEvent<{isEnable: boolean}>("onToggleMap");
  public static onScore = new hz.NetworkEvent<{value: number}>("onScore");
  public static onBag = new hz.NetworkEvent<{value: number}>("onBag");
}