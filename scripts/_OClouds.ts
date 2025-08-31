import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";
import { OPoolEntity, OPoolManager } from "_OPool";
import { ORandom } from "_ORandom";
import { } from "_OMath"

export class Cloud {
    public speed: number = 1;
    constructor(
        public position: hz.Vec3,
        public entity: hz.Entity,
        public wasUse: boolean = false
    ) {}
}

export class OClouds {
    private readonly speedRange = { min: 1, max: 4};
    private readonly positionRange = { min: 480, max: 4120};
    private readonly scaleXRange = { min: 6, max: 12};
    private readonly scaleYRange = { min: 4, max: 8};

    private map: WeakMap<OPoolEntity, Cloud> = new WeakMap();

    constructor(private wrapper: OWrapper, private pool: OPoolManager, private random: ORandom) {
        // wrapper.onUpdate((dt) => this.update(dt))
    }

    private update(dt: number) {
        const pool = this.pool.getPool();
        for (const pEntity of pool) {
            if (!this.map.has(pEntity)) {
                this.map.set(pEntity, new Cloud(hz.Vec3.zero, pEntity.entity, true));
            }
            const cloud = this.map.get(pEntity);
            if (cloud) {
                if (!pEntity.isUse) {
                    if (cloud.wasUse) {
                        cloud.wasUse = false;
                        this.set(cloud);
                    }
                    // this.rotate(cloud, dt);
                } else {
                    cloud.wasUse = true;
                }
            }
        }
    }

    private rotate(cloud: Cloud, dt: number) {
        cloud.position = cloud.position.rotateArround(dt * cloud.speed);
        cloud.entity.position.set(cloud.position);
        cloud.entity.rotation.set(hz.Quaternion.lookRotation(cloud.position.mul(-1)));
    }

    private set(cloud: Cloud) {
        const distance = this.random.range(this.positionRange.min, this.positionRange.max);
        const position = this.random.vectorHalf().normalize().mul(distance);
        const rotation = hz.Quaternion.lookRotation(position.mul(-1));
        const x = this.random.range(this.scaleXRange.min, this.scaleXRange.max);
        const y = this.random.range(this.scaleYRange.min, this.scaleYRange.max);
        const scale = new hz.Vec3(x, y, 1);
        const speed = this.random.range(this.speedRange.min, this.speedRange.max);
        
        cloud.position = position;
        cloud.speed = speed;
        cloud.entity.position.set(position);
        cloud.entity.rotation.set(rotation);
        cloud.entity.scale.set(scale);
        cloud.entity.as(hz.MeshEntity).style.tintColor.set(hz.Color.white);
    }
}