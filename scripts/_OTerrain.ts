import * as hz from "horizon/core";
import "./_OMath";
import { OUtils } from "_OUtils";
import { Ease, OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { ORandom } from "_ORandom";
import { OEntityManager } from "_OEntityManager";
import { OEvent } from "_OEvent";
import { OColor } from "_OColor";
import { OuiProgressEvent } from "_OuiProgress";
import { OuiMapEvent } from "_OuiMap";
import { OInventoryManager } from "_OInventory";
import { InteractableRegistry } from "_OTriggerPool";

class Cell {
    public oEntity: OEntity | undefined;
    public created: boolean = false;
    public unlocked: boolean = false;
    public discovered: boolean = false;

    // neighbors
    public neighbors4: Cell[] = [];
    public neighbors8: Cell[] = [];

    constructor(
        public gx: number,
        public gz: number,
        public position: hz.Vec3,
        public rotation: hz.Quaternion,
        public scale: hz.Vec3,
        public color: hz.Color,
    ) { }
}

export class OTerrain {
    private readonly discoverRange = 10;
    private readonly maxDistance = 25;
    private cellArray: Cell[] = [];

    // grid index
    private cellByGrid = new Map<string, Cell>();
    private key = (x: number, z: number) => `${x},${z}`;

    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private inventory: OInventoryManager,
        private random: ORandom,
        private gridSize: number,
        private cellSize: number
    ) {
        this.create();
        this.updateUI();
        wrapper.onUpdate(() => this.update());
    }

    private update() {
        for (const cell of this.cellArray) {
            const result = OUtils.closestPlayer(this.wrapper, cell.position);
            const inRange = result.distance < this.discoverRange;

            if (!cell.created && inRange) {
                cell.oEntity = this.manager.create()
                cell.oEntity.position = cell.position.add(this.random.vector());
                cell.oEntity.rotation = cell.rotation;
                cell.oEntity.color = OColor.Grey;
                cell.oEntity.setTags(['Terrain']);
                if (cell.oEntity.makeDynamic()) {
                    cell.oEntity.playMelody();
                    cell.created = true;
                    cell.oEntity.scaleZeroTo(cell.scale.mul(0.5), 0.8, true);
                    const dispose = InteractableRegistry.I.add(cell.oEntity, (player) => {
                        const inventory = this.inventory.get(player);
                        if (inventory?.has(1)) {
                            if (player.isGrounded) {
                                // player.applyForce(hz.Vec3.up.mul(10));
                            }
                            cell.unlocked = true;
                            dispose();
                            this.updateUI();
                        }
                    });
                } else {
                    this.manager.delete(cell.oEntity);
                }
            } else if (cell.unlocked && !cell.discovered) {
                const inventory = this.inventory.get(result.player); // TODO  : ATENTION get the closest player not the one interacting
                const unlockedCellList = [cell]//, ...cell.neighbors8];
                
                let index = 0;
                for (const unlockedCell of unlockedCellList) {
                    if (inventory?.has(1 + index) && !unlockedCell.discovered) {
                        unlockedCell.discovered = true;
                        // unlockedCell.unlocked = true;
                        this.wrapper.component.async.setTimeout(() => {
                            if (unlockedCell.oEntity) {
                                inventory.consume(1, unlockedCell.oEntity!);
                                unlockedCell.oEntity.rotation = unlockedCell.rotation;
                                unlockedCell.oEntity.scale = unlockedCell.scale.mul(0.5);
                                unlockedCell.oEntity.color = OColor.Grey;
                                unlockedCell.oEntity.setTags(['Terrain']);
                                if (unlockedCell.oEntity.makeDynamic()) {
                                    unlockedCell.oEntity.playMelody();
                                    unlockedCell.oEntity.tweenTo({
                                        duration: 0.4,
                                        position: unlockedCell.position,
                                        scale: unlockedCell.scale,
                                        color: OColor.DarkGreen,
                                        ease: Ease.quadInOut,
                                        delay: 1.3,
                                        makeStatic: false
                                    }).then(() => {
                                        unlockedCell.oEntity!.color = OColor.DarkGreen; // TODO: Why the ending color is not the right one
                                        unlockedCell.oEntity!.makeStatic();
                                        this.wrapper.component.sendNetworkBroadcastEvent(OEvent.onTerrainSpawn,
                                            { entity: unlockedCell.oEntity?.entity! });
                                    });
                                    InteractableRegistry.I.delete(unlockedCell.oEntity!);
                                    this.updateUI();
                                }
                            }
                        }, index++ * 200);
                    }
                }
            }
        }
    }

    private async create() {
        const half = -this.gridSize * this.cellSize * 0.5;
        const startPos = new hz.Vec3(half, 0, half);
        const perlin = this.random.perlin;
        OUtils.spiralGrid(this.gridSize, this.gridSize, (x, z, i) => {
            let noise = perlin.ridged2(x * 0.2, z * 0.2);
            // position
            const posX = x * this.cellSize + this.cellSize * 0.5;
            const posY = this.easeInExpo(noise) * 2;
            const posZ = z * this.cellSize + this.cellSize * 0.5;
            const position = new hz.Vec3(posX, posY, posZ).add(startPos);
            // rotation
            const lookAtDir = hz.Vec3.down.mul(10).add(this.random.vectorHalf());
            const twist = lookAtDir.rotateArround(this.random.range(0, 360), lookAtDir);
            let rotation = hz.Quaternion.lookRotation(twist);
            // scale
            const scaleXZRandom = this.random.next() * 0.5;
            const scaleX = 6 * (1.5 - noise + scaleXZRandom);
            const scaleY = 6 * (1.5 - noise + scaleXZRandom);
            const scaleZ = 100;
            let scale = new hz.Vec3(scaleX, scaleY, scaleZ);
            // color
            const r = 0.8 * this.random.range(0.98, 1.02) * noise;
            const g = 0.94 * this.random.range(0.98, 1.02) * noise;
            const b = 0.1 * this.random.range(0.98, 1.02) * noise;
            let color = new hz.Color(r, g, b);
            color = OColor.LightGreen;

            const distance = hz.Vec3.zero.distance(position) / this.maxDistance;
            noise -= distance * distance * 0.5;
            if (noise > 0.2) {
                const cell = new Cell(x, z, position, rotation, scale, color);
                this.cellArray.push(cell);
                this.cellByGrid.set(this.key(x, z), cell);
            }
        });

        this.buildNeighbors();
    }

    private buildNeighbors() {
        const d4 = [
            [1, 0], [-1, 0],
            [0, 1], [0, -1],
        ];
        const diag = [
            [1, 1], [1, -1],
            [-1, 1], [-1, -1],
        ];

        for (const cell of this.cellArray) {
            const { gx, gz } = cell;

            cell.neighbors4.length = 0;
            for (const [dx, dz] of d4) {
                const n = this.cellByGrid.get(this.key(gx + dx, gz + dz));
                if (n) cell.neighbors4.push(n);
            }

            cell.neighbors8.length = 0;
            cell.neighbors8.push(...cell.neighbors4);
            for (const [dx, dz] of diag) {
                const n = this.cellByGrid.get(this.key(gx + dx, gz + dz));
                if (n) cell.neighbors8.push(n);
            }
        }
    }

    private buildMapStr(): string {
        let str: string = '';
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const cell = this.cellByGrid.get(this.key(x, z));
                str += !cell ? ' ' : cell.discovered ? '•' : '·';
            }
            str += '.\n';
        }
        // prevent horizon wrapping
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                str += '.'
            }
            str += '.\n';
        }
        return str;
    }


    private updateUI() {
        const current = this.cellArray.filter(c => c.discovered).length;
        const total = this.cellArray.length;
        const percent = current / total * 100;
        this.wrapper.component.sendNetworkBroadcastEvent(OuiProgressEvent, {
            id: 'TerrainProgress', percent: percent, text: `${current}/${total}`
        });
        this.wrapper.component.sendNetworkBroadcastEvent(OuiMapEvent, { grid: this.buildMapStr() })
    }

    public easeInExpo(x: number): number {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }
}
