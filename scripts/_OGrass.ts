import * as hz from "horizon/core";
import '_OMath';
import { OEntityManager } from "_OEntityManager";
import { OWrapper } from "_OWrapper";
import { OEntity } from "_OEntity";
import { OColor } from "_OColor";
import { ORandom } from "_ORandom";

export class OGrass {
    public oEntity: OEntity;

    constructor(private wrapper: OWrapper, private manager: OEntityManager) {
        this.oEntity = this.manager.create();
    }

    public create(position: hz.Vec3, normal: hz.Vec3 = hz.Vec3.up, radius = 0.4) {
        const random = new ORandom(position.toString());
        const n = normal.normalize();
        const aux = Math.abs(n.y) < 0.99 ? new hz.Vec3(0, 1, 0) : new hz.Vec3(1, 0, 0);
        const right = n.cross(aux).normalize();
        const fwd = right.cross(n).normalize();
        const jitter = new hz.Vec3(random.range(-0.4, 0.4), random.range(-0.075, 0.075), random.range(-0.4, 0.4));
        const look = fwd.add(jitter).normalize();
        const sx = random.range(0.2, 0.4), sy = random.range(1.0, 2.0), sz = 0.1;

        this.oEntity.position = position;
        this.oEntity.rotation = hz.Quaternion.lookRotation(look, n);
        this.oEntity.color = OColor.LightGreen;
        this.oEntity.setTags(["Grass"]);

        if (this.oEntity.makeDynamic()) {
            this.oEntity.entity?.collidable.set(false);
            this.oEntity.playMelody();
            this.oEntity.scale = hz.Vec3.zero;
            this.oEntity.tweenTo({
                duration: 0.8,
                scale: new hz.Vec3(sx, sy, sz),
                makeStatic: true
            });
        } else {
            this.oEntity.scale = new hz.Vec3(sx, sy, sz);
        }
    }
}
