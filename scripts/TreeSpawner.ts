import { TreeBase } from '_TreeBase';
import { TreeEvent } from '_TreeEvent';
import { TMath } from '_TreeMath';
import { TreePool } from '_TreePool';
import { TreeRaycast } from '_TreeRaycast';
import * as hz from 'horizon/core';

export class TreeSpawner extends hz.Component<typeof TreeSpawner> {
  private tree!: TreeBase;
  private raycast!: TreeRaycast;
  private particle!: hz.ParticleGizmo;
  

  start() {
    this.connectNetworkBroadcastEvent(TreeEvent.spawnTree, (payload) => {
      this.spawnObjectAtPlayer(payload.player, payload.position);
    })
    this.raycast = new TreeRaycast(this.entity, this);
    this.particle = this.world.getEntitiesWithTags(['SpawnParticle'])[0].as(hz.ParticleGizmo);
  }

  private async spawnObjectAtPlayer(player: hz.Player, position: hz.Vec3) {
    const hit = this.raycast.cast(TMath.vAdd(position, new hz.Vec3(0, 0.5, 0)), hz.Vec3.down, 20);
    // this.raycast.debug(TMath.vAdd(position, new hz.Vec3(0, 0.5, 0)), hz.Vec3.down);
    if (hit) {
      this.particle.position.set(hit.hitPoint);
      this.particle.play({ fromStart: true});
      this.entity.position.set(hit?.hitPoint);
      this.tree = new TreeBase(this, hit.hitPoint, { seed: `${hit.distance * 21839}` });
      player.applyForce(TMath.vScale(player.forward.get(), -2.5));
      player.showToastMessage("Tree planted", 2000);
      this.spawnBaseAsset(hit.hitPoint);
    }
  }

  private async spawnBaseAsset(position: hz.Vec3) {
    const baseAssetID = 1710845306274172;
    const direction = new hz.Vec3(0, 1, 0);
    const rotation = hz.Quaternion.fromEuler(direction);
    this.world.spawnAsset(new hz.Asset(BigInt(baseAssetID)), position, rotation);
    
    await TreePool.I.acquire(baseAssetID, position, rotation, hz.Vec3.one, false);
  }
}
hz.Component.register(TreeSpawner);