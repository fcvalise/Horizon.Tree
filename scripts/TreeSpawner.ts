import { OisifManager } from '_OManager';
import { TreeBase } from '_TreeBase';
import { TreeEvent } from '_TreeEvent';
import { TMath } from '_TreeMath';
import { TreePool } from '_TreePool';
import { TreeRaycast } from '_TreeRaycast';
import * as hz from 'horizon/core';

export class TreeSpawner extends hz.Component<typeof TreeSpawner> {
  private tree!: TreeBase;
  private particle!: hz.ParticleGizmo;
  

  start() {
    this.connectNetworkBroadcastEvent(TreeEvent.spawnTree, (payload) => {
      this.spawnObjectAtPlayer(payload.player, payload.position);
    })
    this.particle = this.world.getEntitiesWithTags(['SpawnParticle'])[0].as(hz.ParticleGizmo);

    this.connectNetworkBroadcastEvent(TreeEvent.localRacastDebug, (payload) => {
      const rot = hz.Quaternion.lookRotation(payload.direction);
      this.world.spawnAsset(new hz.Asset(BigInt(1305910664434839)), payload.position, rot);
      console.log(`Create debug ray`);
    })
  }

  private async spawnObjectAtPlayer(player: hz.Player, position: hz.Vec3) {
      // this.particle.position.set(position);
      // this.particle.play({ fromStart: true});
      // this.entity.position.set(position);
      // this.tree = new TreeBase(this, position, { seed: `${position.x * 21839}` });
      // player.applyForce(TMath.vScale(player.forward.get(), -2.5));
      const oEntity = OisifManager.I.pool.get();
      if (oEntity) {
        oEntity.position = position;
        oEntity.scale = new hz.Vec3(1, 1, 1);
        oEntity.color = hz.Color.blue;
        this.async.setTimeout(() => {
          oEntity.makeStatic();
        }, (1000));
      }
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