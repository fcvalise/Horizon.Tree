import * as hz from "horizon/core";
import "./_OMath";
import { Ease, OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OColor } from "_OColor";
import { CellSettings } from "_OCell";
import { ORandom } from "_ORandom";
import { LayerType } from "horizon/core";
import { Vec3 } from "horizon/core";
import { Color } from "horizon/core";
import { RaycastTargetType } from "horizon/core";
import { EntityRaycastHit } from "horizon/core";
import { OUtils } from "_OUtils";
import { OGrass } from "_OGrass";


export class OFloor {
    private readonly cellSize = 5;
    private readonly maxDistance = 25

    public oEntity: OEntity | undefined;

    public hidden: boolean = false;
    public revealed: boolean = false;
    public expanded: boolean = false;
    public fertilized: boolean = false;

    public position: hz.Vec3;
    public rotation: hz.Quaternion;
    public scale: hz.Vec3;
    public color: hz.Color;

    constructor(
        private wrapper: OWrapper,
        public settings: CellSettings,
    ) {
        const half = -settings.gridSize * this.cellSize * 0.5 - this.cellSize * 0.5;
        const startPos = new hz.Vec3(half, 0, half);
        const perlin = settings.random.perlin;
        const x = settings.gx;
        const z = settings.gz;

        let noise = perlin.ridged2(x * 0.2, z * 0.2);
        // position
        const posX = x * this.cellSize + this.cellSize * 0.5;
        let posY = this.easeInExpo(noise) * 4;
        if (settings.index == 0) posY = 1; // TODO : Dont know why I need to force that
        const posZ = z * this.cellSize + this.cellSize * 0.5;
        this.position = new hz.Vec3(posX, posY, posZ).add(startPos);
        this.position = this.position.add(this.position.mul(0.2));
        // rotation
        const lookAtDir = hz.Vec3.down.mul(10).add(settings.random.vectorHalf());
        const twist = lookAtDir.rotateArround(settings.random.range(0, 360), lookAtDir);
        this.rotation = hz.Quaternion.lookRotation(twist);
        // scale
        const scaleXZRandom = settings.random.next() * 0.5;
        let scaleX = 8 * (1.5 - noise + scaleXZRandom);
        let scaleY = 8 * (1.5 - noise + scaleXZRandom);
        
        const scaleZ = 100;
        let scale = new hz.Vec3(scaleX, scaleY, scaleZ);
        this.scale = scale.add(hz.Vec3.one.mul(Math.max(settings.index, 1) / 20)); // make bigger as its far
        if (settings.index == 0) this.scale = this.scale.mul(2); // TODO : Dont know why I need to force that
        // color
        this.color = OColor.LightGreen;
        
        const distance = hz.Vec3.zero.distance(this.position) / this.maxDistance;
        noise -= distance * distance * 0.5;
        if (noise > 0.2 && !this.isObject()) {
            this.hidden = false;
        } else {
            this.hidden = true;
        }
    }

    private isObject(): boolean {
        return false;
        const posArray = [new hz.Vec3(0, 0, 0), new hz.Vec3(1, 0, 1), new hz.Vec3(-1, 0, 1), new hz.Vec3(-1, 0, -1), new hz.Vec3(1, 0, -1)]
        for (let index = 0; index < posArray.length; index++) {
            const position = this.position.add(hz.Vec3.up.mul(10)).add(posArray[index].mul(this.scale.x * 0.5));
            const raycast = this.wrapper.entity.as(hz.RaycastGizmo);
            const raycastHit = raycast.raycast(position, hz.Vec3.down, {
                layerType: LayerType.Objects,
                maxDistance: 20,
                stopOnFirstHit: false
            });
            if (raycastHit) {
                // const oEntity = this.settings.manager.create()
                // oEntity.position = this.position.add(hz.Vec3.up.mul(10));
                // oEntity.rotation = hz.Quaternion.lookRotation(hz.Vec3.down);
                // oEntity.scale = new hz.Vec3(0.1, 0.1, 10);
                // oEntity.color = raycastHit ? Color.green : Color.red;
                // if (oEntity.makeDynamic()) {
                // } else {
                //     this.wrapper.setInterval(() => {oEntity.makeDynamic();}, 1)
                // }
                // console.log((raycastHit as hz.EntityRaycastHit).target.name.get());
                
                return true;
            }
        }
        return false;
    }

    public reveal(): boolean {
        if (this.revealed || this.hidden) return false;
        this.oEntity = this.settings.manager.create()
        this.oEntity.position = this.position.add(this.settings.random.vector());
        this.oEntity.rotation = this.rotation;
        this.oEntity.color = OColor.White;
        this.oEntity.setTags(['Terrain', 'Walkable']);
        if (this.oEntity.makeDynamic()) {
            this.oEntity.playMelody();
            this.oEntity.scale = hz.Vec3.zero;
            this.oEntity.tweenTo({
                duration: 0.8,
                scale: this.scale.mul(0.5),
                makeStatic: false
            })
            this.revealed = true;
            return true;
        } else {
            this.revealed = false;
            this.settings.manager.delete(this.oEntity);
        }
        return false;
    }
    
    public expand() {
        this.expanded = true;
        if (this.oEntity) {
            this.oEntity.rotation = this.rotation;
            this.oEntity.scale = this.scale.mul(0.5);
            this.oEntity.color = OColor.White;
            if (this.oEntity.makeDynamic()) {
                this.oEntity.playMelody();
                this.oEntity.tweenTo({
                    duration: 0.4,
                    position: this.position,
                    scale: this.scale,
                    color: OColor.Orange,
                    ease: Ease.quadInOut,
                    makeStatic: false
                })
            } else {
                this.expanded = false;
            }
        }
    }

    public async fertilize() {
        console.log('fertilize');
        await OUtils.waitFor(this.wrapper, () => this.oEntity?.isTweening() == false)
        if (this.oEntity) {
            this.oEntity.tweenTo({
                duration: 0.4,
                color: OColor.DarkGreen,
                ease: Ease.quadInOut,
                makeStatic: true
            })
        }
    }

    private easeInExpo(x: number): number {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }
}