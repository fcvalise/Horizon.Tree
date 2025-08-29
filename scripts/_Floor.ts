import * as hz from "horizon/core";
import { OEntity, OisifManager } from "_OManager";
import { TMath } from "_TreeMath";
import { OUtils } from "_OUtils";

class Cell {
    constructor(
        public position: hz.Vec3,
        public rotation: hz.Quaternion,
        public scale: hz.Vec3,
        public color: hz.Color,
        public oEntity: OEntity | undefined,
    ) {

    }
}

export class Floor {

    private cellArray: Cell[] = [];

    constructor(
        private component: hz.Component,
        private gridSize: number,
        private cellSize: number
    ) {
        this.component.async.setTimeout(() => this.create(), 1000);
        this.component.connectCodeBlockEvent(this.component.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
            this.component.connectLocalBroadcastEvent(hz.World.onUpdate, ({ deltaTime }) => this.update(player, deltaTime));
        });

    }

    private update(player: hz.Player, deltaTime: number) {
        const playerPosition = player.position.get();
        for (const cell of this.cellArray) {
            const distance = playerPosition.distance(cell.position)
            if (distance < 15) {
                if (!cell.oEntity) {
                    const oEntity = OisifManager.I.pool.get();
                    if (oEntity) {
                        cell.oEntity = oEntity;
                        oEntity.color = cell.color;
                        oEntity.position = cell.position;
                        oEntity.rotation = cell.rotation;
                        oEntity.scale = cell.scale;
                    }
                } else {
                    cell.oEntity.makeDynamic();
                }
            } else if (distance < 25) {
                if (cell.oEntity) {
                    cell.oEntity.makeStatic();
                }
            } else {
                if (cell.oEntity) {
                    cell.oEntity.makeInvisible();
                    cell.oEntity = undefined;
                }
            }
        }
    }

    private async create() {
        const half = -this.gridSize * this.cellSize * 0.5;
        const startPos = new hz.Vec3(half, 0, half);
        const random = OisifManager.I.random;
        const perlin = random.perlin;
        OUtils.spiralGrid(this.gridSize, this.gridSize, (x, z, i) => {
            const noise = perlin.ridged2(x * 0.2, z * 0.2);
            // position
            const posX = x * this.cellSize + this.cellSize * 0.5;
            const posY = this.easeInExpo(noise) * 2;
            const posZ = z * this.cellSize + this.cellSize * 0.5;
            const position = new hz.Vec3(posX, posY, posZ).add(startPos);
            //rotation
            const lookAtDir = hz.Vec3.down.mul(10).add(random.vectorHalf());
            const twist = TMath.rotateAroundAxis(lookAtDir, lookAtDir, random.range(0, 360));
            const rotation = hz.Quaternion.lookRotation(twist);
            // scale
            const scaleXZRandom = random.next() * 0.5;
            const scaleX = 6 * (1.5 - noise + scaleXZRandom);
            const scaleY = 6 * (1.5 - noise + scaleXZRandom);
            const scaleZ = 6 * (1 - noise + random.next());
            const scale = new hz.Vec3(scaleX, scaleY, scaleZ);
            // color
            const r = 0.8 * random.range(0.98, 1.02) * noise;
            const g = 0.94 * random.range(0.98, 1.02) * noise;
            const b = 0.1 * random.range(0.98, 1.02) * noise;
            const color = new hz.Color(r, g, b);

            const maxDistance = 60;
            const distance = hz.Vec3.zero.distance(position) / maxDistance;
            position.y -= distance * distance * 0.5;
            if (position.y > 0 && posY > 0.1) {
                const cell = new Cell(position, rotation, scale, color, undefined);
                this.cellArray.push(cell);
            }
        });
    }

    public easeInExpo(x: number): number {
		return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
	}
}