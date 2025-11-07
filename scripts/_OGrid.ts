import * as hz from "horizon/core";
import "./_OMath";
import { OUtils } from "_OUtils";
import { OWrapper } from "_OWrapper";
import { OEntityManager } from "_OEntityManager";
import { OInventoryManager } from "_OInventory";
import { OInteractableManager } from "_OInteractableManager";
import { ORandom } from "_ORandom";
import { OCell } from "_OCell";
import { OuiProgressEvent } from "_OuiProgress";
import { OuiMapEvent } from "_OuiMap";
import { PlayerEvent } from "_PlayerEvent";

export class OGrid {
    private readonly gridSize = 40
    private cellArray: OCell[] = [];
    private cellByGrid = new Map<string, OCell>();
    private key = (x: number, z: number) => `${x},${z}`;

    // Neighbor offset caches (avoids re-alloc each link)
    private readonly OFFSETS_4: ReadonlyArray<readonly [number, number]> = [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
    ] as const;

    private readonly OFFSETS_8: ReadonlyArray<readonly [number, number]> = [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
        [1, 1], [1, -1],
        [-1, 1], [-1, -1],
    ] as const;

    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private inventory: OInventoryManager,
        private interactable: OInteractableManager,
        private random: ORandom,
    ) {
        this.create();
    }

    private async create() {
       this.wrapper.onPlayerEnter((player) => {
            this.wrapper.component.connectNetworkEvent(player, PlayerEvent.onAskStart, () => {
                const firstCell = this.cellArray[0];
                if (firstCell) {
                    firstCell.revealFloor(firstCell);
                    const position = firstCell!.floor.position!;
                    this.wrapper.component.sendNetworkEvent(player, PlayerEvent.onGetStart, { position: position });
                }
            })
        })

        await OUtils.spiralGridAsync(this.wrapper, 0.01, this.gridSize, this.gridSize, (x, z, i) => {
            const cell = new OCell(
                this.wrapper,
                this.manager,
                this.interactable,
                this.inventory,
                this.random,
                x, z, i,
                this.gridSize
            );

            this.cellArray.push(cell);
            this.cellByGrid.set(this.key(x, z), cell);

            this.linkNeighbors(cell);
        });

        this.wrapper.onUpdate((dt) => this.update(dt));
        this.wrapper.component.async.setInterval(() => this.updateUI(), 1000);
    }

    private update(dt: number) {
        const playerList = this.wrapper.world.getPlayers();

        for (const player of playerList) { // TODO : Save current and check only the neighboors
            const playerPosition = player.position.get();
            let closestCell: OCell | undefined = undefined;
            let minDistance = Number.MAX_VALUE;
            for (const cell of this.cellArray) {
                if (cell.floor.hidden) continue;
                const distance = playerPosition.distance(cell.floor.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCell = cell;
                }
            }
            if (closestCell) {
                closestCell.updateIfCurrent(player);
            }
        }
    }

    private linkNeighbors(cell: OCell) {
        const { gx, gz } = cell;

        if (!cell.neighbors4) cell.neighbors4 = [];
        if (!cell.neighbors8) cell.neighbors8 = [];
        cell.neighbors4.length = 0;
        cell.neighbors8.length = 0;

        for (const [dx, dz] of this.OFFSETS_8) {
            const nx = gx + dx;
            const nz = gz + dz;
            const neighbor = this.cellByGrid.get(this.key(nx, nz));
            if (!neighbor) continue;

            if (!neighbor.neighbors4) neighbor.neighbors4 = [];
            if (!neighbor.neighbors8) neighbor.neighbors8 = [];

            if (Math.abs(dx) + Math.abs(dz) === 1) {
                this.pushUnique(cell.neighbors4, neighbor);
                this.pushUnique(neighbor.neighbors4, cell);
            }

            this.pushUnique(cell.neighbors8, neighbor);
            this.pushUnique(neighbor.neighbors8, cell);
        }
    }

    private pushUnique(arr: OCell[], v: OCell) {
        if (arr.length === 0 || arr[arr.length - 1] !== v) {
            if (!arr.includes(v)) arr.push(v);
        }
    }

    private buildNeighbors() {
        const d4 = this.OFFSETS_4;
        const diag: ReadonlyArray<readonly [number, number]> = [[1,1],[1,-1],[-1,1],[-1,-1]];

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
                // if (!cell) str += ' ';
                // else if (!cell.floor.revealed) str += ' ';
                // else if (!cell.floor.expanded) str += '·';
                // else str += '•';
                if (!cell) str += ' ';
                else if (!cell.floor.hidden && !cell.floor.revealed) str += '.';
                else str += ' ';
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
        const current = this.cellArray.filter(c => c.floor.revealed).length;
        const total = this.cellArray.length;
        const percent = current / total * 100;
        this.wrapper.component.sendNetworkBroadcastEvent(OuiProgressEvent, {
            id: 'TerrainProgress', percent: percent, text: `${current}/${total}`
        });
        this.wrapper.component.sendNetworkBroadcastEvent(OuiMapEvent, { grid: this.buildMapStr() })
    }
}
