import * as hz from "horizon/core";
import { ArchitectureSettings, GrowthSettings } from "_TreeSettings";
import { TMath } from "_TreeMath";
import { Bud } from "_TreeGrowth";

export class TreeArchitecture {
    constructor(
        private settings: ArchitectureSettings,
        private growthSettings: GrowthSettings
    ) { }

    public waitForRythmic(frameCount: number): boolean {
        if (this.settings.growthRhythm !== "Rhythmic") return false;
        const period = Math.max(1, this.settings.flushPeriodFrames);
        const burst = Math.max(1, Math.min(this.settings.flushBurstFrames, period));
        return (frameCount % period) < burst;
    }

    public applyTropism(v: hz.Vec3): hz.Vec3 {
        switch (this.settings.tropism) {
            case "Orthotropic": {
                return TMath.vAdd(
                    TMath.vScale(v, 1),
                    TMath.vScale(new hz.Vec3(0, 1, 0), 0.2)
                );
            }
            case "Plagiotropic": {
                const planar = TMath.projectOnPlane(v, new hz.Vec3(0, 1, 0));
                return TMath.vAdd(
                    TMath.vScale(v, 0.5),
                    TMath.vScale(planar, 0.5)
                );
            }
            default: return v;
        }
    }

    public isNewBranch(bud: Bud): boolean {
        const phaseOK = this.settings.branchingPhase === "Sylleptic" || bud.depth > 0;
        if (!phaseOK) return false;
        if (bud.depth + 1 >= this.growthSettings.maxDepth) return false;
        return Math.random() < this.growthSettings.branchChance;
    }

    public isSympodialStop(bud: Bud, willBranch: boolean): boolean {
        if (this.settings.mainAxis === "Sympodial" && !bud.isBranchStart && willBranch) return true;
        return false;
    }
}