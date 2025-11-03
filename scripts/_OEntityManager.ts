import * as hz from "horizon/core";
import "./_OMath";
import { Ease, OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

export class OEntityManager {
    private allList: OEntity[] = []; // TODO : Should be back to private
    private physicsPreSleepTimer: Map<OEntity, number> = new Map();
    private readonly preSleepDuration = 0.3;

    public collectibleList: OEntity[] = [];
    public sleepList: OEntity[] = [];
    public hiveList: OEntity[] = [];

    private readonly isDebug = false;

    // ────────────────────────────────────────────────────────────────────────────
    // Tag indexer (fast lookups + incremental maintenance)
    // ────────────────────────────────────────────────────────────────────────────
    private tagToSet: Map<string, Set<OEntity>> = new Map();
    private tagToArrayCache: Map<string, OEntity[]> = new Map(); // arrays rebuilt lazily per dirty tag
    private dirtyTags: Set<string> = new Set();                  // which tags' array cache is stale
    private prevTagKey: WeakMap<OEntity, string> = new WeakMap(); // snapshot "a|b|c"
    private reindexCursor = 0;
    private reindexBudgetPerFrame = 64; // tune for your world size

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
        this.indexInsert(oEntity); // index immediately
        return oEntity;
    }

    public async makeCollectible(oEntity: OEntity) {
        oEntity.isCollectible = true;
        if (!this.collectibleList.includes(oEntity)) {
            this.collectibleList.push(oEntity);
        }
        this.indexMaybeRefresh(oEntity); // in case tween adds/removes tags elsewhere
    }

    public removeCollectible(oEntity: OEntity) {
        oEntity.isCollectible = false;
        this.collectibleList.splice(this.collectibleList.indexOf(oEntity), 1);
    }

    public get(entity: hz.Entity): OEntity | undefined {
        const staticOE = this.allList.find(oe => oe.staticProxy == entity);
        if (staticOE) return staticOE;
        const dynamicOE = this.allList.find(oe => oe.entity == entity);
        if (dynamicOE) return dynamicOE;
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
        const collectibleIdx = this.collectibleList.indexOf(oEntity);
        if (collectibleIdx !== -1) this.collectibleList.splice(collectibleIdx, 1);

        // remove from tag index
        this.indexRemove(oEntity);
    }

    private update(dt: number) {
        if (OEntity.actionCount > 512) {
            console.error(`512 action send by OEntity`);
        } else {
            // console.log(`${OEntity.actionCount} sent by OEntity`);
        }
        OEntity.actionCount = 0
        // Maintenance
        for (const oEntity of this.allList) {
            this.fallingObject(oEntity);
            // this.sleepPhysics(oEntity, dt);
        }

        // Incremental tag re-indexing to catch tag changes you didn't explicitly mark
        this.incrementalReindex();
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
                const velocity = physics.velocity.get().length()!;
                let timer = this.physicsPreSleepTimer.get(oEntity)!;
                if (velocity > 0.1) {
                    timer = this.preSleepDuration;
                }
                if (physics && velocity < 0.1) {
                    timer += dt;
                    if (timer > this.preSleepDuration) {
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
            //   const tagCounts: Record<string, number> = {};
            //   this.tagToSet.forEach((set, tag) => {
            //       tagCounts[tag] = set.size;
            //   })
            // Check lost pool entity
            let lostCount = 0;
            for (const p of this.pool.getPool()) {
                const oe = this.allList.find(oe => oe.entity == p.entity);
                if (p.isUse && !oe) {
                    lostCount++;
                }
            }
            //   const parts = Object.entries(tagCounts).map(([tag, count]) => `${tag[0]}:${count}`);
            //   console.log(`OEManager (${parts.join("|")}) Lost : ${lostCount}`);
            console.log(`OEManager (Lost : ${lostCount}`);

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
        }, 1000);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Public API — fast lookups
    // ────────────────────────────────────────────────────────────────────────────

    /** Get a Set view (no allocations): best for hot paths. */
    public getTagSet(tag: string): ReadonlySet<OEntity> {
        return this.tagToSet.get(tag) ?? new Set();
    }

    /** Get an Array view; cached and rebuilt only if that tag was dirtied. */
    public getTagArray(tag: string): ReadonlyArray<OEntity> {
        if (!this.tagToSet.has(tag)) return [];
        if (this.dirtyTags.has(tag)) {
            const set = this.tagToSet.get(tag)!;
            this.tagToArrayCache.set(tag, Array.from(set));
            this.dirtyTags.delete(tag);
        }
        return this.tagToArrayCache.get(tag) ?? [];
    }

    /** Snapshot of all tags → arrays; only dirty tags cost allocations. */
    public getTagDictionary(): ReadonlyMap<string, ReadonlyArray<OEntity>> {
        this.dirtyTags.forEach((tag) => {
            const set = this.tagToSet.get(tag);
            if (set) this.tagToArrayCache.set(tag, Array.from(set));
        });
        this.dirtyTags.clear();
        return this.tagToArrayCache;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Tag index maintenance
    // ────────────────────────────────────────────────────────────────────────────

    /** Call this if you KNOW an entity's tags changed (best performance). */
    public indexMaybeRefresh(oEntity: OEntity) {
        const currentKey = this.tagsKey(oEntity);
        const prevKey = this.prevTagKey.get(oEntity);
        if (currentKey !== prevKey) {
            this.indexReplace(oEntity, prevKey, currentKey);
            this.prevTagKey.set(oEntity, currentKey);
        }
    }

    /** Immediate insert on create. */
    private indexInsert(oEntity: OEntity) {
        const key = this.tagsKey(oEntity);
        this.prevTagKey.set(oEntity, key);
        for (const tag of oEntity.tags) {
            let set = this.tagToSet.get(tag);
            if (!set) this.tagToSet.set(tag, (set = new Set()));
            if (!set.has(oEntity)) {
                set.add(oEntity);
                this.dirtyTags.add(tag);
            }
        }
    }

    /** Immediate remove on delete. */
    private indexRemove(oEntity: OEntity) {
        const prevKey = this.prevTagKey.get(oEntity);
        if (!prevKey) return;

        this.tagToSet.forEach((set, tag) => {
            if (set.delete(oEntity)) this.dirtyTags.add(tag);
            if (set.size === 0) {
                this.tagToSet.delete(tag);
                this.tagToArrayCache.delete(tag);
                this.dirtyTags.delete(tag);
            }
        });
        this.prevTagKey.delete(oEntity);
    }

    /** Replace old tag set with new tag set for an entity. */
    private indexReplace(oEntity: OEntity, prevKey?: string, nextKey?: string) {
        const prev = prevKey ? prevKey.split("|") : [];
        const next = nextKey ? nextKey.split("|") : oEntity.tags;

        // Remove tags no longer present
        for (const tag of prev) {
            if (tag.length === 0) continue;
            if (!next.includes(tag)) {
                const set = this.tagToSet.get(tag);
                if (set && set.delete(oEntity)) {
                    this.dirtyTags.add(tag);
                    if (set.size === 0) {
                        this.tagToSet.delete(tag);
                        this.tagToArrayCache.delete(tag);
                        this.dirtyTags.delete(tag);
                    }
                }
            }
        }
        // Add new tags
        for (const tag of next) {
            if (tag.length === 0) continue;
            if (!prev.includes(tag)) {
                let set = this.tagToSet.get(tag);
                if (!set) this.tagToSet.set(tag, (set = new Set()));
                if (!set.has(oEntity)) {
                    set.add(oEntity);
                    this.dirtyTags.add(tag);
                }
            }
        }
    }

    /** Round-robin incremental scan to catch unmarked tag changes. */
    private incrementalReindex() {
        if (this.allList.length === 0) return;

        let budget = this.reindexBudgetPerFrame;
        const n = this.allList.length;
        while (budget-- > 0 && n > 0) {
            this.reindexCursor = (this.reindexCursor + 1) % n;
            const oe = this.allList[this.reindexCursor];
            const currentKey = this.tagsKey(oe);
            const prevKey = this.prevTagKey.get(oe);
            if (currentKey !== prevKey) {
                this.indexReplace(oe, prevKey, currentKey);
                this.prevTagKey.set(oe, currentKey);
            }
        }
    }

    /** Compact, order-insensitive key for quick diff without allocations per frame. */
    private tagsKey(oEntity: OEntity): string {
        // We assume oEntity.tags is a string[] (as used in your debug code).
        // Sorting makes it order-insensitive; join is cheap and stable.
        // If tags are already stable order, you can drop sort() for speed.
        return oEntity.tags.length ? oEntity.tags.slice().sort().join("|") : "";
    }
}
