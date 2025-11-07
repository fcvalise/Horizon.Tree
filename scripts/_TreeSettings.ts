import * as hz from "horizon/core";

export type BranchSettings = {
    initialCount: number;
    length: number;
    lengthDecay: number;
    bottomWidth: number;
    topWidth: number;
    chance: number;
    angle: number;
    rollMax: number;
    color: hz.Color;
    growAfterPrune: boolean;
    growSpeed: number;
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
};
export type LeafSettings = {
    minBranch: number;
    scale: number;
    count: number;
    petioleLength: number;
    axialJitter: number;
    spiralDivergence: number;
    whorlCount: number;
    branchPhyllotaxy: "Spiral" | "Distichous" | "OppositeDecussate" | "Whorled";
    trunkPhyllotaxy: "Spiral" | "Distichous" | "OppositeDecussate" | "Whorled";
};
export type FlowerStyle = "disc" | "cup" | "cone" | "bell";
export type FlowerSettings = {
  scale: number;                 // e.g. 0.25
  peduncleLength: number;        // e.g. 0.06
  tiltDeg?: number;              // default ~8
  style?: FlowerStyle;           // default "disc"
  petalCount?: number;           // default 5
  petalRadius?: number;          // default ≈ scale * 0.8
  petalAngleJitterDeg?: number;  // default 6
  petalSizeJitter?: number;      // default 0.10 (±10%)
  petalBrightness?: number;      // default 3
  petalColor?: hz.Color;         // default OColor.White
  centerColor?: hz.Color;        // default OColor.Orange
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
    maxDepth: number;
    branch: BranchSettings;
    tropism: TropismSettings;
    render: RenderSettings;
    leaf: LeafSettings;
    flower: FlowerSettings;
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