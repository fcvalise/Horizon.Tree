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
import { OInteractableManager } from "_OInteractableManager";

class Cell {
    public oEntity: OEntity | undefined;
    public created: boolean = false;
    public unlocked: boolean = false;
    public discovered: boolean = false;
    public init: boolean = false;

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
    private readonly initCount = 9;
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
        private interactable: OInteractableManager,
        private random: ORandom,
        private gridSize: number,
        private cellSize: number
    ) {
        this.create();
        this.updateUI();
        wrapper.onUpdate(() => this.update());
        wrapper.component.async.setInterval(() => this.updateUI(), 1000);
    }

    private update() {
        const playerList = this.wrapper.world.getPlayers();
        const serverPlayer = this.wrapper.world.getServerPlayer();
        for (const cell of this.cellArray) {
            this.createCell(cell, playerList, serverPlayer);
            this.unlockCell(cell);
        }
    }

    private createCell(cell: Cell, playerList: hz.Player[], serverPlayer: hz.Player) {
        if (cell.created) return;
        const result = OUtils.closestPlayer(this.wrapper, cell.position, playerList, serverPlayer);
        const create = cell.init || result.distance < this.discoverRange;
        if (cell.neighbors8.filter((c) => (c.discovered || c.init) && !c.oEntity?.isTweening()).length == 0) return;
        if (!create) return;
        cell.created = true;
        cell.oEntity = this.manager.create()
        cell.oEntity.position = cell.position.add(this.random.vector());
        cell.oEntity.rotation = cell.rotation;
        cell.oEntity.color = OColor.White;
        cell.oEntity.setTags(['Terrain', 'Walkable']);
        if (cell.oEntity.makeDynamic()) {
            cell.oEntity.playMelody();
            cell.oEntity.scaleZeroTo(cell.scale.mul(0.5), 0.8, false);
            if (cell.init) {
                cell.unlocked = true;
            } else {
                this.registerUnlock(cell);
            }
        } else {
            cell.created = false;
            this.manager.delete(cell.oEntity);
        }
    }

    private registerUnlock(cell: Cell) {
        const dispose = this.interactable.add(cell.oEntity!, 1, 'Expand', (player) => {
            if (!cell.oEntity) return;
            if (cell.unlocked) return;
            if (!this.inventory.get(player)?.has(1)) return;

            this.inventory.get(player)?.consume(1, cell.oEntity!);
            cell.unlocked = true;
            this.wrapper.component.async.setTimeout(() => dispose(), 10);
        });
    }

    private unlockCell(cell: Cell) {
        if (!cell?.oEntity) return;
        if (!cell.created || !cell.unlocked || cell.discovered) return;
        
        cell.discovered = true;
        cell.oEntity.rotation = cell.rotation;
        cell.oEntity.scale = cell.scale.mul(0.5);
        cell.oEntity.color = OColor.White;
        if (cell.oEntity.makeDynamic()) {
            cell.oEntity.playMelody();
            cell.oEntity.tweenTo({
                duration: 0.4,
                position: cell.position,
                scale: cell.scale,
                color: OColor.DarkGreen,
                ease: Ease.quadInOut,
                delay: 1.3,
                makeStatic: true
            })
            .then(() => {
                this.wrapper.component.sendNetworkBroadcastEvent(OEvent.onTerrainSpawn,
                    { entity: cell.oEntity?.entity! });
            });
            // this.interactable.delete(cell.oEntity);
        } else {
            cell.discovered = false;
        }
    }

    private async create() {
        const half = -this.gridSize * this.cellSize * 0.5 - this.cellSize * 0.5;
        const startPos = new hz.Vec3(half, 0, half);
        const perlin = this.random.perlin;
        OUtils.spiralGrid(this.gridSize, this.gridSize, (x, z, i) => {
            let noise = perlin.ridged2(x * 0.2, z * 0.2);
            // position
            const posX = x * this.cellSize + this.cellSize * 0.5;
            const posY = this.easeInExpo(noise) * 4;
            const posZ = z * this.cellSize + this.cellSize * 0.5;
            let position = new hz.Vec3(posX, posY, posZ).add(startPos);
            position = position.add(position.mul(0.2));

            // rotation
            const lookAtDir = hz.Vec3.down.mul(10).add(this.random.vectorHalf());
            const twist = lookAtDir.rotateArround(this.random.range(0, 360), lookAtDir);
            let rotation = hz.Quaternion.lookRotation(twist);
            // scale
            const scaleXZRandom = this.random.next() * 0.5;
            const scaleX = 8 * (1.5 - noise + scaleXZRandom);
            const scaleY = 8 * (1.5 - noise + scaleXZRandom);
            const scaleZ = 100;
            let scale = new hz.Vec3(scaleX, scaleY, scaleZ);
            scale = scale.add(hz.Vec3.one.mul(i / 20));
            // color
            const r = 0.8 * this.random.range(0.98, 1.02) * noise;
            const g = 0.94 * this.random.range(0.98, 1.02) * noise;
            const b = 0.1 * this.random.range(0.98, 1.02) * noise;
            let color = new hz.Color(r, g, b);
            color = OColor.LightGreen;

            const distance = hz.Vec3.zero.distance(position) / this.maxDistance;
            noise -= distance * distance * 0.5;
            if (noise > 0.2 && i != 0) {
                const cell = new Cell(x, z, position, rotation, scale, color);
                cell.init = i < this.initCount;
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
                if (!cell) str += ' ';
                else if (!cell.created) str += ' ';
                else if (!cell.discovered) str += '·';
                else str += '•';
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
