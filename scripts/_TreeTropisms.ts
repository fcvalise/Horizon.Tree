import * as hz from "horizon/core";
import { Bud } from "_TreeGrowth";
import { TMath } from "_TreeMath";
import { TreeRaycast } from "_TreeRaycast";
import { TropismSettings } from "_TreeSettings";
import { RNG } from "_RNG";
import { TreeArchitecture } from "_TreeArchitecture";

export class TreeTropisms {
    constructor(
        private architecture: TreeArchitecture,
        private settings: TropismSettings,
        private raycast: TreeRaycast,
        private rng: RNG
    ) { }

    public sunDir(): hz.Vec3 { return new hz.Vec3(0, 1, 0); }

    public getVector(bud: Bud): hz.Vec3 {
        let phototropism = this.computePhototropism(bud)
        phototropism = this.architecture.applyTropism(phototropism);
        const gravitropism = this.computeGravitropism();
        const apical = this.computeApical(bud);
        const jitter = this.computeJitter();

        const combined = TMath.vAdd(TMath.vAdd(phototropism, gravitropism),TMath.vAdd(apical, jitter));
        return TMath.vNorm(combined);
    }

    private computePhototropism(bud: Bud): hz.Vec3 {
        const rayCount = Math.max(1, this.settings.raysPerBud);
        let bestDir = TMath.vNorm(this.sunDir());
        let maxDistance = 0;
        const raycastDistance = 10;

        for (let i = 0; i < rayCount; i++) {
            const randomDir = TMath.vScale(this.rng.vector(), 0.5 + i / rayCount);
            const sunDir = this.sunDir();
            const sampleDir = TMath.vNorm(TMath.vAdd(sunDir, randomDir));
            const hit = this.raycast.cast(bud.pos, sampleDir, raycastDistance);
            
            if (!hit) {
                maxDistance = raycastDistance;
                bestDir = sampleDir;
            } else if (hit.distance > maxDistance) {
                maxDistance = hit.distance;
                bestDir = sampleDir;
            }
        }
        const w = this.settings.phototropismWeight;
        const b = this.settings.phototropismBoost;
        const weight = w + b * (1 - maxDistance / raycastDistance);
        
        // this.raycast.debug(bud.pos, bestDir);
        return TMath.vScale(bestDir, weight);
    }

    private computeGravitropism(): hz.Vec3 {
        return TMath.vScale(hz.Vec3.up, this.settings.gravitropismWeight);
    }

    private computeApical(bud: Bud): hz.Vec3 {
        return TMath.vScale(bud.dir, this.settings.apicalWeight);
    }

    private computeJitter(): hz.Vec3 {
        return TMath.vScale(this.rng.vector(), this.settings.jitterStrength);
    }
}