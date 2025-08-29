import { Component, PropTypes, World, Player, SpawnPointGizmo } from 'horizon/core';

export class FallRespawn extends Component<typeof FallRespawn> {
  static propsDefinition = {
    // The spawn point where players will be respawned.
    spawnPoint: { type: PropTypes.Entity },
    // The Y position below which a player will be respawned.
    fallThreshold: { type: PropTypes.Number, default: -2 },
  };

  private spawnPointGizmo?: SpawnPointGizmo;

  override start() {
    if (!this.props.spawnPoint) {
      console.error("FallRespawn: The 'spawnPoint' property is not set. Please assign a SpawnPointGizmo in the editor.");
      return;
    }

    this.spawnPointGizmo = this.props.spawnPoint.as(SpawnPointGizmo);

    if (!this.spawnPointGizmo) {
      console.error("FallRespawn: The assigned 'spawnPoint' entity is not a SpawnPointGizmo.");
      return;
    }

    // Connect to the world's update loop to check player positions every frame.
    this.connectLocalBroadcastEvent(World.onUpdate, () => {
      this.checkAllPlayers();
    });
  }

  private checkAllPlayers() {
    const players = this.world.getPlayers();
    for (const player of players) {
      this.checkPlayerPosition(player);
    }
  }

  private checkPlayerPosition(player: Player) {
    const playerPosition = player.position.get();

    if (playerPosition.y < this.props.fallThreshold) {
      this.respawnPlayer(player);
    }
  }

  private respawnPlayer(player: Player) {
    if (this.spawnPointGizmo) {
      this.spawnPointGizmo.teleportPlayer(player);
      console.log(`Player ${player.name.get()} fell and was respawned.`);
    }
  }
}

Component.register(FallRespawn);