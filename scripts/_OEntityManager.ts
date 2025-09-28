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

    private readonly isDebug = false;

    constructor(private wrapper: OWrapper, private pool: OPoolManager) {
        this.wrapper.onUpdate((dt) => this.update(dt));
        this.logDebug();
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
        if (idx !== -1) {
            if (oEntity.entity) {
                oEntity.cancelTweens();
                this.pool.release(oEntity.entity);
            }
            this.allList.splice(idx, 1);
        }
        this.physicsPreSleepTimer.delete(oEntity);
        const sleepIdx = this.sleepList.indexOf(oEntity);
        if (sleepIdx !== -1) this.sleepList.splice(sleepIdx, 1);
    }

    private update(dt: number) {
        // const player = this.wrapper.world.getPlayers()[0];
        // const position = player.position.get();

        for (const oEntity of this.allList) {
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

    private logDebug() {
        if (!this.isDebug) return;
        this.wrapper.component.async.setInterval(() => {
            const tagCounts: Record<string, number> = {};
            for (const oe of this.allList) {
                for (const tag of oe.tags) {
                    if (oe.isDynamic) {
                        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
                    }
                }
            }
            // Check lost pool entity
            let lostCount = 0;
            for (const p of this.pool.getPool()) {
                const oe = this.allList.find(oe => oe.entity == p.entity);
                if (p.isUse && !oe) {
                    lostCount++;
                    // this.pool.release(p.entity);
                }
            }
            const parts = Object.entries(tagCounts).map(([tag, count]) => `${tag[0]}:${count}`);
            console.log(`OEManager (${parts.join("|")}) Lost : ${lostCount}`);

            
            // Check duplicates
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
            }
        }, 1000)
    }
}