import * as hz from "horizon/core";
import "./_OMath";
import { BranchSettings, TreeSettings } from "_TreeSettings";
import { TreeArchitecture } from "_TreeArchitecture";
import { TreeTropisms } from "_TreeTropisms";
import { TreeLeaves } from "_TreeLeaves";
import { TreeEvent } from "_TreeEvent";
import { OisifManager } from "_OManager";
import { OEntity } from "_OEntity";
import { ORandom } from "_ORandom";
import { ORaycast } from "_ORaycast";
import { OWrapper } from "_OWrapper";
import { PlayerLocal } from "_PlayerLocal";
import { OColor } from "_OColor";

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

    private budMap: Map<OEntity, Bud> = new Map();
    private budRoot!: Bud;
    private isStopped: boolean = false;

    public static count = 0;

    constructor(
        private position: hz.Vec3,
        private wrapper: OWrapper,
        private treeSettings: TreeSettings,
    ) {
        this.random = new ORandom(treeSettings.seed);
        this.raycast = new ORaycast(this.wrapper);
        this.architecture = new TreeArchitecture(treeSettings, treeSettings.architecture);
        this.tropisms = new TreeTropisms(this.architecture, treeSettings.tropism, this.raycast, this.random);
        this.leaves = new TreeLeaves(this.wrapper, treeSettings, treeSettings.leaf, this.random);
        this.settings = treeSettings.branch;

        this.createRoot();

        this.wrapper.component.connectNetworkBroadcastEvent(TreeEvent.pruneTree, (payload) => {
            this.prune(payload.entity);
        });
            this.wrapper.component.connectNetworkBroadcastEvent(PlayerLocal.onTouch, (payload) => {
            this.prune(payload.hit.target);
        });
    }

    public createRoot() {
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
        if (bud.depth >= this.treeSettings.maxDepth) return;
        const combined = this.tropisms.getVector(bud);
        this.createSegment(bud, combined);
    }

    public async stop() {
        this.isStopped = true;
        await this.stopBranch(this.budRoot);
    }

    public async stopBranch(budRoot: Bud) {
        for (const bud of budRoot.children) {
            bud.isPruned = true;
            // await TreeTween.waitFor(this.component, () => Boolean(bud.created));
            // for (const entity of budRoot.oEntityList) {
            //     // await TreePool.I.release(entity);
            // }
        }
        // TreePool.I.resetAll();
    }

    public prune(entity: hz.Entity) {
        const oEntity = OisifManager.I.manager.get(entity);
        if (oEntity) {
            const budRoot = this.budMap.get(oEntity);
            if (budRoot) {
                console.log(JSON.stringify(this.settings));
                this.removeBranch(budRoot);
                if (this.settings.growAfterPrune) {
                    budRoot.children = [];
                    budRoot.oEntityList = [];
                    budRoot.isPruned = false;
                    this.growthQueue.push(budRoot);
                }
            }
        }
    }

    private async removeBranch(bud: Bud) {
        bud.isPruned = true;
        // bud.oEntity?.cancelTweens();
        // bud.oEntity?.makePhysic();
        for (const oEntity of bud.oEntityList) {
            oEntity?.cancelTweens();
            oEntity?.makePhysic();
        }
        bud.oEntityList = [];
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

    private async createSegment(bud: Bud, direction: hz.Vec3): Promise<void> {
        if (this.isPrunedParent(bud)) return;
        if (this.raycast.cast(bud.position, this.tropisms.sunDir(), bud.length * 4)) {
            bud.length *= 0.8;
        }
        if (bud.length < this.settings.length * 0.2) return;
        
        if (OisifManager.I.pool.count() > 0) {
            if (!bud.oEntity) {
                bud.oEntity = OisifManager.I.manager.create();
            }
            if (bud.oEntity && bud.oEntity.makeDynamic()) {
                const nextPosition = bud.position.add(direction.mul(bud.length));
                const forward = nextPosition.sub(bud.position).normalize();
                const t = bud.depth / Math.max(1, this.treeSettings.maxDepth);
                const width = Number.lerp(this.settings.bottomWidth, this.settings.topWidth, t) * (bud.length / this.settings.length);

                bud.oEntity.position = bud.position;
                bud.oEntity.rotation = hz.Quaternion.lookRotation(forward);
                bud.oEntity.scale = new hz.Vec3(width, width, bud.length);
                bud.oEntity.color = OColor.Black;
                bud.oEntityList.push(bud.oEntity);
                this.budMap.set(bud.oEntity, bud);
                bud.oEntity.scaleZeroTo(bud.oEntity.scale, this.random.range(1, 4))
                .then(() => {
                    this.leaves.placeLeaves(bud, direction, bud.length);

                    this.enqueueSegment(bud, direction, nextPosition);
                });
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