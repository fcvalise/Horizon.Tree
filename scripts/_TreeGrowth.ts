import * as hz from "horizon/core";
import "./_OMath";
import { BranchSettings, TreeSettings } from "_TreeSettings";
import { TreeArchitecture } from "_TreeArchitecture";
import { TreeTropisms } from "_TreeTropisms";
import { TreeLeaves } from "_TreeLeaves";
import { Ease, OEntity } from "_OEntity";
import { ORandom } from "_ORandom";
import { ORaycast } from "_ORaycast";
import { OWrapper } from "_OWrapper";
import { OColor } from "_OColor";
import { OEntityManager } from "_OEntityManager";
import { estimateTreeProgressCurrent } from "_TreeProgress";
import { PlayerEvent } from "_PlayerEvent";
import { OInteractableManager } from "_OInteractableManager";
import { TreeFlowers } from "_TreeFlower";

export type Bud = {
    position: hz.Vec3;
    direction: hz.Vec3;
    depth: number;
    isBranchStart: boolean;
    axisId: number;
    nodeIndex: number;
    isBranchAxis: boolean;
    axisOrder: number;
    length: number;
    parent?: Bud;
    children: Bud[];
    oEntity?: OEntity,
    oEntityList: OEntity[];
    created?: boolean;
    isPruned?: boolean;
};

export const treeTag = "Tree";

export class TreeGrowth {
    private random!: ORandom;
    private raycast: ORaycast
    private growthQueue: Bud[] = [];
    private frameCount: number = 0;
    private nextAxisId = 1;

    private settings!: BranchSettings;
    private architecture!: TreeArchitecture;
    private tropisms!: TreeTropisms;
    private leaves!: TreeLeaves;
    private flowers!: TreeFlowers;

    private budMap: Map<OEntity, Bud> = new Map();
    private budRoot!: Bud;
    private isStopped: boolean = false;

    constructor(
        private position: hz.Vec3,
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private interactable: OInteractableManager,
        private treeSettings: TreeSettings,
    ) {
        this.random = new ORandom(this.treeSettings.seed);
        this.raycast = new ORaycast(this.wrapper);
        this.architecture = new TreeArchitecture(treeSettings, treeSettings.architecture);
        this.tropisms = new TreeTropisms(this.architecture, treeSettings.tropism, this.raycast, this.random);
        this.leaves = new TreeLeaves(this.wrapper, this.manager, treeSettings, treeSettings.leaf, this.random);
        this.flowers = new TreeFlowers(this.wrapper, this.manager, treeSettings, treeSettings.flower, this.random);
        this.settings = treeSettings.branch;

        this.createRoot();

        this.wrapper.component.connectNetworkBroadcastEvent(PlayerEvent.onTouch, (payload) => {
            this.prune(payload.hit.target);
        });
    }

    private createRoot() {
        this.growthQueue = [];
        for (let i = 0; i < this.settings.initialCount; i++) {
            const baseUp = hz.Vec3.up;
            const rootPos = this.position;
            const direction = hz.Vec3.normalize(baseUp);
            const newBud = {
                position: rootPos,
                direction: direction,
                depth: 0,
                isBranchStart: false,
                axisId: this.nextAxisId++,
                nodeIndex: 0,
                isBranchAxis: false,
                axisOrder: 0,
                length: this.settings.length,
                parent: undefined,
                children: [],
                oEntityList: [],
            }

            this.growthQueue.push(newBud);
            this.budRoot = newBud;
        }
    }

    public step() {
        if (this.isStopped) return;
        this.frameCount++;
        if (this.growthQueue.length === 0) return;
        if (this.architecture.waitForRythmic(this.frameCount)) return;
        const bud = this.growthQueue.shift()!;
        if (!bud.isPruned && bud.depth < this.treeSettings.maxDepth) {
            const combined = this.tropisms.getVector(bud);
            this.createSegment(bud, combined);
        } else {
            this.removeBranch(bud);
        }
        // const metrics = estimateTreeProgressCurrent(this.budRoot, this.treeSettings.maxDepth);
        // console.log(metrics.progress);   
    }

    public prune(entity: hz.Entity) {
        const oEntity = this.manager.get(entity);
        if (oEntity) {
            const budRoot = this.budMap.get(oEntity);
            if (budRoot) {
                console.log(JSON.stringify(this.settings));
                this.removeBranch(budRoot);
                // if (this.settings.growAfterPrune) {
                //     budRoot.isPruned = false;
                //     this.growthQueue.push(budRoot);
                // }
            }
        }
    }

    private async removeBranch(bud: Bud) {
        bud.isPruned = true;
        for (const oEntity of bud.oEntityList) {
            if (oEntity.makeDynamic()) {// || oEntity.entity) {
                oEntity.cancelTweens();
                oEntity.makePhysic();

            } else if (!oEntity.isStatic) {
                oEntity.cancelTweens();
                oEntity.makePhysic();
            }
            oEntity.isCollectible = true;
        }
        for (const child of bud.children) {
            this.removeBranch(child);
        }
    }
    
    private isPrunedParent(budRoot: Bud) {
        let parent = budRoot.parent;
        while (parent) {
            if (Boolean(parent.isPruned)) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    public regrowFlower(): number {
        let count = 0;
        this.budMap.forEach((bud, budEntity) => {
            for (const oe of bud.oEntityList) {
                if (oe.tags.includes('Petal') && !oe.isTweening()) {
                    count++;
                    if (oe.makeDynamic()) {
                        const scale = oe.scale.clone();
                        const p = oe.tweenTo({
                            delay: 1.4,
                            duration: this.random.range(0.6, 1.2),
                            scale: scale.mul(3),
                            brightness: 2,
                            makeStatic: false,
                            color: OColor.Blue,
                            ease: Ease.cubicOut,
                        }).then(() => {
                            oe.tweenTo({
                                duration: this.random.range(0.6, 1.2),
                                scale: scale,
                                brightness: 1,
                                makeStatic: false,
                                color: OColor.Pink,
                                ease: Ease.cubicOut,
                            }).then(() => {
                                this.manager.makeCollectible(oe);
                            })
                        })
                    }
                }
            }
        });
        return count;
    }

    private async harvest(bud: Bud) {
        for (let i = 0; i < bud.oEntityList.length; i++) {
            const oEntityFall = bud.oEntityList[i];
            if (oEntityFall.isStatic) {
                const position = oEntityFall.position.clone();
                const rotation = oEntityFall.rotation.clone();
                const scale = oEntityFall.scale.clone();

                if (oEntityFall.makeDynamic()) {
                    oEntityFall.isCollectible = true;

                    await oEntityFall.tweenTo({
                        duration: 0.2,
                        position: position.add(rotation.getForward().normalize()),
                        scale: new hz.Vec3(0.5, 0.5, 0.1),
                        color: OColor.Orange,
                        makeStatic: false
                    })
                    // oEntityFall.makePhysic();
                    // oEntityFall.isCollectible = true;

                    // Create new leaf
                    // const oEntityNew = this.manager.create();
                    // oEntityNew.position = position;
                    // oEntityNew.rotation = rotation;
                    // oEntityNew.scale = hz.Vec3.zero;
                    // if (oEntityNew.makeDynamic()) {
                    //     oEntityNew.color = OColor.LightGreen;
                    //     oEntityNew.scaleZeroTo(scale, this.random.range(60, 120), true, Ease.linear)
                    //     bud.oEntityList[i] = oEntityNew;
                    // } else {
                    //     this.manager.delete(oEntityNew);
                    // }
                }
            }
        }

        // for (const oEntity of bud.oEntityList) {
        //     if (oEntity.isTweening() || oEntity.isInvisible) continue;            
        //     const collectible = this.manager.create();
        //     collectible.position = oEntity.position;
        //     collectible.rotation = oEntity.rotation;
        //     collectible.scale = oEntity.scale;
        //     collectible.color = oEntity.color;
        //     collectible.isCollectible = true;
        //     if (collectible.makeDynamic()) {
        //         oEntity.makeInvisible();
        //         collectible.makePhysic();
        //         collectible.tweenTo({
        //             duration: 1,
        //             scale: new hz.Vec3(0.5, 0.5, 0.1),
        //             color: OColor.Orange,
        //             makeStatic: false
        //         }).then(() => {
        //             oEntity.makeDynamic();
        //             const scale = oEntity.scale;
        //             oEntity.scale = hz.Vec3.zero;
        //             oEntity.scaleZeroTo(scale, this.random.range(60, 120), true, Ease.linear);
        //         })
        //     } else {
        //         this.manager.delete(oEntity);
        //     }
        // }
        // bud.oEntityList = [];
        for (const child of bud.children) {
            this.harvest(child);
        }
    }

    private async createSegment(bud: Bud, direction: hz.Vec3): Promise<void> {
        if (bud.isPruned || this.isPrunedParent(bud)) return;
        if (this.raycast.cast(bud.position, this.tropisms.sunDir(), bud.length * 4)) {
            bud.length *= 0.8;
        }
        if (bud.length < this.settings.length * 0.2) return;
        
        if (this.manager.hasAvailable()) {
            if (!bud.oEntity) {
                bud.oEntity = this.manager.create();
            }
            if (bud.oEntity && bud.oEntity.makeDynamic()) {
                const nextPosition = bud.position.add(direction.mul(bud.length));
                const forward = nextPosition.sub(bud.position).normalize();
                const t = bud.depth / Math.max(1, this.treeSettings.maxDepth);
                const width = Number.lerp(this.settings.bottomWidth, this.settings.topWidth, t) * (bud.length / this.settings.length);

                bud.oEntity.position = bud.position;
                bud.oEntity.rotation = hz.Quaternion.lookRotation(forward);
                bud.oEntity.scale = hz.Vec3.zero;
                bud.oEntity.color = this.settings.color;
                // bud.oEntityList.push(bud.oEntity);
                this.budMap.set(bud.oEntity, bud);
                bud.oEntity.setTags(['Branch']);
                bud.oEntity.tweenTo({
                    duration: this.random.range(2, 7) * this.settings.growSpeed,
                    scale: new hz.Vec3(width, width, bud.length),
                    makeStatic: true,
                    ease: Ease.cubicOut
                })
                .then(() => {
                    this.leaves.placeLeaves(bud, direction);
                    this.flowers.placeFlower(bud, direction)
                    this.enqueueSegment(bud, direction, nextPosition);
                });

                if (bud === this.budRoot) {
                    // const dispose = this.interactable.add(this.budRoot.oEntity!, (player) => {
                    //     // this.prune(this.budRoot.oEntity?.entity ?? this.budRoot.oEntity?.staticProxy!);
                    //     this.harvest(this.budRoot);
                    //     // this.wrapper.component.async.setInterval(() => dispose(), 10);
                    // });
                }
            }
        } else {
            this.growthQueue.push(bud);
        }
    }

    private enqueueSegment(bud: Bud, combined: hz.Vec3, newPos: hz.Vec3) {
        if (bud.depth + 1 >= this.treeSettings.maxDepth) return;
        const isNewBranch = this.architecture.isNewBranch(bud);
        const isSympodialStop = this.architecture.isSympodialStop(bud, isNewBranch);

        if (!isSympodialStop) {
            const newBud = this.continueSegment(bud, newPos, combined);
            bud.children.push(newBud);
        }
        
        if (isNewBranch) {
            const newBud = this.createNewSegment(bud, combined, newPos);
            bud.children.push(newBud);
        }
    }

    private continueSegment(bud: Bud, newPosition: hz.Vec3, direction: hz.Vec3): Bud {
        const newBud = {
            position: newPosition,
            direction: direction,
            depth: bud.depth + 1,
            isBranchStart: false,
            axisId: bud.axisId,
            nodeIndex: bud.nodeIndex + 1,
            isBranchAxis: bud.isBranchAxis,
            axisOrder: bud.axisOrder,
            length: bud.length * this.settings.lengthDecay,
            parent: bud,
            children: [],
            oEntityList: []
        }
        this.growthQueue.push(newBud);
        return newBud;
    }

    private createNewSegment(bud: Bud, combined: hz.Vec3, newPosition: hz.Vec3): Bud {
        let axis = hz.Vec3.cross(combined, new hz.Vec3(0, 1, 0))
        if (axis.length2() < 1e-6) axis = hz.Vec3.cross(combined, new hz.Vec3(1, 0, 0));
        axis = axis.normalize();

        const roll = this.settings.rollMax;
        const branchAngle = this.settings.angle;
        const rollAngle = this.random.range(-roll, roll)
        const splitDirection = combined.rotateArround(branchAngle, axis).rotateArround(rollAngle, axis).normalize();

        const newAxisId = this.nextAxisId++;
        const newBud = {
            position: newPosition,
            direction: splitDirection,
            depth: bud.depth + 1,
            isBranchStart: true,
            axisId: newAxisId,
            nodeIndex: 0,
            isBranchAxis: true,
            axisOrder: bud.axisOrder + 1,
            length: bud.length * this.settings.lengthDecay,
            parent: bud,
            children: [],
            oEntityList: []
        }
        this.growthQueue.push(newBud);
        return newBud;
    }
}