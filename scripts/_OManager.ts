import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";
import { OClouds } from "_OClouds";
import { OEntityManager } from "_OEntityManager";
import { OTerrain } from "_OTerrain";

export class OisifManager extends hz.Component<typeof OisifManager> {
    public static I: OisifManager;

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
        this.terrain = new OTerrain(this.wrapper, this.manager, this.random, 20, 4);
    }

    public start() {}
}
hz.Component.register(OisifManager);