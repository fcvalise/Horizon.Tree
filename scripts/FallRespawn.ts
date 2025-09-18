import * as hz from 'horizon/core';

export class FallRespawn extends hz.Component<typeof FallRespawn> {
  static propsDefinition = {
    spawnPoint: { type: hz.PropTypes.Entity },
    fallThreshold: { type: hz.PropTypes.Number, default: -2 },
  };

  private spawnPointGizmo?: hz.SpawnPointGizmo;
  private playerMap: Map<hz.Player, hz.Vec3> = new Map()

  override start() {
    this.spawnPointGizmo = this.props.spawnPoint!.as(hz.SpawnPointGizmo);
    this.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
      this.checkAllPlayers();
    });
  }

  private checkAllPlayers() {
    const players = this.world.getPlayers();
    for (const player of players) {
      this.checkPlayerPosition(player);
    }
  }

  private checkPlayerPosition(player: hz.Player) {
    const playerPosition = player.position.get();
    const lastPosition = this.playerMap.get(player)!;
    if (lastPosition && (playerPosition.y < this.props.fallThreshold || playerPosition.y > 60)) {
      this.spawnPointGizmo?.position.set(lastPosition.add(hz.Vec3.up.mul(3)));
      this.spawnPointGizmo?.teleportPlayer(player);
    }
    if (player.isGrounded) {
      this.async.setTimeout(() => {
        this.playerMap.set(player, playerPosition);
      }, 4000);
    }
  }
}

hz.Component.register(FallRespawn);