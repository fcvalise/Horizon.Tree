import * as hz from "horizon/core";
import { mergeSettings, TreeSettings } from "_TreeSettings";
import { TreeRaycast } from "_TreeRaycast";
import { TreeGrowth } from "_TreeGrowth";
import { Library } from "_Library";
import { RNG } from "_RNG";
import { TreeEvent } from "_TreeEvent";
import { Binding } from "horizon/ui";
import { TreeDescription } from "_TreeDescription";
import { StringHelper } from "_StringHelper";

const DefaultSettings: TreeSettings = {
    seed: 'MyTree',
    growth: {
        maxDepth: 8,
        segmentLength: 0.9,
        segmentLengthDecay: 0.98,
        initialBudCount: 1,
        branchChance: 0.4,
        branchAngle: 40,
        branchRollMax: 15,
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
        bottomWidth: 0.2,
        topWidth: 0.01,
        leafScale: 0.8
    },
    leaf: {
        virtualNodesPerSegment: 2,
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

export class TreeBase {
    private component!: hz.Component;
    public settings: TreeSettings = DefaultSettings;
    private raycast!: TreeRaycast;
    private growth!: TreeGrowth;

    private updateSubscription: hz.EventSubscription | null = null;

    constructor(component: hz.Component, position: hz.Vec3, overrides?: Partial<TreeSettings>) {
        this.component = component;
        this.settings = mergeSettings(DefaultSettings, this.getRandomSettings(position));
        this.raycast = new TreeRaycast(this.component.entity, this.component);
        this.growth = new TreeGrowth(position, this.component, this.settings, this.raycast);

        this.updateSubscription = this.component.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
            this.growth.step();
        });

        this.component.connectNetworkBroadcastEvent(TreeEvent.spawnTreeDescription, (payload) => {
            this.createTreeDescription(payload.position);
        });
        this.createTreeDescription(position.add(hz.Vec3.up.add(hz.Vec3.forward)));
    }

    createTreeDescription(position: hz.Vec3) {
        const asset = new hz.Asset(BigInt(Library.treeDescription));
        const scale = new hz.Vec3(1, 1, 0.2);
        this.component.world.spawnAsset(asset, position, hz.Quaternion.zero, scale)
        .then((entityArray) => {
            const treeDescription = new TreeDescription(this.settings);
            const description = StringHelper.formatParagraph(treeDescription.description, 100);
            console.log(description);
            
            entityArray[0].children.get()[0].as(hz.TextGizmo).text.set(description);
        });
    }

    getRandomSettings(position: hz.Vec3) {
        return {
            seed: `${position.z * position.x * position.y * 127326542734}`,
            growth: {
                maxDepth: 7,
                segmentLength: RNG.get().range(0.4, 2),
                segmentLengthDecay: RNG.get().range(0.5, 0.9),
                initialBudCount: RNG.get().range(1, 4),
                branchChance: RNG.get().range(0, 0.9),
                branchAngle: RNG.get().range(10, 90),
                branchRollMax: 15,
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
                bottomWidth: RNG.get().range(0.1, 0.25),
                topWidth: RNG.get().range(0.001, 0.1),
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