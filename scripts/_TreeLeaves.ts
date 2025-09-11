import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { Bud } from "_TreeGrowth";
import { LeafSettings, TreeSettings } from "_TreeSettings";
import { OColor } from "_OColor";
import { OEntityManager } from "_OEntityManager";

export class TreeLeaves {
    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private treeSettings: TreeSettings,
        private settings: LeafSettings,
        private random: ORandom
    ) {
    }

    private async placeAt(bud: Bud, nodeOrigin: hz.Vec3, phiDeg: number, side: hz.Vec3, forward: hz.Vec3): Promise<void> {
        if (this.manager.hasAvailable()) {
            const oEntity = this.manager.create();
            if (oEntity.makeDynamic()) {
                const radial = side.rotateArround(phiDeg, forward);
                const rightX = hz.Vec3.cross(forward, radial).normalize();
                const upY = hz.Vec3.cross(radial, rightX).normalize();
                oEntity.position = nodeOrigin.add(radial.mul(this.settings.petioleLength));
                oEntity.rotation = hz.Quaternion.lookRotation(radial, upY);
                oEntity.scale = hz.Vec3.one.mul(this.settings.scale);
                oEntity.color = OColor.LightGreen;
                bud.oEntityList?.push(oEntity);
                oEntity.setTags(['Leaf'])
                oEntity.scaleZeroTo(oEntity.scale, this.random.range(1, 4));
            }
        } else {
            this.placeAt(bud, nodeOrigin, phiDeg, side, forward);
        }
    };

    public async placeLeaves(bud: Bud, forward: hz.Vec3): Promise<void> {
        if (bud.depth / this.treeSettings.maxDepth < this.settings.minBranch) return; // && bud.length > this.settings.growth.segmentLength * 0.4) {

        const vcount = Math.max(1, this.settings.count);
        forward = forward.normalize();

        let side = hz.Vec3.cross(hz.Vec3.up, forward).normalize();//TMath.vCross(new hz.Vec3(0, 1, 0), forward);
        if (side.length2() < 1e-6) side = hz.Vec3.cross(hz.Vec3.right, forward).normalize();// TMath.vCross(new hz.Vec3(1, 0, 0), forward);
        const up = hz.Vec3.cross(forward, side).normalize();
        const ph = bud.isBranchAxis ? this.settings.branchPhyllotaxy : this.settings.trunkPhyllotaxy;

        for (let v = 0; v < vcount; v++) {
            const frac = (v + 1) / (vcount + 1);
            const jitterDefault = this.settings.axialJitter
            const jitter = jitterDefault !== 0 ? this.random.range(-jitterDefault, jitterDefault) : 0;
            const nodeOrigin = bud.position.add(forward.mul(bud.length * (frac + jitter).clamp01()));
            const subIndex = bud.nodeIndex * vcount + v;

            switch (ph) {
                case "Spiral": {
                    await this.placeAt(bud, nodeOrigin, subIndex * this.settings.spiralDivergence, side, forward);
                    break;
                }
                case "Distichous": {
                    await this.placeAt(bud, nodeOrigin, (subIndex % 2 === 0) ? 0 : 180, side, forward);
                    break;
                }
                case "OppositeDecussate": {
                    const base = (subIndex % 2 === 0) ? 0 : 90;
                    await this.placeAt(bud, nodeOrigin, base + 0, side, forward);
                    await this.placeAt(bud, nodeOrigin, base + 180, side, forward);
                    break;
                }
                case "Whorled": {
                    const n = Math.max(2, this.settings.whorlCount);
                    const step = 360 / n;
                    for (let i = 0; i < n; i++) {
                        await this.placeAt(bud, nodeOrigin, i * step, side, forward);
                    }
                    break;
                }
            }
        }
    }
}