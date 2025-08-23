import * as hz from "horizon/core";
import { TreeRaycast } from "_TreeRaycast";
import { TreeSettings } from "_TreeSettings";
import { TMath } from "_TreeMath";
import { TreeArchitecture } from "_TreeArchitecture";
import { RNG } from "_RNG";
import { TreeTropisms } from "_TreeTropisms";
import { TreeLeaves } from "_TreeLeaves";
import { TreePool } from "_TreePool";
import { TreeEvent } from "_TreeEvent";
import { TreeTween } from "_TreeTween";

export type Bud = {
    pos: hz.Vec3;
    dir: hz.Vec3;
    depth: number;
    isBranchStart: boolean;
    axisId: number;
    nodeIndex: number;
    isBranchAxis: boolean;
    axisOrder: number;
    length: number;
    parent?: Bud;
    children: Bud[];
    entityList: hz.Entity[];
    created?: boolean;
    isPruned?: boolean;
};

export const treeTag = "Tree";

export class TreeGrowth {
    private rng!: RNG;
    private frameCount: number = 0;
    private growthQueue: Bud[] = [];
    private nextAxisId = 1;

    private architecture!: TreeArchitecture;
    private tropisms!: TreeTropisms;
    private leaves!: TreeLeaves;

    private budMap: Map<hz.Entity, Bud> = new Map();
    private budRoot!: Bud;
    private isStopped: boolean = false;

    constructor(
        private position: hz.Vec3,
        private component: hz.Component,
        private settings: TreeSettings,
        private raycast: TreeRaycast
    ) {
        this.rng = new RNG(settings.seed);
        this.architecture = new TreeArchitecture(settings.architecture, settings.growth);
        this.tropisms = new TreeTropisms(this.architecture, settings.tropism, raycast, this.rng);
        this.leaves = new TreeLeaves(component, settings.render, settings.leaf, this.rng);

        this.createRoot();
    }

    public createRoot() {
        this.growthQueue = [];
        for (let i = 0; i < this.settings.growth.initialBudCount; i++) {
            const baseUp = hz.Vec3.up;
            const rootPos = this.position;
            const dir = hz.Vec3.normalize(baseUp);
            const newBud = {
                pos: rootPos,
                dir: dir,
                depth: 0,
                isBranchStart: false,
                axisId: this.nextAxisId++,
                nodeIndex: 0,
                isBranchAxis: false,
                axisOrder: 0,
                length: this.settings.growth.segmentLength,
                parent: undefined,
                children: [],
                entityList: [],
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
        if (bud.depth >= this.settings.growth.maxDepth) return;
        let combined = this.tropisms.getVector(bud);
        this.createSegment(bud, combined);
    }

    public async stop() {
        this.isStopped = true;
        await this.stopBranch(this.budRoot);
    }

    public async stopBranch(budRoot: Bud) {
        for (const bud of budRoot.children) {
            bud.isPruned = true;
            await TreeTween.waitFor(this.component, () => Boolean(bud.created));
            for (const entity of budRoot.entityList) {
                await TreePool.I.release(entity);
            }
        }
        // TreePool.I.resetAll();
    }

    public prune(entity: hz.Entity) {
        const budRoot = this.budMap.get(entity);
        if (budRoot) {
            this.removeBranch(budRoot);
            if (this.settings.growth.growAfterPrune) {
                budRoot.children = [];
                budRoot.entityList = [];
                budRoot.isPruned = false;
                this.growthQueue.push(budRoot);
            }
        }
    }

    private async removeBranch(bud: Bud) {
        bud.isPruned = true;
        await TreeTween.waitFor(this.component, () => Boolean(bud.created));
        for (const entity of bud.entityList) {
            TreePool.I.release(entity);
        }
        bud.entityList = [];
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

    private async createSegment(bud: Bud, dir: hz.Vec3): Promise<void> {
        if (this.isPrunedParent(bud)) return;
        if (this.raycast.cast(bud.pos, this.tropisms.sunDir(), bud.length * 4)) {
            bud.length *= 0.8;
        }
        if (bud.length < this.settings.growth.segmentLength * 0.2) return;
        const pos = bud.pos;
        const newPos = TMath.vAdd(bud.pos, TMath.vScale(dir, bud.length));
        const fwd = hz.Vec3.normalize(TMath.vSub(newPos, bud.pos));
        const rot = TMath.lookRotation(fwd, new hz.Vec3(0, 1, 0));
        const t = bud.depth / Math.max(1, this.settings.growth.maxDepth);
        let width = TMath.lerp(this.settings.render.bottomWidth, this.settings.render.topWidth, t);
        width *= bud.length / this.settings.growth.segmentLength;
        const scale = new hz.Vec3(width, width, bud.length);

        const id = this.settings.render.segmentAssetId;
        let entity = await TreePool.I.acquire(id, pos, rot, scale, bud.depth == 0 || bud.isBranchStart);
        if (entity) {
            await TreeTween.waitFor(this.component, () => TreePool.I.isScaled(entity!));
            bud.entityList.push(entity);
            this.budMap.set(entity, bud);
    
            this.component.connectCodeBlockEvent(entity, hz.CodeBlockEvents.OnGrabStart, () => {
                this.prune(entity!);
            });
    
            if (bud.depth / this.settings.growth.maxDepth > 0.5 && bud.length > this.settings.growth.segmentLength * 0.4) {
                await this.leaves.placeLeaves(bud, dir, bud.length);
            }
            bud.created = true;
            this.enqueueSegment(bud, dir, newPos);
        } else {
            this.growthQueue.push(bud);
        }
    }

    private enqueueSegment(bud: Bud, combined: hz.Vec3, newPos: hz.Vec3) {
        if (bud.depth + 1 >= this.settings.growth.maxDepth) return;
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

    private continueSegment(bud: Bud, newPos: hz.Vec3, dir: hz.Vec3): Bud {
        const newBud = {
            pos: newPos,
            dir: dir,
            depth: bud.depth + 1,
            isBranchStart: false,
            axisId: bud.axisId,
            nodeIndex: bud.nodeIndex + 1,
            isBranchAxis: bud.isBranchAxis,
            axisOrder: bud.axisOrder,
            length: bud.length * this.settings.growth.segmentLengthDecay,
            parent: bud,
            children: [],
            entityList: []
        }
        this.growthQueue.push(newBud);
        return newBud;
    }

    private createNewSegment(bud: Bud, combined: hz.Vec3, newPos: hz.Vec3): Bud {
        let axis = TMath.vCross(combined, new hz.Vec3(0, 1, 0));
        if (TMath.vLen2(axis) < 1e-6) axis = TMath.vCross(combined, new hz.Vec3(1, 0, 0));
        axis = hz.Vec3.normalize(axis);

        const roll = this.settings.growth.branchRollMax;
        const branchAngle = this.settings.growth.branchAngle;
        const rollAngle = this.rng.range(-roll, roll)
        let split = TMath.rotateAroundAxis(combined, axis, branchAngle);
        split = TMath.rotateAroundAxis(split, combined, rollAngle);
        split = hz.Vec3.normalize(split);

        const newAxisId = this.nextAxisId++;
        const newBud = {
            pos: newPos,
            dir: split,
            depth: bud.depth + 1,
            isBranchStart: true,
            axisId: newAxisId,
            nodeIndex: 0,
            isBranchAxis: true,
            axisOrder: bud.axisOrder + 1,
            length: bud.length * this.settings.growth.segmentLengthDecay,
            parent: bud,
            children: [],
            entityList: []
        }
        this.growthQueue.push(newBud);
        return newBud;
    }
}