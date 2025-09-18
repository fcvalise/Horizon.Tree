import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";
import { OuiProgressEvent } from "_OuiProgress";
import { OColor } from "_OColor";

export class OPoolEntity {
    public isUse: boolean = false;
    public lastUse: number = Date.now();
    public isReady: boolean = false;

    constructor(public entity: hz.Entity) {}
}

export class OPoolManager {
    public staticCount = 0;
    private pool: OPoolEntity[] = [];
    private maxCount: number = 256;
    private availableCount: number = 0;

    constructor(private wrapper: OWrapper) {
        this.getReserve();
    }

    public count() {
        // return this.availableCount;
        return this.pool.filter(p => !p.isUse && p.isReady).length;
    }

    public get(): hz.Entity | undefined {
        const now = Date.now();
        let best: OPoolEntity | undefined;
        let bestAge = -1;

        for (const pEntity of this.pool) {
            if (pEntity.isUse || !pEntity.isReady) continue;
            const age = now - pEntity.lastUse;
            if (age > bestAge) {
                best = pEntity;
                bestAge = age;
            }
        }

        if (best) {
            best.isUse = true;
            best.lastUse = now;
            this.availableCount = Math.max(0, this.availableCount - 1);
            this.updateUI();
            return best.entity;
        }
        return undefined;
    }

    public async prepare(pEntity: OPoolEntity) {
        const entity = pEntity.entity;
        pEntity.isReady = false;

        entity.scale.set(hz.Vec3.zero);
        entity.simulated.set(true);
        entity.interactionMode.set(hz.EntityInteractionMode.Grabbable);
        entity.simulated.set(false);
        entity.collidable.set(true);
        entity.owner.set(this.wrapper.world.getServerPlayer());
        entity.color.set(OColor.White);
        entity.visible.set(true);
        entity.tags.set([]);
        await OUtils.waitFor(this.wrapper, () => !entity.simulated.get());
        this.availableCount++;
        pEntity.isUse = false;
        pEntity.isReady = true;
        pEntity.lastUse = Date.now();
        this.updateUI();
    }

    private async getReserve() {
        const reserve = this.wrapper.world.getEntitiesWithTags(['PoolReserve'])[0];
        const children = reserve.children.get();
        let count = 0;
        for (const child of children) {
            if (count++ >= this.maxCount) { break; }
            const pEntity = new OPoolEntity(child);
            await this.prepare(pEntity);
            this.pool.push(pEntity);
        }
    }

    public async release(entity: hz.Entity) {
        const pEntity = this.pool.find(p => p.entity == entity);
        if (pEntity && pEntity.isUse) {
            await this.prepare(pEntity);
        }
    }
    
    public getPool(): OPoolEntity[] {
        return this.pool;
    }

    private updateUI() {
        const usedCount = this.pool.length - this.availableCount;
        this.wrapper.component.sendNetworkBroadcastEvent(OuiProgressEvent, {
            id: 'DynamicLoading',
            percent: usedCount/this.pool.length*100,
            text: `${usedCount}/${this.pool.length}`
        });
        // this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
        //     id: 'Static', percent: 0, text: `Static : ${this.staticCount}`
        // });
    }
}