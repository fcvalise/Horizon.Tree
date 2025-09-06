import * as hz from "horizon/core";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

export class OEntityManager {
    private allList: OEntity[] = [];
    private physicsPreSleepTimer: Map<OEntity, number> = new Map();
    private readonly preSleepDuration = 0.3;

    constructor(private wrapper: OWrapper, private pool: OPoolManager) {
        this.wrapper.onUpdate((dt) => this.update(dt));
    }

    public hasAvailable(): boolean {
        return this.pool.count() > 0;
    }

    public create(): OEntity {
        const oEntity = new OEntity(undefined, this.wrapper, this.pool);
        this.allList.push(oEntity);
        return oEntity;
    }

    public get(entity: hz.Entity): OEntity | undefined {
        const staticOE = this.allList.find(oe => oe.staticProxy == entity);
        if (staticOE) {
            return staticOE;
        }
        const dynamicOE = this.allList.find(oe => oe.entity == entity);
        if (dynamicOE) {
            return dynamicOE;
        }
        return undefined;
    }

    public delete(oEntity: OEntity) {
        if (this.allList.includes(oEntity)) {
            this.allList.slice(this.allList.indexOf(oEntity));
        }
    }

    private update(dt: number) {
        for (const oEntity of this.allList) {
            this.fallingObject(oEntity);
            this.sleepPhysics(oEntity, dt);
        }
    }

    public fallingObject(oEntity: OEntity) {
        if (oEntity.position.y < -10) {
            oEntity.makeInvisible();
        }
    }

    public sleepPhysics(oEntity: OEntity, dt: number) {
        if (oEntity.isPhysics) {
            if (!this.physicsPreSleepTimer.has(oEntity)) {
                this.physicsPreSleepTimer.set(oEntity, 0);
            }
            const physics = oEntity.entity?.as(hz.PhysicalEntity);
            if (physics) {
                const velocity = physics.velocity.get().length()!;
                let timer = this.physicsPreSleepTimer.get(oEntity)!;
                if (velocity > 0.1) {
                    timer = this.preSleepDuration;
                }
                if (physics && velocity < 0.1) {
                    timer += dt;
                    if (timer > this.preSleepDuration) {
                        // oEntity.makeStatic();
                        oEntity.makeInvisible();
                        this.physicsPreSleepTimer.delete(oEntity);
                    }
                }
                this.physicsPreSleepTimer.set(oEntity, timer);
            }
        }
    }
}