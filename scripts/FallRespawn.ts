import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';

export class FallRespawn extends hz.Component<typeof FallRespawn> {
  static propsDefinition = {
    spawnPoint: { type: hz.PropTypes.Entity },
    fallThreshold: { type: hz.PropTypes.Number, default: -2 },
  };

  private wrapper!: OWrapper;
  private spawnPointGizmo?: hz.SpawnPointGizmo;
  private playerList: hz.Player[] = [];
  private playerMap: Map<hz.Player, hz.Vec3> = new Map()

  override start() {
    this.wrapper = new OWrapper(this);
    this.spawnPointGizmo = this.props.spawnPoint!.as(hz.SpawnPointGizmo);
    this.wrapper.onPlayerEnter((player) => { this.playerList.push(player); })
    this.wrapper.onPlayerExit((player) => { this.playerList.push(player); })
    
    this.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
      this.checkAllPlayers();
    });
  }

  private checkAllPlayers() {
    for (const player of this.playerList) {
      this.checkPlayerPosition(player);
    }
  }

  private checkPlayerPosition(player: hz.Player) {
    if (!player) return;
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