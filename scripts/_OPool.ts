import * as hz from "horizon/core";
import { Library } from "_Library";
import { UpdateUIBar } from "UIBarController";
import { OWrapper } from "_OWrapper";
// import { OEntity } from "_OEntity";

export class OPoolEntity {
    public isUse: boolean = false;
    public lastUse: number = Date.now();

    constructor(public entity: hz.Entity) {}
}

export class OPoolManager {
    public static staticCount = 0;
    private pool: OPoolEntity[] = [];
    private maxCount: number = 500;

    constructor(private wrapper: OWrapper) {
        this.createAsset();
        this.createAsset();
        this.createAsset();
        this.createAsset();
    }

    public get(): hz.Entity | undefined {
        const pEntity = this.pool.find(e => !e.isUse);
        if (pEntity) {
            pEntity.lastUse = Date.now();
            pEntity.isUse = true;
            this.updateUI();
            return pEntity.entity;
        }
        return undefined;
    }

    private async createAsset() {
        const asset = new hz.Asset(BigInt(Library.matter));
        const position = new hz.Vec3(Math.random() * 300, 1000, Math.random() * 300);
        const rotation = hz.Quaternion.zero;
        const scale = hz.Vec3.one;
        const promise = await this.wrapper.world.spawnAsset(asset, position, rotation, scale);
        const entity = promise[0];
        const pEntity = new OPoolEntity(promise[0]);

        entity.interactionMode.set(hz.EntityInteractionMode.Physics);
        entity.simulated.set(false);
        pEntity.isUse = false;
        this.pool.push(pEntity);
        this.updateUI();

        if (this.pool.length < this.maxCount) {
            this.createAsset();
        }
    }

    public release(entity: hz.Entity) {
        const poolObject = this.pool.find(p => p.entity == entity);
        if (poolObject) {
            poolObject.isUse = false;
            poolObject.entity.scale.set(hz.Vec3.zero);
            poolObject.entity.position.set(this.wrapper.entity.position.get());
        }
        this.updateUI();
    }

    public getPool(): OPoolEntity[] {
        return this.pool;
    }

    private updateUI() {
        let used = 0;
        for (const pEntity of this.pool) { if (pEntity.isUse) used++; }
        const percent = this.pool.length > 0 ? (used / this.pool.length) : 0;
        this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
            id: 'PoolValue', percent: percent, current: used, total: this.pool.length
        });
    }
}