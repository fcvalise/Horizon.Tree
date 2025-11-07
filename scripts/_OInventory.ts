import * as hz from 'horizon/core';
import { Ease, OEntity } from '_OEntity';
import { OEntityManager } from '_OEntityManager';
import { OWrapper } from '_OWrapper';
import { OuiInventoryEvent } from '_OuiInventory';
import { OColor } from '_OColor';
import { OMerge } from '_OMerge';
import { Vec3 } from 'horizon/core';
import { ORandom } from '_ORandom';
import { OUtils } from '_OUtils';
import { PlayerLocal } from '_PlayerLocal';
import { PlayerEvent } from '_PlayerEvent';

export class OInventoryManager {
  private playerMap: Map<hz.Player, OInventory> = new Map();
  private readonly enoughDistance = 2;

  constructor(private wrapper: OWrapper, private manager: OEntityManager) {
    this.wrapper.onPlayerEnter((player) => {
      if (!this.playerMap.has(player)) {
        this.playerMap.set(player, new OInventory(this.wrapper, this.manager, player));
      }
    });
    this.wrapper.onUpdate((_dt) => { this.update(); });
  }

  private update() {
    const players = this.wrapper.world.getPlayers();
    const coinList = this.manager.getTagArray('Coin');

    for (const oEntity of coinList) {
      for (const player of players) {
        const d = oEntity.position.distance(player.position.get());
        const isCloseEnough = d < this.enoughDistance && oEntity.isSleeping;
        if (!isCloseEnough) continue;
        this.get(player)?.attach(oEntity);
        break;
      }
    }
  }

  public get(player: hz.Player): OInventory | undefined {
    return this.playerMap.get(player);
  }
}

export class OInventory {
  private readonly scaleDisplay = new hz.Vec3(0.3, 0.3, 0.1);
  private readonly scaleWorld = new hz.Vec3(0.5, 0.5, 0.1);
  private readonly maxCount: number = 24;
  private readonly socketStepY = 0.15;
  private readonly socketBase = new hz.Vec3(0, 0, -0.5);

  private random: ORandom;
  private count = 0;
  private displayCount = 0;
  private oEntityList: OEntity[] = [];
  private socketIndex: number = 0;
  private isAttaching: boolean = false;
  private autoOneDuration = 1;
  private autoOneTimer = 1;

  constructor(private wrapper: OWrapper, private manager: OEntityManager, private player: hz.Player) {
    this.wrapper.onUpdateUntil(
      () => this.createDisplay(),
      () => this.oEntityList.length >= this.maxCount
    );
    this.wrapper.onUpdate((dt) => {
      this.update(dt);
    })
    this.wrapper.onUpdate(() => {
      this.addDisplay();
      this.removeDisplay();
    })
    this.random = new ORandom('Oisif');
  }

  public update(dt: number) {
    if (this.count == 0) {
      this.autoOneTimer += dt;
      if (this.autoOneTimer > this.autoOneDuration) {
        this.count = 1;
        this.autoOneTimer = 0;
        this.wrapper.component.sendNetworkEvent(this.player, PlayerEvent.onBag, { value: this.count });
      }
    }
  }

  public has(count: number): boolean {
    return this.count >= count;
  }

  public async consume(count: number, oEntityTarget: OEntity) {
    if (!this.has(count)) return;
    let takenCount = 0;
    const takenList: OEntity[] = [];

    while (takenCount < count) {
      const oEntity = this.manager.create();
      oEntity.position = this.socketLocalToWorld(this.count);
      // oEntity.rotation = this.getSocket(this.count);
      oEntity.scale = hz.Vec3.zero;
      oEntity.color = OColor.Orange;
      oEntity.enableTrail(true);
      oEntity.sync();
      if (oEntity.makeDynamic()) {
        oEntity.entity?.collidable.set(false);
        oEntity.entity?.simulated.set(false);
        await OUtils.waitFor(this.wrapper, () => oEntity.entity?.collidable.get() == false);
        oEntity.playMelody();
        await oEntity.tweenTo({
          duration: 0.1,
          position: oEntityTarget.position.add(this.random.vectorHalf()),
          rotation: this.random.rotation(),
          scale: this.scaleWorld.mul(2),
          brightness: 2,
          ease: Ease.cubicOut,
          makeStatic: false,
        });
        oEntityTarget.tweenTo({
          duration: 0.1,
          position: oEntityTarget.position.add(this.random.vectorHalf(hz.Vec3.down).mul(0.3)),
          scale: oEntityTarget.scale.mul(1.05),
          ease: Ease.cubicOut,
          loop: 1,
          yoyo: true,
          makeStatic: false,
        });
        this.count = Math.max(0, this.count - 1);
        takenCount++;
        this.wrapper.component.sendNetworkEvent(this.player, PlayerEvent.onBag, { value: this.count });

        takenList.push(oEntity);
      } else {
        this.manager.delete(oEntity);
      }
    }

    let index = 1;
    for (const oEntity of takenList) {
        oEntity.playMelody();
        await oEntity.tweenTo({
          duration: 0.4,
          positionGetter: () => oEntityTarget.position.add(hz.Vec3.up.mul((index) * this.socketStepY)),
          rotationGetter: () => oEntityTarget.rotation,
          scale: this.scaleWorld,
          ease: Ease.cubicOut,
          makeStatic: false,
        });
        index++;
    }
    for (const oEntity of takenList) {
      await oEntity.tweenTo({
        duration: 0.4,
        positionGetter: () => oEntityTarget.position,
        rotationGetter: () => oEntityTarget.rotation,
        scaleGetter: () => oEntityTarget.scale,
        color: oEntityTarget.color,
        ease: Ease.easeInQuart,
        makeStatic: false,
      })
      oEntityTarget.tweenTo({
        duration: 0.2,
        position: oEntityTarget.position.add(this.random.vectorHalf(hz.Vec3.down).mul(0.3)),
        scale: oEntityTarget.scale.mul(1.05),
        brightness: 2,
        color: OColor.Orange,
        ease: Ease.cubicOut,
        loop: 1,
        yoyo: true,
        makeStatic: false,
      }).then(() => {
        oEntityTarget.tweenTo({
          duration: 0.1,
          brightness: 1,
          ease: Ease.cubicOut,
          makeStatic: false,
        });
      });
      this.wrapper.component.sendNetworkEvent(this.player, PlayerEvent.onScore, { value: 1 });

      oEntity.enableTrail(false);
      oEntity.playMelody();
      oEntity.makeInvisible();
      this.wrapper.setTimeout(() => {
        this.manager.delete(oEntity);
      }, 0.1)
  }
  }

  public async attach(oEntity: OEntity): Promise<boolean> {
    if (this.isAttaching) return false;
    if (this.count >= this.maxCount) return false;
    const displayEntity = this.oEntityList[this.count++];
    this.wrapper.component.sendNetworkEvent(this.player, PlayerEvent.onBag, { value: this.count });

    let attachEntity = oEntity;
    this.isAttaching = true;

    while (oEntity.scale.x > this.scaleWorld.x) {
      oEntity.scale = oEntity.scale.sub(hz.Vec3.one.mul(OMerge.scaleAddition));

      attachEntity = this.manager.create();
      attachEntity.position = oEntity.position.add(hz.Vec3.up.mul(oEntity.scale.x));
      attachEntity.rotation = oEntity.rotation;
      attachEntity.scale = oEntity.scale;
      attachEntity.color = OColor.Orange;
      attachEntity.setTags(['Coin'])
      if (attachEntity.makeDynamic()) {
        attachEntity.makePhysic();
      }
    }

    const positionGetter = () => displayEntity.entity?.position.get()!;
    const rotationGetter = () => displayEntity.entity?.rotation.get()!;
        
    attachEntity.setTags([]);
    this.manager.indexMaybeRefresh(oEntity);
    attachEntity.entity?.collidable.set(false);
    attachEntity.entity?.simulated.set(false);
    attachEntity.enableTrail(true);
    await attachEntity.tweenTo({
      duration: 0.4,
      positionGetter: positionGetter,
      rotationGetter: rotationGetter,
      makeStatic: false,
      ease: Ease.cubicOut
    });
    attachEntity.enableTrail(false);
    attachEntity.makeInvisible();
    this.manager.delete(attachEntity);
    this.wrapper.incrementPVar(this.player, 'Bees:honeyCount');
    const score = this.wrapper.getPVar(this.player, 'Bees:honeyCount');
    this.wrapper.world.leaderboards.setScoreForPlayer('Honey', this.player, score, true);
    this.isAttaching = false;

    return true;
  }

  private createDisplay() {
   if (this.oEntityList.length >= this.maxCount) return;

    const oEntity = this.manager.create();
    if (oEntity.makeDynamic()) {
      oEntity.scale = hz.Vec3.zero;
      oEntity.color = OColor.Orange;
      oEntity.entity?.collidable.set(false);
      oEntity.entity?.simulated.set(false);
      this.wrapper.setTimeout(() => {
        this.createAttachable(oEntity);
        this.rebuildSockets();
        this.oEntityList.push(oEntity);
        this.socketIndex++;
      }, 0.1)
    } else {
      this.manager.delete(oEntity);
    }
  }

  private async addDisplay() {
    if (this.displayCount >= this.maxCount) return;
    if (this.count >= this.oEntityList.length) return;
    if (this.count > this.displayCount) {
      const oEntity = this.oEntityList[this.displayCount];
      oEntity.tweenTo({
        duration: 0.5,
        scale: this.scaleDisplay,
        brightness: 2,
        ease: Ease.cubicOut,
        makeStatic: false,
      });
      this.displayCount++;
    }
  }

  private async removeDisplay() {
    if (this.count < this.displayCount) {
      const idx = this.displayCount - 1;
      const oEntity = this.oEntityList[idx];
      oEntity.tweenTo({
        duration: 0.5,
        scale: hz.Vec3.zero,
        brightness: 1,
        ease: Ease.cubicOut,
        makeStatic: false,
      });
      this.displayCount--;
    }
  }

  private createAttachable(oEntity: OEntity) {
    const attachable = oEntity.entity?.as(hz.AttachableEntity)!;
    attachable.attachToPlayer(this.player, hz.AttachablePlayerAnchor.Torso);
    oEntity.enableTrail(false);
    oEntity.playMelody();
  }


  private rebuildSockets() {
    let index = 0;
    for (const oEntity of this.oEntityList) {
      const attachable = oEntity.entity?.as(hz.AttachableEntity);
      if (!attachable) { index++; continue; }

      const localPos = new hz.Vec3(
        this.socketBase.x,
        this.socketBase.y + index * this.socketStepY,
        this.socketBase.z
      );
      attachable.socketAttachmentRotation.set(hz.Quaternion.lookRotation(hz.Vec3.up));
      attachable.socketAttachmentPosition.set(localPos);
      index++;
    }
  }
  private getSocket(index: number): { position: hz.Vec3, rotation: hz.Quaternion } {
    const position = new hz.Vec3(
      this.socketBase.x,
      this.socketBase.y + index * this.socketStepY,
      this.socketBase.z
    );
    const rotation = hz.Quaternion.lookRotation(hz.Vec3.up);
    return { position, rotation };
  }

  private socketLocalToWorld(index: number): hz.Vec3 {
    const local = this.getSocket(index).position;
    const torsoPosW = this.player.torso.getPosition(hz.Space.World);
    const f = this.player.forward.get();
    const r = this.player.rootRotation.get().getRight();
    const u = this.player.up?.get() ?? hz.Vec3.up;
    return torsoPosW
      .add(r.mul(local.x))
      .add(u.mul(local.y))
      .add(f.mul(local.z));
  }

  private updateUI() {
    this.wrapper.component.sendNetworkBroadcastEvent(OuiInventoryEvent, {
      id: 'Money', count: this.oEntityList.length
    });
  }
}
