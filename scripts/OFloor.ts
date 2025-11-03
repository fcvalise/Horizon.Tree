import * as hz from "horizon/core";
import "./_OMath";
import { Ease, OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OColor } from "_OColor";
import { CellSettings } from "_OCell";
import { ORandom } from "_ORandom";


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
        if (noise > 0.2) {
            this.hidden = false;
        } else {
            this.hidden = true;
        }
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
                    color: OColor.DarkGreen,
                    ease: Ease.quadInOut,
                    delay: 1.3,
                    makeStatic: true
                })
            } else {
                this.expanded = false;
            }
        }
    }

    public async fertilize() {
        console.log('fertilize');
        
        const random = new ORandom('');
        for (let index = 0; index < 10; index++) {
            this.wrapper.setTimeout(() => {
                this.createGrass(random);
            }, random.range(1, 3));
        }
    }
    
    public createGrass(random: ORandom) {
        const oEntity = this.settings.manager.create()
        // choose an up hint (surface normal if you have it)
        const up = this.rotation.getForward().mul(-1);

        // make the grass right-axis point radially outward from the tile center
        let desiredRight = this.position.sub(this.position);      // from center to blade
        // ensure it's perpendicular to up (project out any up component)
        desiredRight = desiredRight.sub(up.mul(desiredRight.dot(up)));

        // guard against degenerate case (if desiredRight was ~parallel to up)
        if (desiredRight.length2() < 1e-6) {
        desiredRight = this.oEntity?.rotation.getRight() ?? new hz.Vec3(1,0,0);
        }

        const rightDir = desiredRight.normalize();
        const fwdDir   = rightDir.cross(up).normalize();
        const randomized = fwdDir.add(random.vectorHalf(fwdDir));
        
        // const baseRot = hz.Quaternion.lookRotation(fwdDir, up);
        // const yaw = hz.Quaternion.fromAxisAngle(up, random.range(0, 360));
        // oEntity.rotation = yaw.mul(baseRot);// so cross(up, fwd) == right

        oEntity.rotation = hz.Quaternion.lookRotation(randomized, up);

        const scale = new hz.Vec3(random.range(0.3, 0.6), random.range(1, 2), 0.1);
        const distance = random.range(0, this.scale.x * 0.4);
        const angle = random.range(0, 360);
        const right = this.oEntity?.rotation.getRight()!.mul(distance)!;
        const forward = this.oEntity?.rotation.getForward()!;
        const position = this.position.add(right.rotateArround(angle, forward))
        oEntity.position = position;// this.position.add(this.settings.random.vectorHalf());
        // oEntity.rotation = hz.Quaternion.lookRotation(hz.Vec3.up.mul(2).add(random.vectorHalf()));
        oEntity.color = OColor.LightGreen;
        oEntity.setTags(['Grass']);
            if (oEntity.makeDynamic()) {
                oEntity.playMelody();
                oEntity.scale = hz.Vec3.zero;
                oEntity.tweenTo({
                    duration: 0.8,
                    scale: scale,
                    makeStatic: true
                })
            }
        // const makeDynamic = () => {
        //     if (oEntity.makeDynamic()) {
        //         oEntity.playMelody();
        //         oEntity.scale = hz.Vec3.zero;
        //         oEntity.tweenTo({
        //             duration: 0.8,
        //             scale: scale,
        //             makeStatic: true
        //         })
        //     } else {
        //         this.wrapper.setTimeout(makeDynamic, 0.01);
        //     }
        // }
    }

    private easeInExpo(x: number): number {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }
}