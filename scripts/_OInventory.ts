import * as hz from 'horizon/core';
import { Ease, OEntity } from '_OEntity';
import { OEntityManager } from '_OEntityManager';
import { OWrapper } from '_OWrapper';
import { OuiInventoryEvent } from '_OuiInventory';
import { OColor } from '_OColor';
import { ORandom } from '_ORandom';

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

    for (const oEntity of [...this.manager.collectibleList]) {
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
  private readonly startCount: number = 1;
  private readonly maxCount: number = 24;
  private readonly socketStepY = 0.15;
  private readonly socketBase = new hz.Vec3(0, 0, -0.5);

  private oEntityList: OEntity[] = [];
  private socketIndex: number = 0;
  private random: ORandom;
  private particle: hz.ParticleGizmo;

  constructor(private wrapper: OWrapper, private manager: OEntityManager, private player: hz.Player) {
    this.wrapper.onUpdateUntil((_dt) => this.fillStart(), () => this.oEntityList.length >= this.startCount);
    this.random = new ORandom('Oisif');
    this.particle = this.wrapper.world.getEntitiesWithTags(['OInventory:Particle'])[0].as(hz.ParticleGizmo);
  }

  private fillStart() {
    if (this.oEntityList.length >= this.startCount) return;

    const oEntity = this.manager.create();
    if (oEntity.makeDynamic()) {
      oEntity.scale = new hz.Vec3(0.5 * 0.6, 0.5 * 0.6, 0.1);
      oEntity.color = OColor.Orange;
      oEntity.entity?.collidable.set(false);
      oEntity.entity?.simulated.set(false);
      oEntity.setTags(['Coin']);

      this.oEntityList.push(oEntity);
      this.socketIndex++;

      const scale = oEntity.scale;
      oEntity.scale = hz.Vec3.zero;
      oEntity.tweenTo({
        duration: 1,
        scale: scale,
        ease: Ease.cubicOut,
        makeStatic: false,
      }).then(() => {
        this.createAttachable(oEntity);
        this.rebuildSockets();
        this.particle.position.set(this.getSocket(0).position);
        this.wrapper.setTimeout(() => {
          this.particle.play();
        }, 0.1);
        // this.updateUI();
      });

      // oEntity.scaleZeroTo(oEntity.scale, 1, false).then(() => {
      //   this.createAttachable(oEntity);
      //   this.rebuildSockets();
      //   // this.updateUI();
      // });
    } else {
      this.manager.delete(oEntity);
    }
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

  private socketLocalToWorld(local: hz.Vec3): hz.Vec3 {
    const torsoPosW = this.player.torso.getPosition(hz.Space.World);
    const f = this.player.forward.get();
    const r = this.player.rootRotation.get().getRight();
    const u = this.player.up?.get() ?? hz.Vec3.up;
    return torsoPosW
      .add(r.mul(local.x))
      .add(u.mul(local.y))
      .add(f.mul(local.z));
  }

  public has(count: number): boolean {
    return this.oEntityList.filter(oe => !oe.isTweening()).length >= count;
  }

  public async consume(count: number, oEntityTarget: OEntity) {
    let taken = 0;
    if (count == 0) {
      count = 1;
    }

    const takenList: OEntity[] = [];

    while (taken < count) {
      const idx = this.oEntityList.findIndex(e => !e.isTweening());
      if (idx === -1) break;
      const positionGetter = () => oEntityTarget.position;
      const scaleGetter = () => oEntityTarget.scale;

      // const oEntity = this.oEntityList.shift()!;
      const oEntity = this.oEntityList.pop()!;
      takenList.push(oEntity);
      oEntity.position = oEntityTarget.position.clone();
      oEntity.rotation = oEntityTarget.rotation.clone();

      // if (taken == 0) {
        const attachable = oEntity.entity?.as(hz.AttachableEntity);
        attachable?.detach();
      // }

      if (oEntity.entity) {
        oEntity.position = oEntity.entity.position.get();
        oEntity.rotation = oEntityTarget.rotation;
        oEntity.scale = new hz.Vec3(0.5, 0.5, 0.1).mul(1 + count * 0.2);
      }

      const moveToEntitySocket = async () => {
        oEntity.playMelody();
        await oEntity.tweenTo({
          duration: 0.4,
          position: oEntityTarget.position,
          rotation: oEntityTarget.rotation,
          ease: Ease.cubicOut,
          makeStatic: false,
        })
      }

      const moveTopEntitySocket = async () => {
        const baseRot = oEntityTarget.rotation;
        const delta = hz.Quaternion.fromAxisAngle(baseRot.getForward(), Math.PI);
        const finalRot = delta.mul(baseRot);
        const randomPos = this.random.vectorHalf();
        
        oEntity.playMelody();
        await oEntity.tweenTo({
          duration: 0.5 / count,
          positionGetter: () => positionGetter().add(hz.Vec3.up.mul(3.5).add(randomPos)),
          rotation: finalRot,
          scale: new hz.Vec3(0.5, 0.5, 0.1),
          color: OColor.Blue,
          ease: Ease.cubicOut,
          makeStatic: false,
        })
        oEntity.enableTrail(true);
      }

      const moveToMerge = async () => {
        oEntity.playMelody();
        await oEntity.tweenTo({
          duration: 0.8 / count,
          rotation: oEntityTarget.rotation,
          positionGetter: positionGetter,
          scaleGetter: scaleGetter,
          color: OColor.DarkGreen,
          ease: Ease.easeInQuart,
          makeStatic: false,
        })

        oEntity.playMelody();
        await oEntity.tweenTo({
          duration: 0.8 / count,
          rotation: oEntityTarget.rotation,
          positionGetter: positionGetter,
          scaleGetter: scaleGetter,
          color: OColor.DarkGreen,
          ease: Ease.easeInQuart,
          makeStatic: false,
        })
        oEntity.playMelody();
        oEntity.enableTrail(false);
        oEntity.makeInvisible();
        this.manager.delete(oEntity);
      }

      // if (taken == 0) {
      //   moveToEntitySocket().then(() => {
      //     moveTopEntitySocket().then(() => {
      //       moveToMerge();
      //     })
      //   })
      // } else {
      //   this.wrapper.setTimeout(() => {
      //     oEntity.enableTrail(false);
      //     oEntity.makeInvisible();
      //     this.manager.delete(oEntity);
      //   }, 0.05)
      // }
      await moveToEntitySocket();
      await moveTopEntitySocket();
      await moveToMerge()

      this.socketIndex--;

      taken++;
    }

    if (taken > 0) {
      this.rebuildSockets();
      // this.updateUI();
    }

    if (count == 1) {
      this.fillStart();
    }

    while (takenList.length > 0) {
      
    }
  }

  public async attach(oEntity: OEntity): Promise<boolean> {
    if (this.oEntityList.includes(oEntity)) return false;
    if (this.oEntityList.length >= this.maxCount) return false;

    const inventoryEntity = this.manager.create();
    inventoryEntity.position = oEntity.position;
    inventoryEntity.rotation = oEntity.rotation;
    inventoryEntity.scale = oEntity.scale;
    inventoryEntity.color = oEntity.color;
    
    oEntity.makeInvisible();
    this.manager.delete(oEntity)
    
    inventoryEntity.makeDynamic();
    inventoryEntity.entity?.collidable.set(false);

    inventoryEntity.enableTrail(true);
    inventoryEntity.setTags(['Money']);

    const base = inventoryEntity.scale.clone();
    const index = this.socketIndex++;
    const socket = this.getSocket(index);

    const targetGetter = () => this.socketLocalToWorld(socket.position);

    await inventoryEntity.tweenTo({
      duration: 0.9,
      positionGetter: targetGetter,
      rotation: socket.rotation,
      makeStatic: false,
      ease: Ease.cubicOut
    });

    await inventoryEntity.tweenTo({
      duration: 0.12,
      positionGetter: targetGetter,
      scale: base.mul(1.15),
      makeStatic: false,
      ease: Ease.cubicOut,
    });

    await inventoryEntity.tweenTo({
      duration: 0.12,
      positionGetter: targetGetter,
      scale: base.mul(0.6),
      makeStatic: false,
      ease: Ease.cubicOut,
    });

    this.createAttachable(inventoryEntity);
    this.oEntityList.push(inventoryEntity);

    this.rebuildSockets();
    this.wrapper.incrementPVar(this.player, 'Bees:honeyCount');
    const score = this.wrapper.getPVar(this.player, 'Bees:honeyCount');
    this.wrapper.world.leaderboards.setScoreForPlayer('Honey', this.player, score, true);
    // this.manager.delete(oEntity);
    return true;
    // this.updateUI();
  }

  private createAttachable(oEntity: OEntity) {
    const attachable = oEntity.entity?.as(hz.AttachableEntity)!;
    attachable.attachToPlayer(this.player, hz.AttachablePlayerAnchor.Torso);
    oEntity.enableTrail(false);
    oEntity.playMelody();
  }

  private updateUI() {
    this.wrapper.component.sendNetworkBroadcastEvent(OuiInventoryEvent, {
      id: 'Money', count: this.oEntityList.length
    });
  }
}
