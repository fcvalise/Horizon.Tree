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
    public staticCount = 0;
    private pool: OPoolEntity[] = [];
    private maxCount: number = 256;
    private availableCount: number = 0;

    constructor(private wrapper: OWrapper) {
        this.createAsset();
        this.createAsset();
        this.createAsset();
        this.createAsset();
        // this.getReserve();
    }

    public count() {
        return this.availableCount;
    }

    public get(): hz.Entity | undefined {
        const pEntity = this.pool.find(e => !e.isUse);
        if (pEntity) {
            pEntity.lastUse = Date.now();
            pEntity.isUse = true;
            this.availableCount--;
            this.updateUI();
            return pEntity.entity;
        }
        return undefined;
    }

    private getReserve() {
        const reserve = this.wrapper.world.getEntitiesWithTags(['PoolReserve'])[0];
        const children = reserve.children.get();
        for (const child of children) {
            const pEntity = new OPoolEntity(child);
            child.interactionMode.set(hz.EntityInteractionMode.Physics);
            child.simulated.set(false);
            pEntity.isUse = false;
            this.pool.push(pEntity);
            this.availableCount++;
            this.updateUI();
        }
    }

    private async createAsset() {
        const asset = new hz.Asset(BigInt(Library.matter));
        const position = new hz.Vec3(Math.random() * 300, 1000, Math.random() * 300);
        const rotation = hz.Quaternion.zero;
        const scale = hz.Vec3.one;
        const promise = await this.wrapper.world.spawnAsset(asset, position, rotation, scale);
        const entity = promise[0];
        const pEntity = new OPoolEntity(entity);

        entity.interactionMode.set(hz.EntityInteractionMode.Physics);
        entity.simulated.set(false);
        pEntity.isUse = false;
        this.pool.push(pEntity);
        this.availableCount++;
        this.updateUI();

        if (this.pool.length < this.maxCount) {
            this.createAsset();
        }
    }

    public release(entity: hz.Entity) {
        const pEntity = this.pool.find(p => p.entity == entity);
        if (pEntity) {
            pEntity.isUse = false;
            pEntity.entity.scale.set(hz.Vec3.zero);
            this.availableCount++;
        }
        this.updateUI();
    }

    public getPool(): OPoolEntity[] {
        return this.pool;
    }

    private updateUI() {
        this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
            id: 'Dynamic',
            percent: this.availableCount/this.pool.length,
            text: `Used : ${this.availableCount}/${this.pool.length}`
        });
        this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
            id: 'Static', percent: 0, text: `Static : ${this.staticCount}`
        });
    }
}