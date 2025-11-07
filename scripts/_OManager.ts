import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";
import { OEntityManager } from "_OEntityManager";
import { OClouds } from "_OClouds";
import { OTerrain } from "_OTerrain";
import { OEvent } from "_OEvent";
import { TreeBase } from "_TreeBase";
import { OFluid } from "_OFluid";
import { OInventoryManager } from "_OInventory";
import { PlayerEvent } from "_PlayerEvent";
import { OTriggerPool } from "_OTriggerPool";
import { OInteractableManager } from "_OInteractableManager";
import { OBee } from "_OBee";
import { OBeeHive } from "OBeeHive";
import { OGrid } from "_OGrid";
import { getLocalizableTextFromRepresentation } from "HorizonI18nUtils";
import { OMerge } from "_OMerge";
import { ODrop } from "_ODrop";
import { OScore } from "_OScore";
import { OColor } from "_OColor";
import { OBoatBuilder } from "_OBoat";
import { ORaft } from "_ORaft";

export class OisifManager {
    // public static I: OisifManager; // TODO : Should be removed

    private wrapper!: OWrapper;
    public pool!: OPoolManager;
    public manager!: OEntityManager;
    public random!: ORandom;

    public interactable!: OInteractableManager;
    public trigger!: OTriggerPool;
    public inventory!: OInventoryManager;

    private grid!: OGrid;

    private cloud!: OClouds;
    // private terrain!: OTerrain;
    private fluid!: OFluid;

    private treeList: TreeBase[] = [];
    
    public constructor(component: hz.Component) {
        // OisifManager.I = this;
        this.random = new ORandom('Oisif');
        this.wrapper = new OWrapper(component);
        this.pool = new OPoolManager(this.wrapper);
        this.manager = new OEntityManager(this.wrapper, this.pool);
        this.inventory = new OInventoryManager(this.wrapper, this.manager);
        this.interactable = new OInteractableManager(this.wrapper, this.inventory);
        this.trigger = new OTriggerPool(this.wrapper, this.interactable, this.inventory);

        this.cloud = new OClouds(this.wrapper, this.pool, this.random);
        // this.terrain = new OTerrain(this.wrapper, this.manager, this.inventory, this.interactable, this.random, 40, 5);
        this.grid = new OGrid(this.wrapper, this.manager, this.inventory, this.interactable, this.random);

        new OMerge(this.wrapper, this.manager);
        new OScore(this.wrapper);

        this.wrapper.setTimeout(() => {
            const raft = new ORaft(this.wrapper, hz.Vec3.forward.mul(5), this.manager);
            raft.rebuild();
            this.wrapper.setTimeout(() => {
                this.wrapper.onUpdate((dt) => {
                    raft.translate(hz.Vec3.forward.mul(dt))
                })
            } , 5);
        } , 5);

        
        // this.fluid = new OFluid(this.wrapper, this.manager, new hz.Vec3(0, 10, 0));
        // this.wrapper.setTimeout(() => {
        // } , 5);

        // this.wrapper.component.connectNetworkBroadcastEvent(OuiProgressEvent, (payload) => {
        //     if (payload.id == 'Discovered' && payload.percent == 1 && !this.fluid) {
        //         this.fluid = new OFluid(this.wrapper, this.manager, new hz.Vec3(0, 10, 0));
        //         OEntity.melody!.useScale("mixolydian")
        //         .useKey("D")
        //         .setOctaves(1, 3)
        //         .setQuantize(true, { bpm: 300, maxPerTick: 12 });
        //     }
        // })

        // this.wrapper.component.connectNetworkBroadcastEvent(OEvent.onTerrainSpawn, (payload) => {
        //     const oEntity = this.manager.get(payload.entity);
        //     if (!oEntity) return;
        //     const terrainPosition = payload.entity.position.get();
        //     const terrainScale = payload.entity.scale.get();
        //     const treePosition = new hz.Vec3(
        //         terrainPosition.x + this.random.range(-terrainScale.x * 0.25, terrainScale.x * 0.25),
        //         terrainPosition.y,
        //         terrainPosition.z + this.random.range(-terrainScale.y * 0.25, terrainScale.y * 0.25) 
        //     )
        //     if (hz.Vec3.zero.distance(treePosition) < 7) return;
        //     const tree = new TreeBase(this.wrapper, this.manager, this.interactable, treePosition);
        //     this.treeList.push(tree);
            
        //     const rootOEntity = tree.getUnlockableOEntity();
        //     const dispose = this.interactable.add(rootOEntity, 2, 'Grow Tree', (player) => {
        //         if (this.inventory.get(player)?.has(1)) {
        //             tree.startGrowth();
        //             this.inventory.get(player)?.consume(1, rootOEntity);
        //             this.wrapper.component.async.setTimeout(() => dispose(), 0);
        //         }
        //     });
        // });
        this.wrapper.component.connectNetworkBroadcastEvent(PlayerEvent.onTouch, (payload) => {
            this.onTouch(payload.hit, payload.player);
        });

        // new OBeeHive(this.wrapper, hz.Vec3.up, this.manager, { levels: 3 });

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