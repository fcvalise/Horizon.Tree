import * as hz from 'horizon/core';
import { ORaycast } from '_ORaycast';
import { OWrapper } from '_OWrapper';
import { TreeBase } from '_TreeBase';
import { TreeEvent } from '_TreeEvent';
import { TreePool } from '_TreePool';

export class TreeSpawner extends hz.Component<typeof TreeSpawner> {
  private tree!: TreeBase;
  private particle!: hz.ParticleGizmo;
  private wrapper!: OWrapper;
  private raycast!: ORaycast;

  start() {
    this.wrapper = new OWrapper(this);
    this.raycast = new ORaycast(this.wrapper);
    this.connectNetworkBroadcastEvent(TreeEvent.spawnTree, (payload) => {
      this.spawnObjectAtPlayer(payload.player, payload.position);
    })
    this.particle = this.world.getEntitiesWithTags(['SpawnParticle'])[0].as(hz.ParticleGizmo);
  }

  private async spawnObjectAtPlayer(player: hz.Player, position: hz.Vec3) {
      // this.particle.position.set(position);
      // this.particle.play({ fromStart: true});
      // this.entity.position.set(position);
      // this.tree = new TreeBase(this.wrapper, position, { seed: `${position.x * 21839}` });
      // player.applyForce(TMath.vScale(player.forward.get(), -2.5));
      player.showToastMessage("Tree planted", 2000);
  }

  private async spawnBaseAsset(position: hz.Vec3) {
    const baseAssetID = 1710845306274172;
    const direction = new hz.Vec3(0, 1, 0);
    const rotation = hz.Quaternion.fromEuler(direction);
    this.world.spawnAsset(new hz.Asset(BigInt(baseAssetID)), position, rotation);
    
    await TreePool.I.acquire(baseAssetID, position, rotation, hz.Vec3.one);
  }
}
hz.Component.register(TreeSpawner);