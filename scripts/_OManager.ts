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

export class OisifManager extends hz.Component<typeof OisifManager> {
    public static I: OisifManager; // TODO : Should be removed

    private wrapper!: OWrapper;
    public pool!: OPoolManager;
    public manager!: OEntityManager;
    public random!: ORandom;

    private cloud!: OClouds;
    private terrain!: OTerrain;
    
    public preStart() {
        OisifManager.I = this;
        this.random = new ORandom('Oisif');
        this.wrapper = new OWrapper(this);
        this.pool = new OPoolManager(this.wrapper);
        this.manager = new OEntityManager(this.wrapper, this.pool);

        this.cloud = new OClouds(this.wrapper, this.pool, this.random);
        this.terrain = new OTerrain(this.wrapper, this.manager, this.random, 40, 4);

        this.wrapper.component.connectNetworkBroadcastEvent(OEvent.onTerrainSpawn, (payload) => {
            if (this.random.bool(0.3)) {
                const tree = new TreeBase(this.wrapper, this.manager, payload.entity.position.get());
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
hz.Component.register(OisifManager);