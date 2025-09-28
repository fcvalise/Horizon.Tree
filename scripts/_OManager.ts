import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";
import { OEntityManager } from "_OEntityManager";
import { OClouds } from "_OClouds";
import { OTerrain } from "_OTerrain";
import { OEvent } from "_OEvent";
import { PlayerLocal } from "_PlayerLocal";
import { TreeBase } from "_TreeBase";
import { OFluid } from "_OFluid";
import { OInventoryManager } from "_OInventory";

export class OisifManager {
    // public static I: OisifManager; // TODO : Should be removed

    private wrapper!: OWrapper;
    public pool!: OPoolManager;
    public manager!: OEntityManager;
    public random!: ORandom;

    public inventory!: OInventoryManager;

    private cloud!: OClouds;
    private terrain!: OTerrain;
    private fuild!: OFluid;

    private treeList: TreeBase[] = [];
    
    public constructor(component: hz.Component) {
        // OisifManager.I = this;
        this.random = new ORandom('Oisif');
        this.wrapper = new OWrapper(component);
        this.pool = new OPoolManager(this.wrapper);
        this.manager = new OEntityManager(this.wrapper, this.pool);
        this.inventory = new OInventoryManager(this.wrapper, this.manager);

        this.cloud = new OClouds(this.wrapper, this.pool, this.random);
        this.terrain = new OTerrain(this.wrapper, this.manager, this.inventory, this.random, 40, 4);
        // this.wrapper.component.connectNetworkBroadcastEvent(UpdateUIBar, (payload) => {
        //     if (payload.id == 'Discovered' && payload.percent == 1 && !this.fuild) {
        //         this.fuild = new OFluid(this.wrapper, this.manager, new hz.Vec3(0, 10, 0));
        //         OEntity.melody!.useScale("mixolydian")
        //         .useKey("D")
        //         .setOctaves(1, 3)
        //         .setQuantize(true, { bpm: 300, maxPerTick: 12 });
        //     }
        // })

        this.wrapper.component.connectNetworkBroadcastEvent(OEvent.onTerrainSpawn, (payload) => {
            if (this.random.bool(0.4)) {
                const tree = new TreeBase(this.wrapper, this.manager, payload.entity.position.get());
                this.treeList.push(tree);
            }
        });
        this.wrapper.component.connectNetworkBroadcastEvent(PlayerLocal.onTouch, (payload) => {
            this.onTouch(payload.hit, payload.player);
        });
    }

    public start() {}

    private onTouch(hit: hz.EntityRaycastHit, player: hz.Player) {
        const oEntity = this.manager.get(hit.target);
        if (oEntity && !oEntity.tags.includes('Terrain')) {
            if (oEntity.makeDynamic()) {// || oEntity.entity) {
                oEntity.makePhysic();
                const physics = oEntity.entity?.as(hz.PhysicalEntity);
                if (physics) {
                    const playerPosition = player.position.get();
                    const direction = hz.Vec3.up;
                    physics.applyForce(direction.mul(5), hz.PhysicsForceMode.Impulse);
                }
            }
        }
    }
}