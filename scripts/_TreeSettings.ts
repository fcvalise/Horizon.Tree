export type GrowthSettings = {
    maxDepth: number;
    segmentLength: number;
    segmentLengthDecay: number;
    initialBudCount: number;
    branchChance: number;
    branchAngle: number;
    branchRollMax: number;
    growAfterPrune: boolean;
};
export type TropismSettings = {
    raysPerBud: number;
    phototropismWeight: number;
    phototropismBoost: number;
    gravitropismWeight: number;
    apicalWeight: number;
    jitterStrength: number;
};
export type RenderSettings = {
    segmentAssetId: number;
    leafAssetId?: number;
    bottomWidth: number;
    topWidth: number;
    leafScale: number;
};
export type LeafSettings = {
    virtualNodesPerSegment: number;
    petioleLength: number;
    axialJitter: number;
    spiralDivergence: number;
    whorlCount: number;
    branchPhyllotaxy: "Spiral" | "Distichous" | "OppositeDecussate" | "Whorled";
    trunkPhyllotaxy: "Spiral" | "Distichous" | "OppositeDecussate" | "Whorled";
};
export type ArchitectureSettings = {
    growthRhythm: "Continuous" | "Rhythmic";
    flushPeriodFrames: number;
    flushBurstFrames: number;
    tropism: "Orthotropic" | "Plagiotropic" | "None";
    mainAxis: "Sympodial" | "Monopodial";
    branchingPhase: "Sylleptic" | "Proleptic";
};
export type TreeSettings = {
    seed: string;
    growth: GrowthSettings;
    tropism: TropismSettings;
    render: RenderSettings;
    leaf: LeafSettings;
    architecture: ArchitectureSettings;
};

export function mergeSettings(base: TreeSettings, patch: Partial<TreeSettings>): TreeSettings {
    const clone: any = JSON.parse(JSON.stringify(base));
    const merge = (a: any, b: any) => {
        Object.keys(b || {}).forEach((k) => {
            if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { a[k] = a[k] || {}; merge(a[k], b[k]); }
            else { a[k] = b[k]; }
        });
    };
    merge(clone, patch);
    return clone as TreeSettings;
}