import * as hz from "horizon/core";
import './_OMath';

// NOTE: This assumes you have an 8-sided cylinder mesh asset and (optionally)
// 2 materials: bodyMaterial (hive), entranceMaterial (dark tunnel).
// In Horizon, assets are referenced by BigInt IDs. Put yours in the props.

type HiveTierRef = { e: hz.Entity };

export class HiveBuilder extends hz.Component<typeof HiveBuilder> {
    static propsDefinition = {
        // Assets
        cylinderMeshId: { type: hz.PropTypes.String, default: '2044830499680411' },           // required: 8-sided cylinder mesh asset
        entranceMeshId: { type: hz.PropTypes.String, default: '756320273787757' },

        // Shape
        levels: { type: hz.PropTypes.Number, default: 5 },     // how many stacked tiers
        baseRadius: { type: hz.PropTypes.Number, default: 0.7 },   // bottom tier radius (meters)
        topRadius: { type: hz.PropTypes.Number, default: 0.35 },  // top tier radius
        tierHeight: { type: hz.PropTypes.Number, default: 0.35 },  // height per tier
        bulge: { type: hz.PropTypes.Number, default: 0.1 },   // +bulge fattens middle tiers
        twistPerLevelDeg: { type: hz.PropTypes.Number, default: 7.5 },   // slight twist per tier (nice low-poly feel)
        verticalPadding: { type: hz.PropTypes.Number, default: 0.02 },  // gap between tiers

        // Entrance (a short dark cylinder pushed into the hive)
        entranceEnabled: { type: hz.PropTypes.Boolean, default: true },
        entranceRadius: { type: hz.PropTypes.Number, default: 0.18 },
        entranceDepth: { type: hz.PropTypes.Number, default: 0.22 },
        entranceHeightL: { type: hz.PropTypes.Number, default: 1 },     // which tier index (0 = bottom)
        entranceYawDeg: { type: hz.PropTypes.Number, default: 0 },     // rotate around hive

        // Side pods (little attached cylinders near the base)
        sidePods: { type: hz.PropTypes.Number, default: 0 },     // 0..3 recommended
        sidePodRadius: { type: hz.PropTypes.Number, default: 0.28 },
        sidePodHeight: { type: hz.PropTypes.Number, default: 0.28 },
        sidePodOffset: { type: hz.PropTypes.Number, default: 0.55 },  // distance from center
        sidePodYawStart: { type: hz.PropTypes.Number, default: 35 },    // first pod angle (deg)

        // Randomness (tiny wobble to avoid “too perfect”)
        seed: { type: hz.PropTypes.Number, default: 1337 },
        jitterPos: { type: hz.PropTypes.Number, default: 0.0 },   // 0..0.02 nice
        jitterRotDeg: { type: hz.PropTypes.Number, default: 0.0 },   // 0..1.0 nice
        jitterScale: { type: hz.PropTypes.Number, default: 0.0 },   // 0..0.02 nice
    };

    private tiers: HiveTierRef[] = [];
    private entrance?: hz.Entity;
    private pods: hz.Entity[] = [];
    private rngS = 1;

    // ──────────────────────────────────────────────────────────────────────────

    start(): void {
        this.reseed(this.props.seed ?? 1337);
        this.rebuild();
    }

    onPropsChanged(): void {
        this.reseed(this.props.seed ?? 1337);
        this.rebuild();
    }

    // ──────────────────────────────────────────────────────────────────────────

    private reseed(s: number) { this.rngS = Math.max(1, Math.floor(s)); }
    private rand(): number {
        // tiny LCG; deterministic per seed
        this.rngS = (1664525 * this.rngS + 1013904223) % 0x100000000;
        return (this.rngS >>> 0) / 0x100000000;
    }
    private j(val: number, amt: number) { return val + (this.rand() * 2 - 1) * amt; }

    private clearChildren(list: hz.Entity[]) {
        for (const e of list) {
            this.world.deleteAsset(e);
        }
        list.length = 0;
    }

    // Rebuild everything
    public async rebuild() {
        // clear previous
        this.clearChildren(this.tiers.map(t => t.e));
        this.tiers = [];
        if (this.entrance) {
            this.world.deleteAsset(this.entrance);
            this.entrance = undefined;

        }

        const {
            levels, baseRadius, topRadius, tierHeight, bulge, verticalPadding, twistPerLevelDeg
        } = this.props;

        // vertical cursor (local Y)
        let y = 0;

        for (let i = 0; i < Math.max(1, Math.floor(levels)); i++) {
            const t = (levels <= 1) ? 0 : i / (levels - 1);
            // position each tier
            const rootPosition = this.entity.position.get();
            const position = new hz.Vec3(
                this.j(rootPosition.x, this.props.jitterPos),
                rootPosition.y + y,
                this.j(rootPosition.z, this.props.jitterPos)
            );
            // twist
            const yawDeg = twistPerLevelDeg * i + this.j(0, this.props.jitterRotDeg);
            const euler = new hz.Vec3(
                this.j(270, this.props.jitterRotDeg),
                this.j(0, this.props.jitterRotDeg),
                this.j(yawDeg, this.props.jitterRotDeg)
            );
            const rotation = hz.Quaternion.fromEuler(euler);
            // cosine bulge in the middle (t in 0..1)
            const mid = Math.sin(t * Math.PI);
            const radius = Number.lerp(baseRadius, topRadius, t) + bulge * mid;
            const  heigthCoef = Math.max(0.4, (radius - topRadius) / (baseRadius - topRadius))
            const height = tierHeight * heigthCoef;
            const scale = new hz.Vec3(
                this.withJitterScale(radius * 2),
                this.withJitterScale(radius * 2),
                this.withJitterScale(height)
            );

            const e = await this.spawnCylinder(position, rotation, scale);
            e.tags.add('Walkable');
            this.tiers.push({ e });

            y += height + verticalPadding;
        }

        // entrance
        if (this.props.entranceEnabled) {
            this.entrance = await this.spawnEntrance();
        }

        // side pods
        for (let k = 0; k < Math.max(0, Math.floor(this.props.sidePods)); k++) {
            const pod = await this.spawnSidePod(k);
            if (pod) this.pods.push(pod);
        }
    }

    private async spawnCylinder(position: hz.Vec3, rotation: hz.Quaternion, scale: hz.Vec3): Promise<hz.Entity> {
        const asset = new hz.Asset(BigInt(this.props.cylinderMeshId));
        return (await this.world.spawnAsset(asset, position, rotation, scale))[0];
    }

    private async spawnEntrance(): Promise<hz.Entity> {
        const tierIndex = this.props.entranceHeightL.clamp(0, Math.max(0, this.tiers.length - 1));
        const tier = this.tiers[tierIndex]?.e ?? this.tiers[0].e;
        const tierRadius = tier.scale.get().x * 0.5;
        const tierRight = tier.right.get();
        const tierPosition = tier.position.get();
        const depth = this.props.entranceDepth;
        const position = tierPosition.add(tierRight.mul(tierRadius));// new hz.Vec3(tierPosition.x + tierRadius, tierPosition.y, tierPosition.z);
        const scale = new hz.Vec3(this.props.entranceRadius * 2, this.props.entranceRadius * 2, depth);
        const rotation = hz.Quaternion.lookRotation(tierRight);

        const asset = new hz.Asset(BigInt(this.props.entranceMeshId));
        const promise = await this.world.spawnAsset(asset, position, rotation, scale);
        return promise[0];
    }

    private async spawnSidePod(index: number): Promise<hz.Entity | null> {
        if (this.tiers.length === 0) return null;
        const baseTier = this.tiers[0].e;
        const baseY = baseTier.position.get().y - baseTier.scale.get().y * 0.5 + this.props.sidePodHeight * 0.5;

        const angleDeg = this.props.sidePodYawStart + 360 * (index / Math.max(1, this.props.sidePods));
        const a = angleDeg.toRadians();
        const offset = new hz.Vec3(Math.sin(a), 0, Math.cos(a)).mul(this.props.sidePodOffset);

        const asset = new hz.Asset(BigInt(this.props.cylinderMeshId));
        const scale = new hz.Vec3(this.props.sidePodRadius * 2, this.props.sidePodHeight, this.props.sidePodRadius * 2);
        let position = this.entity.position.get().add(new hz.Vec3(0, baseY - this.entity.position.get().y, 0)).add(offset);
        position = this.withJitterPos(position);

        return (await this.world.spawnAsset(asset, position, hz.Quaternion.zero, scale))[0];
    }

    // ── tiny jitter helpers to keep it low-poly but alive ─────────────────────
    private withJitterPos(p: hz.Vec3): hz.Vec3 {
        const j = this.props.jitterPos ?? 0;
        if (j <= 0) return p;
        return new hz.Vec3(
            this.j(p.x, j),
            this.j(p.y, j),
            this.j(p.z, j),
        );
    }
    private withJitterScale(s: number): number {
        const j = this.props.jitterScale ?? 0;
        if (j <= 0) return s;
        return this.j(s, j);
    }
}
hz.Component.register(HiveBuilder);