import * as hz from 'horizon/core';
import { Ease, OEntity } from '_OEntity';
import { OEntityManager } from '_OEntityManager';
import { OWrapper } from '_OWrapper';

export class OInventoryManager {
  private playerMap: Map<hz.Player, OInventory> = new Map();

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
          if (distance < 4) {
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

  constructor(private wrapper: OWrapper, private player: hz.Player) { }

  public attach(oEntity: OEntity) {
    if (this.oEntityList.includes(oEntity)) return;
    const position = this.player.position.get();
    oEntity.entity?.collidable.set(false);
    oEntity.entity?.simulated.set(false);
    oEntity.moveTo(position, 0.3, false, Ease.quadInOut);
    oEntity.scaleTo(hz.Vec3.one.mul(0.2), 0.6, false, Ease.quadInOut);
    this.wrapper.component.async.setTimeout(() => {
      oEntity.playMelody();
      oEntity.makeInvisible();
    }, 500);

    // const branchCount = this.oEntityList.filter(oe => oe.tags.includes('Branch')).length;
    // const leafCount = this.oEntityList.filter(oe => oe.tags.includes('Leaf')).length;
    // console.log(`Branch: ${branchCount} | Leaf: ${leafCount}`);
    
    this.oEntityList.push(oEntity);
  }
}