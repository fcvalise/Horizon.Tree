import * as hz from "horizon/core";
import { mergeSettings, TreeSettings } from "_TreeSettings";
import { TreeRaycast } from "_TreeRaycast";
import { TreeGrowth } from "_TreeGrowth";

const DefaultSettings: TreeSettings = {
    seed: 'MyTree',
    growth: {
        maxDepth: 12,
        segmentLength: 0.6,
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
        gravitropismWeight: 0.4,
        apicalWeight: 0.4,
        jitterStrength: 0.05,
    },
    render: {
        segmentAssetId: 641971635621076,
        leafAssetId: 809883814725506,
        bottomWidth: 0.2,
        topWidth: 0.01,
        leafScale: 0.22
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

export class TreeBase {
  private component!: hz.Component;
  public settings: TreeSettings = DefaultSettings;
  private raycast!: TreeRaycast;
  private growth!: TreeGrowth;

  private updateSubscription: hz.EventSubscription | null = null;

  constructor(component: hz.Component, position: hz.Vec3, overrides?: Partial<TreeSettings>) {
    this.component = component;
    this.settings = mergeSettings(DefaultSettings, overrides!);
    this.raycast = new TreeRaycast(this.component.entity, this.component);
    this.growth = new TreeGrowth(position, this.component, this.settings, this.raycast);

    this.updateSubscription = this.component.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
        this.growth.step();
    });
  }
}