import * as hz from 'horizon/core';

export class PlayerEvent {
  public static onTouch = new hz.NetworkEvent<{ hit: hz.EntityRaycastHit; player: hz.Player }>("onTouch");
}