import * as hz from "horizon/core";
import "./_OMath";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

export class OEntityManager {
    public allList: OEntity[] = []; // TODO : Should be back to private
    private physicsPreSleepTimer: Map<OEntity, number> = new Map();
    private readonly preSleepDuration = 0.3;
    public sleepList: OEntity[] = [];

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
        const idx = this.allList.indexOf(oEntity);
        if (idx !== -1) this.allList.splice(idx, 1);
    }

    private update(dt: number) {
        const player = this.wrapper.world.getPlayers()[0];
        const position = player.position.get();
        for (const oEntity of this.allList) {
            for (const otherEntity of this.allList) {
                if (oEntity != otherEntity) {
                    if (oEntity.entity && otherEntity.entity) {
                        if (oEntity.entity == otherEntity.entity) {
                            console.error(`${oEntity.tags.join(',')} /!\\ ${otherEntity.tags.join(',')}`);
                        }
                    }
                }
            }
            // oEntity.isUpdated = position.distanceSquared(oEntity.position) < 100;
            this.fallingObject(oEntity);
            // this.sleepPhysics(oEntity, dt);
        }
    }

    public fallingObject(oEntity: OEntity) {
        if (oEntity.position.y < -10) {
            oEntity.makeInvisible();
            this.delete(oEntity);
        }
    }

    public sleepPhysics(oEntity: OEntity, dt: number) {
        if (oEntity.isPhysics && oEntity.isAutoSleep) {
            if (!this.physicsPreSleepTimer.has(oEntity)) {
                this.physicsPreSleepTimer.set(oEntity, 0);
            }
            const physics = oEntity.entity?.as(hz.PhysicalEntity);
            if (physics) {
                const velocity = physics.velocity.get().length()!; // TODO : Probably the accessor is expensive
                let timer = this.physicsPreSleepTimer.get(oEntity)!;
                if (velocity > 0.1) {
                    timer = this.preSleepDuration;
                }
                if (physics && velocity < 0.1) {
                    timer += dt;
                    if (timer > this.preSleepDuration) {
                        // oEntity.makeStatic();
                        // oEntity.makeInvisible();
                        oEntity.playMelody();
                        this.physicsPreSleepTimer.delete(oEntity);
                        this.sleepList.push(oEntity);
                    }
                }
                this.physicsPreSleepTimer.set(oEntity, timer);
            }
        }
    }
}