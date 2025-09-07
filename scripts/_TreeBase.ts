import * as hz from "horizon/core";
import { Library } from "_Library";
import { RNG } from "_RNG";
import { OWrapper } from "_OWrapper";
import { TreeSettings } from "_TreeSettings";
import { TreeGrowth } from "_TreeGrowth";
import { ORaycast } from "_ORaycast";
import { OEntityManager } from "_OEntityManager";
import { ORandom } from "_ORandom";

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
        minBranch: 0.4,
        scale: 1.6,
        count: 2,
        petioleLength: 0.1,
        axialJitter: 0.08,
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

const pick = <T>(arr: readonly T[]): T =>
arr[Math.floor(RNG.get().range(0, arr.length))];

export function cloneSettings(settings: TreeSettings): TreeSettings {
  return JSON.parse(JSON.stringify(settings)) as TreeSettings;
}

export class TreeBase {
    public settings: TreeSettings = DefaultSettings;
    public isGrowing: boolean = true;
    private growth!: TreeGrowth;

    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        position: hz.Vec3,
        overrides?: Partial<TreeSettings>
    ) {
        const random = new ORandom(position.x * position.z * position.y);
        // this.settings = mergeSettings(DefaultSettings, this.getRandomSettings(position));
        this.settings = cloneSettings(DefaultSettings);
        this.settings.branch.length = random.range(1, 4);
        this.settings.branch.bottomWidth = random.range(0.4, 0.7);
        this.settings.leaf.scale = random.range(1.2, 2);
        this.addShadow(position);
        this.growth = new TreeGrowth(position, wrapper, manager, this.settings);
        this.wrapper.onUpdateUntil(() => this.growth.step(), () => !this.isGrowing);

        // this.component.connectNetworkBroadcastEvent(TreeEvent.spawnTreeDescription, (payload) => {
        //     this.createTreeDescription(payload.position);
        // });
        // this.createTreeDescription(position.add(hz.Vec3.up.add(hz.Vec3.forward)));
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

    getRandomSettings(position: hz.Vec3) {
        return {
            seed: `${position.z * position.x * position.y * 127326542734}`,
            maxDepth: 7,
            branch: {
                initialCount: RNG.get().range(1, 4),
                length: RNG.get().range(0.4, 2),
                lengthDecay: RNG.get().range(0.5, 0.9),
                bottomWidth: RNG.get().range(0.1, 0.25),
                topWidth: RNG.get().range(0.001, 0.1),
                chance: RNG.get().range(0, 0.9),
                angle: RNG.get().range(10, 90),
                rollMax: 15,
                growAfterPrune: false
            },
            tropism: {
                raysPerBud: 50,
                phototropismWeight: RNG.get().range(0.6, 1),
                phototropismBoost: 10,
                gravitropismWeight: RNG.get().range(0.2, 0.8),
                apicalWeight: RNG.get().range(0.2, 0.8),
                jitterStrength: RNG.get().range(0.01, 0.2),
            },
            render: {
                segmentAssetId: Library.matter,
                leafAssetId: Library.matter,
                leafScale: RNG.get().range(0.3, 1.2)
            },
            architecture: {
                growthRhythm: pick(["Continuous", "Rhythmic"] as const),
                flushPeriodFrames: Math.floor(RNG.get().range(8, 24)),
                flushBurstFrames: Math.floor(RNG.get().range(2, 8)),
                tropism: pick(["Orthotropic", "Plagiotropic", "None"] as const),
                mainAxis: pick(["Monopodial", "Sympodial"] as const),
                branchingPhase: pick(["Sylleptic", "Proleptic"] as const),
            },
        };
    }
}