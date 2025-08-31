import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { Bud } from "_TreeGrowth";
import { TMath } from "_TreeMath";
import { LeafSettings, RenderSettings } from "_TreeSettings";
import * as hz from "horizon/core";

export class TreeLeaves {
    constructor(
        private wrapper: OWrapper,
        private renderSettings: RenderSettings,
        private settings: LeafSettings,
        private random: ORandom
    ) {
    }

    private async placeAt(bud: Bud, nodeOrigin: hz.Vec3, phiDeg: number, side: hz.Vec3, fwd: hz.Vec3): Promise<void> {
        const radial = TMath.vNorm(TMath.rotateAroundAxis(side, fwd, phiDeg));
        const basePos = TMath.vAdd(nodeOrigin, TMath.vScale(radial, Math.max(0, this.settings.petioleLength)));
        const rightX = TMath.vNorm(TMath.vCross(fwd, radial));
        const upY = TMath.vNorm(TMath.vCross(radial, rightX));
        const rot = TMath.basisToQuat(radial, upY);
        const s = this.settings.scale;
        const scale = new hz.Vec3(s, s, s);

        const id = this.renderSettings.leafAssetId!;
        // const entity = await TreePool.I.acquire(id, basePos, rot, scale);
        let entityPromise = await this.wrapper.world.spawnAsset(new hz.Asset(BigInt(id)), basePos, rot, scale);
        let entity = entityPromise[0];

        if (entity) {
            entity.as(hz.MeshEntity).style.tintColor.set(new hz.Color(0.8, 0.94, 0.1));
            // bud.oEntityList?.push(entity);
        }
    };

    public async placeLeaves(bud: Bud, forward: hz.Vec3, segLen: number): Promise<void> {
        if (!this.renderSettings.leafAssetId) return;
        const vcount = Math.max(1, this.settings.count);
        const fwd = TMath.vNorm(forward);

        let side = TMath.vCross(new hz.Vec3(0, 1, 0), fwd);
        if (TMath.vLen2(side) < 1e-6) side = TMath.vCross(new hz.Vec3(1, 0, 0), fwd);
        side = TMath.vNorm(side);
        const up = TMath.vNorm(TMath.vCross(fwd, side));
        const ph = bud.isBranchAxis ? this.settings.branchPhyllotaxy : this.settings.trunkPhyllotaxy;

        for (let v = 0; v < vcount; v++) {
            const frac = (v + 1) / (vcount + 1);
            const jitterDefault = this.settings.axialJitter
            const jitter = jitterDefault !== 0 ? this.random.range(-jitterDefault, jitterDefault) : 0;
            const nodeOrigin = TMath.vAdd(bud.position, TMath.vScale(fwd, segLen * TMath.clamp01(frac + jitter)));
            const subIndex = bud.nodeIndex * vcount + v;

            switch (ph) {
                case "Spiral": {
                    await this.placeAt(bud, nodeOrigin, subIndex * this.settings.spiralDivergence, side, fwd);
                    break;
                }
                case "Distichous": {
                    await this.placeAt(bud, nodeOrigin, (subIndex % 2 === 0) ? 0 : 180, side, fwd);
                    break;
                }
                case "OppositeDecussate": {
                    const base = (subIndex % 2 === 0) ? 0 : 90;
                    await this.placeAt(bud, nodeOrigin, base + 0, side, fwd);
                    await this.placeAt(bud, nodeOrigin, base + 180, side, fwd);
                    break;
                }
                case "Whorled": {
                    const n = Math.max(2, this.settings.whorlCount);
                    const step = 360 / n;
                    for (let i = 0; i < n; i++) {
                        await this.placeAt(bud, nodeOrigin, i * step, side, fwd);
                    }
                    break;
                }
            }
        }
    }
}