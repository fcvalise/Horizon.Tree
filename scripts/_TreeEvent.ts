import * as hz from "horizon/core";

export class TreeEvent {
    public static spawnTree = new hz.NetworkEvent<{ position: hz.Vec3, player: hz.Player }>("spawnTree");
    public static spawnTreeDescription = new hz.NetworkEvent<{ position: hz.Vec3 }>("spawnTreeDescription");
    public static resetAllTree = new hz.NetworkEvent<{ player: hz.Player }>("resetAllTree");
    public static pruneTree = new hz.NetworkEvent<{ entity: hz.Entity, player: hz.Player }>("pruneTree");
    public static localRacastDebug = new hz.NetworkEvent<{ position: hz.Vec3, direction: hz.Vec3 }>("localRacastDebug");
}