import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';
import { OUtils } from '_OUtils';
import { OEntityManager } from '_OEntityManager';
import { Ease, OEntity } from '_OEntity';
import { TrailGizmo } from 'horizon/core';
import { OColor } from '_OColor';
import { ORandom } from '_ORandom';

type TargetType = 'Petal' | 'Hive';

export class OBee {
  private rootEntity!: hz.Entity;
  private head!: hz.Entity;
  private random: ORandom;

  private carrying = false;
  private target?: { type: TargetType; oEntity: OEntity };

  // Movement
  private speed = 4;
  private arriveRadius = 0.6;
  private arriveHiveRadius = 0.9;
  private retargetCooldownMs = 250;
  private lastRetargetAt = 0;

  private maxLoad = 1;
  private load = 0;
  private pickupRadius = 0.9;

  constructor(
    private wrapper: OWrapper,
    private manager: OEntityManager
  ) {
    this.rootEntity = wrapper.getTaggedObject('OBee:Root');
    this.rootEntity.tags.remove('OBee:Root');
    this.head = OUtils.getChildWithTag(this.rootEntity, 'OBee:Head')!;
    this.wrapper.onUpdate((dt) => this.update(dt));
    this.random = new ORandom('Oisif');

    this.rootEntity.visible.set(true);
  }

  private update(dt: number) {
    if (!this.head) return;

    if (!this.carrying && this.load >= this.maxLoad) {
      this.carrying = true;
      this.target = undefined;
    }

    if (!this.target) {
      this.pickTarget();
      if (!this.target) return;
    }

    const pos = this.head.position.get();
    const targetPos = this.target.oEntity.position;
    const toTarget = targetPos.sub(pos);
    const dist = toTarget.magnitude();
    const dir = dist > 1e-4 ? toTarget.normalize() : hz.Vec3.forward;

    const step = Math.min(this.speed * dt, dist);
    const nextPos = pos.add(dir.mul(step));
    this.head.position.set(nextPos);

    if (dist > 1e-4) this.head.rotation.set(hz.Quaternion.lookRotation(dir));

    const arriveRadius = this.carrying ? this.arriveHiveRadius : this.arriveRadius;
    if (dist <= arriveRadius) {
      this.onArrive(this.target);
      this.target = undefined;
      this.lastRetargetAt = Date.now();
    }
  }

  private pickTarget() {
    if (Date.now() - this.lastRetargetAt < this.retargetCooldownMs) return;

    const pos = this.head.position.get();
    if (!this.carrying) {
      const fullFlowerList = this.manager.getTagArray('Petal').filter(oe => oe.isCollectible);
      const flowerList: OEntity[] = []
      for (let index = 0; index < 3; index++) {
        if (fullFlowerList.length > 0) {
          flowerList.push(fullFlowerList.splice(this.random.range(0, fullFlowerList.length), 1)[0]);
        }
      }
      const oEntity = OUtils.closestOEntity(pos, flowerList).oEntity;
      if (oEntity) this.target = { type: 'Petal', oEntity: oEntity };
    } else {
      const hiveList = this.manager.getTagArray('Entrance') ?? [];
      const oEntity = OUtils.closestOEntity(pos, hiveList).oEntity;
      if (oEntity) this.target = { type: 'Hive', oEntity: oEntity };
    }
  }

  private onArrive(target: { type: TargetType; oEntity: OEntity }) {
    if (target.type === 'Petal') {
      this.collectClusterAround(target.oEntity.position);
      // if (this.load >= this.maxLoad) {
        this.carrying = true;
      // }
    } else {
      for (let index = 0; index < this.load; index++) {
        const coin = this.manager.create();
        coin.position = target.oEntity.position.add(hz.Vec3.up.mul(3).add(hz.Vec3.left).add(this.random.vectorHalf()));
        coin.rotation = target.oEntity.rotation;
        coin.scale = new hz.Vec3(0.5, 0.5, 0.2);
        coin.color = OColor.Orange;
        coin.brightness = 1;
        coin.setTags(['Coin']);
        this.makePhysics(coin);
      }
      this.load = 0;
      this.carrying = false;
    }
  }

  private makePhysics(oEntity: OEntity) {
      if (oEntity.makeDynamic()) {
        this.wrapper.setTimeout(() => {
          oEntity.makePhysic();
          oEntity.tweenTo({
            duration: 0.5,
            brightness: 3,
            ease: Ease.quadInOut,
            makeStatic: false,
            loop: true,
            yoyo: true
          });
          this.manager.makeCollectible(oEntity)
        }, 0.01)
      } else {
        this.wrapper.setTimeout(() => {
          this.makePhysics(oEntity);
        }, 0.01)
      }
  }

  private collectClusterAround(center: hz.Vec3) {
    if (this.load >= this.maxLoad) return;
    const list = this.manager.getTagArray('Petal').filter(oe => oe.isCollectible);
    
    for (let i = 0; i < list.length && this.load < this.maxLoad; i++) {
      const collectible = list[i];
      const d = collectible.position.distance(center);
      const positionGetter = () => this.head.position.get();
      const position = collectible.position;
      const rotation = collectible.rotation;
      const scale = collectible.scale;
      if (d <= this.pickupRadius) {
        this.manager.removeCollectible(collectible);
        collectible.playMelody();
        collectible.tweenTo({
          duration: 0.7,
          positionGetter: () => positionGetter(),
          scale: new hz.Vec3(0.5, 0.5, 0.2),
          color: OColor.Orange,
          makeStatic: false,
          ease: Ease.easeOutBounce
        }).then(() => {
          collectible.makeInvisible();
          collectible.position = position;
          collectible.rotation = rotation;
          collectible.scale = scale;
          // this.manager.delete(collectible);
        });
        this.load += 1;
      }
    }
  }
}
