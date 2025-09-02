import * as hz from "horizon/core";

export class OEvent {
    public static onTerrainSpawn = new hz.NetworkEvent<{ entity: hz.Entity }>("onTerrainSpawn");
}