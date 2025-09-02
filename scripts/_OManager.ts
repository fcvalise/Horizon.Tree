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
                const tree = new TreeBase(this.wrapper, payload.entity.position.get());
            }
        });
        this.wrapper.component.connectNetworkBroadcastEvent(PlayerLocal.onTouch, (payload) => {
            const oEntity = this.manager.get(payload.hit.target);
            if (oEntity) {
                oEntity.makePhysic();
            }
        });
    }

    public start() {}
}
hz.Component.register(OisifManager);