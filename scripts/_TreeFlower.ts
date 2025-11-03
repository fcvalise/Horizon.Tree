import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { Bud } from "_TreeGrowth";
import { FlowerSettings, TreeSettings } from "_TreeSettings";
import { OColor } from "_OColor";
import { OEntityManager } from "_OEntityManager";
import { Ease, OEntity } from "_OEntity";

type FlowerStyle = "disc" | "cup" | "cone" | "bell";

export class TreeFlowers {
    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager,
        private treeSettings: TreeSettings,
        private settings: FlowerSettings,
        private random: ORandom
    ) { }

    private isTerminalBud(bud: Bud): boolean {
        return bud.depth == this.treeSettings.maxDepth - 1;
    }

    private styleScale(style: FlowerStyle, base: number): hz.Vec3 {
        switch ((this.settings.style as FlowerStyle) ?? "disc") {
            case "disc": return new hz.Vec3(base * 1.00, base * 1.00, base * 0.10);
            case "cup":  return new hz.Vec3(base * 0.85, base * 0.95, base * 0.12);
            case "cone": return new hz.Vec3(base * 0.70, base * 1.20, base * 0.10);
            case "bell": return new hz.Vec3(base * 0.90, base * 1.00, base * 0.10);
        }
    }

    private styleLean(up: hz.Vec3, side: hz.Vec3, forward: hz.Vec3): hz.Vec3 {
        const style = (this.settings.style as FlowerStyle) ?? "disc";
        switch (style) {
            case "cone": return up.rotateArround(8, side);     // a little forward lean
            case "bell": return up.rotateArround(-18, side);   // a little downward
            case "cup":  return up.rotateArround(5, side);     // subtle upright bias
            default:     return up;                             // disc: flat
        }
    }

    private async createCenteredDisk(
        pos: hz.Vec3,
        rot: hz.Quaternion,
        refScale: hz.Vec3,
        color: hz.Color,
        delayRange: [number, number] = [0.02, 0.06],
        durRange: [number, number] = [0.45, 0.75]
    ): Promise<OEntity | undefined> {
        if (!this.manager.hasAvailable()) return undefined;

        const center = this.manager.create();
        if (!center.makeDynamic()) return undefined;

        center.position = pos;
        center.rotation = rot;
        center.color = OColor.Orange;
        center.scale = hz.Vec3.zero;

        const centerScale = new hz.Vec3(
            refScale.x,
            refScale.y,
            refScale.z * 1.25
        );

        await center.tweenTo({
            duration: this.random.range(durRange[0], durRange[1]),
            scale: centerScale,
            makeStatic: false,
            ease: Ease.cubicOut,
        });

        return center;
    }

    private async placeAtTip(
        bud: Bud,
        tipPos: hz.Vec3,
        forward: hz.Vec3,
        sideRef: hz.Vec3
    ): Promise<void> {
        if (this.settings.scale == 0) return;
        const petalCount = Math.max(1, this.settings.petalCount ?? 5);
        let needed = petalCount + 1; // + center
        let available = 0;
        while (this.manager.hasAvailable()) {
            available++;
            if (available >= needed) break;
        }
        if (available < needed) {
            this.wrapper.setTimeout(() => this.placeAtTip(bud, tipPos, forward, sideRef), 0);
            return;
        }

        const fwd = forward.normalize();
        const side0 = sideRef.length2() < 1e-6
            ? hz.Vec3.cross(hz.Vec3.right, fwd).normalize()
            : sideRef.normalize();
        const up0 = hz.Vec3.cross(fwd, side0).normalize();

        const peduncle = this.settings.peduncleLength;
        const posCenter = tipPos.add(fwd.mul(peduncle));

        const tilt = (this.settings.tiltDeg ?? 8);
        const base = this.settings.scale;
        const petalBaseScale = this.styleScale((this.settings.style as FlowerStyle) ?? "disc", base);
        const ringRadius = this.settings.petalRadius ?? (base * 0.51); // outward offset from center
        const angleJitter = this.settings.petalAngleJitterDeg ?? 6;
        const sizeJitter = this.settings.petalSizeJitter ?? 0.1; // ±10%

        const petalDurMin = 0.6, petalDurMax = 1.0;

        // color
        const petalColor = this.settings.petalColor ?? OColor.White;
        const centerColor = this.settings.centerColor ?? OColor.Orange;

        const petalPromises: Promise<any>[] = [];

        for (let i = 0; i < petalCount; i++) {
            if (!this.manager.hasAvailable()) break;

            const petal = this.manager.create();
            if (!petal.makeDynamic()) continue;

            // radial basis for this petal
            const baseAngle = (360 / petalCount) * i;
            const phi = baseAngle + this.random.range(-angleJitter, angleJitter);
            const radial = side0.rotateArround(phi, fwd);
            const rightX = hz.Vec3.cross(fwd, radial).normalize();
            let upY = hz.Vec3.cross(radial, rightX).normalize();

            // style lean + random tilt for this petal
            upY = this.styleLean(upY, rightX, fwd);
            const tiltSide = radial.rotateArround(this.random.range(-tilt, tilt), fwd);
            const tiltUp = upY.rotateArround(this.random.range(-tilt, tilt), fwd);
            const basisUp = tiltUp.add(hz.Vec3.up).normalize();

            // petal position slightly out from center along radial
            const offset = ringRadius;
            const petalPos = posCenter.add(radial.mul(offset));

            // slight independent size jitter
            const jitter = 1 + this.random.range(-sizeJitter, sizeJitter);
            const petalScale = new hz.Vec3(
                petalBaseScale.x * jitter,
                petalBaseScale.y * jitter,
                petalBaseScale.z * jitter
            );

            // configure & animate
            petal.position = petalPos;
            petal.rotation = hz.Quaternion.lookRotation(basisUp, tiltSide);
            petal.scale = hz.Vec3.zero;
            petal.color = OColor.Pink;
            petal.brightness = this.settings.petalBrightness ?? 3;
            petal.setTags(["Flower", "Petal"]);

            const delay = this.random.range(0, 0.2); // light cascade looks nice
            this.wrapper.setTimeout(() => {
                const p = petal.tweenTo({
                    duration: this.random.range(petalDurMin, petalDurMax),
                    scale: petalScale,
                    makeStatic: false,
                    ease: Ease.cubicOut,
                }).then(() => {
                    this.manager.makeCollectible(petal);
                })
                petalPromises.push(p);
                bud.oEntityList?.push(petal);
            }, delay);

        }

        // // center disk last (little “pop”)
        // const center = await this.createCenteredDisk(
        //     posCenter,
        //     hz.Quaternion.lookRotation(forward),
        //     petalBaseScale,
        //     centerColor
        // );
        // if (center) bud.oEntityList?.push(center);

        await Promise.all(petalPromises);

        // Optional: make petals collectible (or only center). Here we keep center decorative
        // and make petals collectible for gameplay feedback:
        // If you prefer the inverse, swap it.
                // for (const e of bud.oEntityList ?? []) {
                //     if (e.tags.includes("Petal")) {
                //         this.manager.makeCollectible(e);
                //     }
                // }
    }

    public async placeFlower(bud: Bud, forward: hz.Vec3): Promise<void> {
        if (!this.isTerminalBud(bud)) return;

        const fwd = forward.normalize();
        const tip = bud.position.add(fwd.mul(bud.length));

        let side = hz.Vec3.cross(hz.Vec3.up, fwd).normalize();
        if (side.length2() < 1e-6) side = hz.Vec3.cross(hz.Vec3.right, fwd).normalize();

        await this.placeAtTip(bud, tip, fwd, side);
    }
}
