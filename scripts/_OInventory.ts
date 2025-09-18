import * as hz from 'horizon/core';
import { Ease, OEntity } from '_OEntity';
import { OEntityManager } from '_OEntityManager';
import { OWrapper } from '_OWrapper';
import { OuiInventoryEvent } from '_OuiInventory';
import { OColor } from '_OColor';

export class OInventoryManager {
  private playerMap: Map<hz.Player, OInventory> = new Map();
  private readonly enoughDistance = 5;

  constructor(private wrapper: OWrapper, private manager: OEntityManager) {
    this.wrapper.onPlayerEnter((player) => {
      if (!this.playerMap.has(player)) {
        this.playerMap.set(player, new OInventory(this.wrapper, this.manager, player));
      }
    });
    this.wrapper.onUpdate((_dt) => { this.update(); });
  }

  public getInventory(player: hz.Player): OInventory {
    return this.playerMap.get(player)!;
  }

  private update() {
    const players = this.wrapper.world.getPlayers();

    // NOTE: For scale, consider tracking only "collectible" entities in a Set.
    for (const oEntity of [...this.manager.allList]) {
      if (!oEntity.isCollectible) continue;

      for (const player of players) {
        const d = oEntity.position.distance(player.position.get());
        const isCloseEnough = d < this.enoughDistance && oEntity.isSleeping;
        if (!isCloseEnough) continue;

        this.get(player)?.attach(oEntity);
        this.manager.delete(oEntity);
        break;
      }
    }
  }

  public get(player: hz.Player): OInventory | undefined {
    return this.playerMap.get(player);
  }
}

export class OInventory {
  private readonly startCount: number = 16;
  private readonly socketStepY = 0.15;
  private readonly socketBase = new hz.Vec3(0, 0, -0.5);

  private oEntityList: OEntity[] = [];
  private socketIndex: number = 0;

  constructor(private wrapper: OWrapper, private manager: OEntityManager, private player: hz.Player) {
    this.wrapper.onUpdateUntil((_dt) => this.fillStart(), () => this.oEntityList.length >= this.startCount);
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

      oEntity.scaleZeroTo(oEntity.scale, 1, false).then(() => {
        this.createAttachable(oEntity);
        this.rebuildSockets();
        this.updateUI();
      });
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
    const r = this.player.rootRotation.get().right;
    const u = this.player.up?.get() ?? hz.Vec3.up;
    return torsoPosW
      .add(r.mul(local.x))
      .add(u.mul(local.y))
      .add(f.mul(local.z));
  }

  public has(count: number): boolean {
    return this.oEntityList.filter(oe => !oe.isTweening()).length >= count;
  }

  public async consume(count: number, position: hz.Vec3, rotation: hz.Quaternion, scale: hz.Vec3) {
    let taken = 0;

    while (taken < count) {
      const idx = this.oEntityList.findIndex(e => !e.isTweening());
      if (idx === -1) break;

      const rotationGetter = () => hz.Quaternion.lookRotation(this.player.up.get().add(this.player.forward.get()).mul(-1));
      // const oEntity = this.oEntityList.shift()!;
      const oEntity = this.oEntityList.pop()!;
      oEntity.rotation = rotationGetter();

      oEntity.playMelody();
      await oEntity.tweenTo({
        duration: 0.1,
        scale: hz.Vec3.one,
        // rotationGetter: rotationGetter,
        color: OColor.Blue,
        ease: Ease.cubicOut,
        makeStatic: false,
      })

      const attachable = oEntity.entity?.as(hz.AttachableEntity);
      attachable?.detach();
      oEntity.enableTrail(true);

      if (oEntity.entity) {
        oEntity.position = oEntity.entity.position.get();
        oEntity.rotation = oEntity.entity.rotation.get();
        oEntity.scale = hz.Vec3.one;
      }

      oEntity.playMelody();
      await oEntity.tweenTo({
        duration: 0.1,
        scale: new hz.Vec3(0.5, 0.5, 0.1),
        position: oEntity.position.add(hz.Vec3.up.mul(1)),
        color: OColor.Blue,
        ease: Ease.cubicOut,
        makeStatic: false,
      })

      oEntity.playMelody();
      await oEntity.tweenTo({
        duration: 0.8,
        position: position.add(hz.Vec3.up.mul(3.5)),
        rotation: hz.Quaternion.lookRotation(hz.Vec3.up),
        scale: new hz.Vec3(1, 1, 0.1),
        ease: Ease.cubicOut,
        makeStatic: false,
      })

      // prevent weird rotation
      oEntity.rotation = hz.Quaternion.lookRotation(hz.Vec3.up.mul(-1));

      oEntity.playMelody();
      await oEntity.tweenTo({
        duration: 0.8,
        rotation: rotation,
        position: position.add(hz.Vec3.up.mul(0.01)),
        scale: scale.mul(1),
        color: OColor.DarkGreen,
        ease: Ease.easeInQuart,
        makeStatic: false,
      })

      oEntity.playMelody();
      await oEntity.tweenTo({
        duration: 0.8,
        rotation: rotation,
        position: position.add(hz.Vec3.up.mul(0.01)),
        scale: scale.mul(1),
        color: OColor.DarkGreen,
        ease: Ease.easeInQuart,
        makeStatic: false,
      })
      oEntity.playMelody();
      oEntity.enableTrail(false);
      oEntity.makeInvisible();
      this.manager.delete(oEntity);
      this.socketIndex--;

      taken++;
    }

    if (taken > 0) {
      this.rebuildSockets();
      this.updateUI();
    }
  }

  public async attach(oEntity: OEntity) {
    if (this.oEntityList.includes(oEntity)) return;

    oEntity.entity?.collidable.set(false);
    oEntity.entity?.simulated.set(true);
    oEntity.entity?.interactionMode.set(hz.EntityInteractionMode.Grabbable);
    oEntity.entity?.simulated.set(false);
    oEntity.entity?.owner.set(this.player);
    oEntity.enableTrail(true);

    const base = oEntity.scale.clone();
    const index = this.socketIndex++;
    const socket = this.getSocket(index);

    const targetGetter = () => this.socketLocalToWorld(socket.position);

    await oEntity.tweenTo({
      duration: 0.9,
      positionGetter: targetGetter,
      rotation: socket.rotation,
      makeStatic: false,
      ease: Ease.cubicOut
    });

    await oEntity.tweenTo({
      duration: 0.12,
      positionGetter: targetGetter,
      scale: base.mul(1.15),
      makeStatic: false,
      ease: Ease.cubicOut,
    });

    await oEntity.tweenTo({
      duration: 0.12,
      positionGetter: targetGetter,
      scale: base.mul(0.6),
      makeStatic: false,
      ease: Ease.cubicOut,
    });

    this.createAttachable(oEntity);
    this.oEntityList.push(oEntity);

    this.rebuildSockets();
    this.updateUI();
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
