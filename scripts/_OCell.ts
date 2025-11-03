import * as hz from "horizon/core";
import "./_OMath";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OInventoryManager } from "_OInventory";
import { OEntityManager } from "_OEntityManager";
import { TreeBase } from "_TreeBase";
import { TreeFlowers } from "_TreeFlower";
import { OBeeHive } from "OBeeHive";
import { ORandom } from "_ORandom";
import { OInteractableManager } from "_OInteractableManager";
import { OFloor } from "OFloor";
import { OColor } from "_OColor";
import { OBee } from "_OBee";
import { OFluid } from "_OFluid";

export type CellSettings = {
    manager: OEntityManager,
    interactable: OInteractableManager,
    inventory: OInventoryManager,
    random: ORandom,
    gx: number,
    gz: number,
    index: number,
    gridSize: number,
};

export class OCell {
    public floor: OFloor;
    public tree!: TreeBase;
    public hive!: OBeeHive;
    public flowerList: TreeFlowers[] = [];
    public beeList: OBee[] = [];
    public fluid!: OFluid;

    // neighbors
    public neighbors4: OCell[] = [];
    public neighbors8: OCell[] = [];

    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private interactable: OInteractableManager,
        private inventory: OInventoryManager,
        private random: ORandom,
        public gx: number,
        public gz: number,
        public index: number,
        private gridSize: number,
    ) {
        const settings: CellSettings = {
            manager: this.manager,
            interactable: this.interactable,
            inventory: this.inventory,
            random: this.random,
            gx: this.gx,
            gz: this.gz,
            index: this.index,
            gridSize: this.gridSize
        }
        this.floor = new OFloor(this.wrapper, settings);
    }

    public updateIfCurrent(player: hz.Player) {
        this.revealFloor(player, this);
        if (this.floor.expanded && this.index == 0 && !this.hive) {
                this.registerCreateHive(player);
                // const treePosition = this.floor.position.add(hz.Vec3.forward.mul(2)).add(hz.Vec3.left.mul(-2));
                // this.tree = new TreeBase(this.wrapper, this.manager, this.interactable, treePosition, {
                //     seed: `${this.gx}${this.gz}${this.index}`,
                //     maxDepth: 6,
                // });
                // this.tree.startGrowth();
        } else if (this.floor.expanded && !this.tree && !this.hive) {
            const treePosition = this.computeTreePosition();
            const lerpValue = Math.min(1, Math.max(0, this.index - 8) / 20);
            this.tree = new TreeBase(this.wrapper, this.manager, this.interactable, treePosition, {
                seed: `${this.gx}${this.gz}${this.index}`,
                maxDepth: 2 + Number.lerp(0, 3, lerpValue),
                branch: {
                    initialCount: 1,
                    length: this.random.range(0.6, 1.2) * Number.lerp(1, 2, lerpValue),
                    lengthDecay: 0.98,
                    bottomWidth: 0.2,
                    topWidth: 0.05,
                    chance: 0.4,
                    angle: 40,
                    rollMax: 15,
                    color: OColor.Black,
                    growAfterPrune: false
                },
                flower: {
                    scale: 1 + Number.lerp(0, 1, lerpValue),
                    peduncleLength: 0.14,
                    tiltDeg: 0,
                    style: "cone",          // default "disc"
                    petalCount: 3 + Number.lerp(0, 3, lerpValue),          // default 5
                    petalRadius: 0.3,          // default ≈ scale * 0.8
                    petalAngleJitterDeg: 0,  // default 6
                    petalSizeJitter: 0.1,      // default 0.10 (±10%)
                    petalBrightness: 1,      // default 3
                    petalColor: OColor.White,        // default OColor.White
                    centerColor: OColor.Orange, 
                },
                leaf: {
                    minBranch: 0.4,
                    scale: 1.5,
                    count: 1,
                    petioleLength: 0,
                    axialJitter: 0.2,
                    spiralDivergence: 137.5,
                    whorlCount: 3,
                    branchPhyllotaxy: "Spiral",
                    trunkPhyllotaxy: "Spiral"
                },
            });
            this.tree.startGrowth();
            this.floor.fertilize();
            this.fluid = new OFluid(this.wrapper, this.manager, this.floor.position.add(hz.Vec3.up.mul(8)));
            this.fluid.playFor(3);
            this.wrapper.setInterval(() => {
                if (this.tree.regrowFlower() > 0) {
                    this.fluid.playFor(3);
                }
            }, 40 + this.index);

            if (this.random.bool(0.2)) {
                const treePosition = this.floor.position.add(hz.Vec3.forward.mul(2)).add(hz.Vec3.left.mul(-2));
                this.tree = new TreeBase(this.wrapper, this.manager, this.interactable, treePosition, {
                    seed: `${this.gx}${this.gz}${this.index}`,
                    maxDepth: 6,
                });
                this.tree.startGrowth();
                this.addRainInteractable();
            }

            // this.addInteractable(this.tree.getUnlockableOEntity(), 2, 'Grow Tree', () => this.tree.startGrowth())
        }
    }

    private addRainInteractable() {
        this.addInteractable(this.tree.getUnlockableOEntity(), 2, 'Make Rain', () => {
            this.fluid.playFor(3);
            let count = 0;
            for (const neighbor of this.neighbors8) {
                this.wrapper.setTimeout(() => {
                    if (neighbor.fluid) {
                        if (this.tree.regrowFlower() > 0) {
                            this.fluid.playFor(3);
                        }
                        count++;
                    }
                }, 3 * count)
            }
            this.wrapper.setTimeout(() => {
                this.addRainInteractable();
            }, count * 3 + 20);
        })
    }

    private computeTreePosition(): hz.Vec3 {
        const floorPosition = this.floor.position;
        const floorScale = this.floor.scale;
        const treePosition = new hz.Vec3(
            floorPosition.x + this.random.range(-floorScale.x * 0.25, floorScale.x * 0.25),
            floorPosition.y,
            floorPosition.z + this.random.range(-floorScale.y * 0.25, floorScale.y * 0.25)
        )
        return treePosition;
    }

    private async registerCreateHive(player: hz.Player) {
        const position = this.floor.position.add(hz.Vec3.left.mul(2));
        this.hive = new OBeeHive(this.wrapper, position, this.manager, { levels: 1 });
        this.wrapper.setTimeout(() => {
            this.hive.rebuild().then(() => {
                this.addInteractable(this.hive.getTop()!, 1, 'create hive', () => {
                    this.wrapper.incrementPVar(player, 'Bees:hiveCount');
                    this.hive.set({ levels: 3 });
                    this.hive.rebuild().then(() => {
                        const bee = new OBee(this.wrapper, this.manager);
                        this.wrapper.incrementPVar(player, 'Bees:beeCount');
                        this.beeList.push(bee);
                        this.registerUpgradeHive(player);
                    });
                })
            });
        }, 2)
    }

    private registerUpgradeHive(player: hz.Player) {
        const nextLevel = this.hive.params.levels + 1;
        if (nextLevel >= 20) return;
        const price = nextLevel * 2;
        const hiveMaxLevel = this.wrapper.getPVar(player, 'Bees:hiveMaxLevel');
        if (nextLevel > hiveMaxLevel) {
            this.wrapper.setPVar(player, 'Bees:hiveMaxLevel', hiveMaxLevel + 1);
        }
        this.addInteractable(this.hive.getTop()!, price, 'upgrade hive', () => {
            this.hive.set({ levels: nextLevel });
            this.hive.rebuild().then(() => {
                const bee = new OBee(this.wrapper, this.manager);
                this.wrapper.incrementPVar(player, 'Bees:beeCount');
                this.beeList.push(bee);
                this.registerUpgradeHive(player);
            });
        })
    }

    private revealFloor(player: hz.Player, cell: OCell) {
        if (cell.floor.settings.index != 0 && cell.neighbors8.filter((c) => (c.floor.expanded)).length == 0) return;
        if (cell.floor.reveal()) {
            this.addInteractable(cell.floor.oEntity!, Math.max(1, Math.min(20, cell.index - 4)), 'expand', () => {
                cell.floor.expand();
                this.wrapper.incrementPVar(player, 'Bees:expandCount')
                for (const neighboors of cell.neighbors8) {
                    this.wrapper.setTimeout(() => {
                        this.revealFloor(player, neighboors);
                    }, this.random.range(1, 3));
                }
            });
        }
    }

    private addInteractable(oEntity: OEntity, price: number, infos: string, action: () => void) {
        const dispose = this.interactable.add(oEntity!, price, infos, (player) => { dispose(); action(); });
    }
}