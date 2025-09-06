import * as hz from "horizon/core";
import { Library } from "_Library";
import { UpdateUIBar } from "UIBarController";
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";
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
        // this.createAsset();
        // this.createAsset();
        // this.createAsset();
        // this.createAsset();
        this.getReserve();
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

    public async prepare(entity: hz.Entity) {
        entity.scale.set(hz.Vec3.zero);
        if (entity.simulated.get()) {
            entity.interactionMode.set(hz.EntityInteractionMode.Physics);
        }
        entity.simulated.set(false);
        await OUtils.waitFor(this.wrapper, () => !entity.simulated.get());
        // await this.setOwner(entity);
        this.availableCount++;
        entity.tags.set([]);
        this.updateUI();
    }

    // private async setOwner(entity: hz.Entity) {
    //     const server = this.wrapper.world.getServerPlayer();
    //     if (entity.owner.get() == server) {
    //         const oisif = this.wrapper.world.getPlayers().find(p => p.name.get() == "OisifGames")!;
    //         entity.owner.set(oisif);
    //         await OUtils.waitFor(this.wrapper, () => entity.owner.get() != server);
    //     }
    // }

    private async getReserve() {
        const reserve = this.wrapper.world.getEntitiesWithTags(['PoolReserve'])[0];
        const children = reserve.children.get();
        let count = 0;
        for (const child of children) {
            if (count++ >= this.maxCount) { break; }
            const pEntity = new OPoolEntity(child);
            await this.prepare(pEntity.entity);
            this.pool.push(pEntity);
            pEntity.isUse = false;
        }
    }

    public async release(entity: hz.Entity) {
        const pEntity = this.pool.find(p => p.entity == entity);
        if (pEntity) {
            await this.prepare(entity);
            pEntity.isUse = false;
        }
    }
    
    public getPool(): OPoolEntity[] {
        return this.pool;
    }

    private updateUI() {
        const usedCount = this.pool.length - this.availableCount;
        this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
            id: 'Dynamic',
            percent: usedCount/this.pool.length,
            text: `Used : ${usedCount}/${this.pool.length}`
        });
        this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
            id: 'Static', percent: 0, text: `Static : ${this.staticCount}`
        });
    }
}