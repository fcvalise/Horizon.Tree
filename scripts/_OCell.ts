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
import { ODrop } from "_ODrop";
import { PlayerEvent } from "_PlayerEvent";
import { OGrass } from "_OGrass";

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
    public flower!: TreeBase;
    public hive!: OBeeHive;
    public beeList: OBee[] = [];
    public dropList: ODrop[] = [];
    public grassList: OGrass[] = [];

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
        this.revealFloor(this);
        if (this.floor.expanded && this.index == 0 && !this.hive) {
            this.registerCreateHive();
            // const treePosition = this.floor.position.add(hz.Vec3.forward.mul(2)).add(hz.Vec3.left.mul(-2));
            // this.tree = new TreeBase(this.wrapper, this.manager, this.interactable, treePosition, {
            //     seed: `${this.gx}${this.gz}${this.index}`,
            //     maxDepth: 6,
            // });
            // this.tree.startGrowth();
        } else if (this.floor.expanded && !this.flower && !this.hive) {
            const treePosition = this.computeTreePosition();
            const lerpValue = Math.min(1, Math.max(0, this.index - 8) / 20);
            this.flower = new TreeBase(this.wrapper, this.manager, this.interactable, treePosition, {
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
                    growAfterPrune: false,
                    growSpeed: 0.1,
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
            this.flower.startGrowth();
            this.floor.fertilize();
            this.makeRain();
            this.wrapper.setInterval(() => {
                if (this.flower.regrowFlower() > 0) {
                    this.makeRain();
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

    public makeRain() {
        const dropCount = 8;
        if (this.dropList.length == 0) {
            for (let index = 0; index < dropCount; index++) {
                this.dropList.push(new ODrop(this.wrapper, this.manager))
                this.grassList.push(new OGrass(this.wrapper, this.manager));
            }
        }
        for (let index = 0; index < dropCount; index++) {
            this.wrapper.setTimeout(() => {
                const scale = this.floor.scale;
                const randomPosition = new hz.Vec3(
                    this.random.range(-scale.x * 0.3, scale.x * 0.3),
                    this.random.range(8, 12),
                    this.random.range(-scale.y * 0.3, scale.y * 0.3));
                const position = this.floor.oEntity!.position.add(randomPosition);
                const drop = this.dropList[index];
                const grass = this.grassList[index];

                drop.launch(position, (position) => { grass.create(position);});
            }, this.random.next() * 0.6)
        }
    }

    private addRainInteractable() {
        this.addInteractable(this.tree.getUnlockableOEntity(), 2, 'Make Rain', (actionPlayer) => {
            this.makeRain();
            let count = 0;
            for (const neighbor of this.neighbors8) {
                if (neighbor.flower) {
                    neighbor.flower.regrowFlower();
                    neighbor.makeRain();
                    count++;
                }
            }
            this.wrapper.incrementPVar(actionPlayer, 'Bees:rainCount');
            this.wrapper.setTimeout(() => {
                this.addRainInteractable();
            }, count * 4 + 40);
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

    public async registerCreateHive() {
        const position = this.floor.position;
        this.hive = new OBeeHive(this.wrapper, position, this.manager, { levels: 1 });
        this.wrapper.setTimeout(() => {
            this.hive.rebuild().then(() => {
                this.addInteractable(this.hive.getTop()!, 1, 'create hive', (actionPlayer) => {
                    this.wrapper.incrementPVar(actionPlayer, 'Bees:hiveCount');
                    this.hive.set({ levels: 3 });
                    this.hive.rebuild().then(() => {
                        const bee = new OBee(this.wrapper, this.manager);
                        this.wrapper.incrementPVar(actionPlayer, 'Bees:beeCount');
                        this.beeList.push(bee);
                        this.registerUpgradeHive();
                    });
                })
            });
        }, 2)
    }

    private registerUpgradeHive() {
        const nextLevel = this.hive.params.levels + 1;
        if (nextLevel >= 20) return;
        const price = nextLevel * 2;
        this.addInteractable(this.hive.getTop()!, price, 'upgrade hive', (actionPlayer) => {
            const hiveMaxLevel = this.wrapper.getPVar(actionPlayer, 'Bees:hiveMaxLevel');
            if (nextLevel > hiveMaxLevel) {
                this.wrapper.setPVar(actionPlayer, 'Bees:hiveMaxLevel', hiveMaxLevel + 1);
            }
            this.hive.set({ levels: nextLevel });
            this.hive.rebuild().then(() => {
                const bee = new OBee(this.wrapper, this.manager);
                this.wrapper.incrementPVar(actionPlayer, 'Bees:beeCount');
                this.beeList.push(bee);
                this.registerUpgradeHive();
            });
        })
    }

    public revealFloor(cell: OCell) {
        if (cell.floor.settings.index != 0 && cell.neighbors8.filter((c) => (c.floor.expanded)).length == 0) return;
        if (cell.floor.reveal()) {
            const price = Math.max(1, Math.min(20, cell.index - 4));
            this.addInteractable(cell.floor.oEntity!, price, 'expand', (actionPlayer) => {
                cell.floor.expand();
                this.wrapper.incrementPVar(actionPlayer, 'Bees:expandCount')
                for (const neighboors of cell.neighbors8) {
                    this.wrapper.setTimeout(() => {
                        this.revealFloor(neighboors);
                    }, this.random.range(1, 3));
                }
            });
        }
    }

    private addInteractable(oEntity: OEntity, price: number, infos: string, action: (player: hz.Player) => void) {
        const dispose = this.interactable.add(oEntity!, price, infos, (player) => { dispose(); action(player); });
    }
}