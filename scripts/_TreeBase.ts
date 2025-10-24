import * as hz from "horizon/core";
import { Library } from "_Library";
import { OWrapper } from "_OWrapper";
import { TreeSettings } from "_TreeSettings";
import { TreeGrowth } from "_TreeGrowth";
import { ORaycast } from "_ORaycast";
import { OEntityManager } from "_OEntityManager";
import { ORandom } from "_ORandom";
import { OInteractableManager } from "_OInteractableManager";
import { Ease, OEntity } from "_OEntity";
import { OColor } from "_OColor";
import { OUtils } from "_OUtils";

const DefaultSettings: TreeSettings = {
    seed: 'MyTree',
    maxDepth: 4,
    branch: {
        initialCount: 1,
        length: 1.9,
        lengthDecay: 0.98,
        bottomWidth: 0.4,
        topWidth: 0.05,
        chance: 0.4,
        angle: 40,
        rollMax: 15,
        growAfterPrune: false
    },
    tropism: {
        raysPerBud: 50,
        phototropismWeight: 1,
        phototropismBoost: 10,
        gravitropismWeight: 0.2,
        apicalWeight: 0.2,
        jitterStrength: 0.05,
    },
    render: {
        segmentAssetId: Library.matter,
        leafAssetId: Library.matter,
    },
    leaf: {
        minBranch: 0.2,
        scale: 6,
        count: 4,
        petioleLength: 0,
        axialJitter: 0.2,
        spiralDivergence: 137.5,
        whorlCount: 3,
        branchPhyllotaxy: "Spiral",
        trunkPhyllotaxy: "Spiral"
    },
    architecture: {
        growthRhythm: "Rhythmic",
        flushPeriodFrames: 12,
        flushBurstFrames: 4,
        tropism: "Orthotropic",
        mainAxis: "Monopodial",
        branchingPhase: "Sylleptic"
    },
};

export function cloneSettings(settings: TreeSettings): TreeSettings {
  return JSON.parse(JSON.stringify(settings)) as TreeSettings;
}

export class TreeBase {
    private settings: TreeSettings = DefaultSettings;

    private isGrowing: boolean = false;
    private unlockable!: OEntity;
    private growth!: TreeGrowth;

    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private interactable: OInteractableManager,
        public position: hz.Vec3,
        overrides?: Partial<TreeSettings>
    ) {
        const random = new ORandom(position.x * position.z * position.y);
        // this.settings = mergeSettings(DefaultSettings, this.getRandomSettings(position));
        this.settings = cloneSettings(DefaultSettings);
        this.settings.branch.length = random.range(2, 4);
        this.settings.branch.bottomWidth = random.range(0.4, 0.7);
        this.settings.leaf.scale = random.range(2, 4);

        this.createUnlockable(position);

        this.growth = new TreeGrowth(position, wrapper, manager, this.interactable, this.settings);
        // this.wrapper.onUpdate(() => {
        //     if (this.isGrowing) this.growth.step()
        // });

        // this.component.connectNetworkBroadcastEvent(TreeEvent.spawnTreeDescription, (payload) => {
        //     this.createTreeDescription(payload.position);
        // });
        // this.createTreeDescription(position.add(hz.Vec3.up.add(hz.Vec3.forward)));
    }

    public async startGrowth() {
        if (!this.isGrowing) {
            await OUtils.waitFor(this.wrapper, () => this.unlockable.makeDynamic());
            this.addShadow(this.position);
            await this.unlockable.tweenTo({
                duration: 1.4,
                position: this.position,
                scale: hz.Vec3.zero,
                ease: Ease.quadInOut,
            });
            this.isGrowing = true;
            this.unlockable.makeInvisible();
            this.wrapper.onUpdateUntil(() => this.growth.step(), () => !this.isGrowing);
        }
    }

    private async createUnlockable(position: hz.Vec3) {
        const oEntity = this.manager.create();
        oEntity.position = position;
        oEntity.rotation = hz.Quaternion.lookRotation(hz.Vec3.down);
        oEntity.scale = hz.Vec3.zero;
        oEntity.color = OColor.Black;
        this.unlockable = oEntity;

        await OUtils.waitFor(this.wrapper, () => oEntity.makeDynamic());
            // oEntity.playMelody();
        await oEntity.tweenTo({
            duration: 0.4,
            position: position.add(hz.Vec3.up),
            scale: new hz.Vec3(0.3, 0.3, 1),
            ease: Ease.quadInOut,
            makeStatic: true
        });
    }

    private addShadow(position: hz.Vec3) {
        const raycast = new ORaycast(this.wrapper);
        const hit = raycast.cast(position.add(hz.Vec3.up), hz.Vec3.down);
        if (hit) {
            const asset = new hz.Asset(BigInt(Library.shadow));
            const forward = hit.target.forward.get();
            const right = hit.target.right.get();
            const rotation = hz.Quaternion.lookRotation(forward.rotateArround(180, right));
            const scale = hz.Vec3.one.mul(this.settings.branch.length);
            const position = hit.hitPoint.add(hz.Vec3.up.mul(0.05));

            this.wrapper.world.spawnAsset(asset, position, rotation, scale)
            .then((promise) => { });
        }
    }

    public getUnlockableOEntity(): OEntity {
        return this.unlockable!;
    }

    // createTreeDescription(position: hz.Vec3) {
    //     const asset = new hz.Asset(BigInt(Library.treeDescription));
    //     const scale = new hz.Vec3(1, 1, 0.2);
    //     this.component.world.spawnAsset(asset, position, hz.Quaternion.zero, scale)
    //     .then((entityArray) => {
    //         const treeDescription = new TreeDescription(this.settings);
    //         const description = StringHelper.formatParagraph(treeDescription.description, 100);
    //         console.log(description);
            
    //         entityArray[0].children.get()[0].as(hz.TextGizmo).text.set(description);
    //     });
    // }
}