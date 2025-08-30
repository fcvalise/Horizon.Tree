import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";
import { OPoolEntity, OPoolManager } from "_OPool";
import { ORandom } from "_ORandom";

export class OClouds {
    private map: Map<OPoolEntity, boolean> = new Map();

    constructor(private wrapper: OWrapper, private pool: OPoolManager, private random: ORandom) {
        wrapper.onUpdate((dt) => this.update(dt))
    }

    private update(dt: number) {
        const pool = this.pool.getPool();
        for (const pEntity of pool) {
            if (!pEntity.isUse) {
                if (!this.map.has(pEntity)) {
                    this.map.set(pEntity, true);
                }
                const need = this.map.get(pEntity);
                if (need) {
                    this.set(pEntity.entity);
                    this.map.set(pEntity, false);
                }
            } else {
                if (this.map.has(pEntity)) {
                    this.map.set(pEntity, true);
                }
            }
        }
    }

    private set(entity: hz.Entity) {
        const position = this.random.vectorHalf().normalize().mul(this.random.range(80, 100));
        const rotation = hz.Quaternion.lookRotation(position.mul(-1));
        const scale = new hz.Vec3(this.random.range(6, 10), this.random.range(4, 6), 1);

        entity.position.set(position);
        entity.rotation.set(rotation);
        entity.scale.set(scale);
        entity.as(hz.MeshEntity).style.tintColor.set(hz.Color.white);
    }
}