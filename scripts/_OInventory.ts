import * as hz from 'horizon/core';
import { Ease, OEntity } from '_OEntity';
import { OEntityManager } from '_OEntityManager';
import { OWrapper } from '_OWrapper';
import { OuiInventoryEvent } from '_OuiInventory';

export class OInventoryManager {
  private playerMap: Map<hz.Player, OInventory> = new Map();
  private readonly enoughDistance = 5;
  private readonly tooCloseDistance = 2.5;

  constructor(private wrapper: OWrapper, private manager: OEntityManager) {
    this.wrapper.onPlayerEnter((player) => {
      if (!this.playerMap.has(player)) {
        this.playerMap.set(player, new OInventory(this.wrapper, player));
      }
    })
    this.wrapper.onUpdate((dt) => { this.update(dt) })
  }

  private update(dt: number) {
    for (const oEntity of this.manager.allList) {
      if (oEntity.isCollectible) {
        const players = this.wrapper.world.getPlayers();
        for (const player of players) {
          const playerPosition = player.position.get();
          const distance = oEntity.position.distance(playerPosition);
          const isCloseEnough = distance < this.enoughDistance && oEntity.isSleeping;
          const isTooClose = distance < this.tooCloseDistance
          if (isCloseEnough || isTooClose) {
            const inventory = this.get(player);
            inventory?.attach(oEntity);
            this.manager.delete(oEntity);
            break;
          }
        }
      }
    }
  }

  public get(player: hz.Player): OInventory | undefined {
    return this.playerMap.get(player);
  }
}


export class OInventory {
  private oEntityList: OEntity[] = [];
  private branchCount: number = 0;
  private leafCount: number = 0;

  constructor(private wrapper: OWrapper, private player: hz.Player) { }

  public attach(oEntity: OEntity) {
    if (this.oEntityList.includes(oEntity)) return;
    oEntity.entity?.collidable.set(false);
    oEntity.entity?.simulated.set(false);
    oEntity.moveToDynamic(() => this.getFollowPosition(this.player), 2, false, Ease.cubicOut);
    oEntity.scaleTo(hz.Vec3.one.mul(0), 0.9, false, Ease.quadInOut);
    oEntity.enableTrail(true);
    this.wrapper.component.async.setTimeout(() => {
      oEntity.playMelody();
      oEntity.makeInvisible();
      oEntity.enableTrail(false);
    }, 2000);
    this.oEntityList.push(oEntity);

    const branchCount = this.oEntityList.filter(oe => oe.tags.includes('Branch')).length;
    if (this.branchCount != branchCount) {
      this.branchCount == branchCount;
      this.wrapper.component.sendNetworkBroadcastEvent(OuiInventoryEvent, {
        id: "Branch", count: branchCount });
    }
    const leafCount = this.oEntityList.filter(oe => oe.tags.includes('Leaf')).length;
    if (this.leafCount != leafCount) {
      this.leafCount == leafCount
      this.wrapper.component.sendNetworkBroadcastEvent(OuiInventoryEvent, {
        id: "Leaf", count: leafCount });
    }
    // console.log(`Branch: ${branchCount} | Leaf: ${leafCount}`);    
  }

  private getFollowPosition(player: hz.Player) {
    const position = player.position.get();
    const forward = this.player.forward.get().mul(0.5);
    return position.add(forward);
  }
}