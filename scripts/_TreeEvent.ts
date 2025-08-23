import * as hz from "horizon/core";

export class TreeEvent {
    public static spawnTree = new hz.NetworkEvent<{ position: hz.Vec3, player: hz.Player }>("spawnTree");
}