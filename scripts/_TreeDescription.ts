import { RNG } from "_RNG";
import { TreeSettings } from "_TreeSettings";

export class TreeDescription {
    private rng!: RNG;
    public description!: string;

    constructor(settings: TreeSettings) {
        this.rng = new RNG(settings.seed);
        // this.description = this.describeTree(settings);
    }

    private describeTree(s: TreeSettings, variant = 0): string {
        const { branch, render, leaf, tropism, architecture } = s;

        // Metrics
        const height = this.estimateHeight(branch.length, branch.lengthDecay, s.maxDepth);
        const branchiness = branch.chance;
        const taper = branch.topWidth / (branch.bottomWidth + 1e-6);

        // Buckets → adjectives
        const size = this.bucket(
            height,
            [1, 2.5, 5, 8, 12],
            ["a fragile sapling", "a modest tree", "a young companion", "a proud figure", "a towering elder", "a monumental giant"] as const
        );
        const trunk = this.bucket(
            taper,
            [0.05, 0.15, 0.35, 0.7],
            ["with an ancient, massive trunk", "broad at its base", "slender yet firm", "leaning like a reed", "as delicate as a whisper"] as const
        );
        const branching = this.bucket(
            branchiness,
            [0.15, 0.35, 0.6, 0.8],
            ["sparse in branches", "timid offshoots", "branching generously", "flourishing with countless arms", "wildly tangled"] as const
        );
        const leaves = this.bucket(
            leaf.scale,
            [0.3, 0.7, 1.5, 2.5],
            ["almost bare", "lightly adorned in green", "clothed in foliage", "wrapped in abundant greenery", "overflowing with lush canopies"] as const
        );

        // Rhythm
        const rhythm =
            architecture.growthRhythm === "Rhythmic"
                ? this.choice([
                    `It awakens in bursts, every ${architecture.flushPeriodFrames} frames,`,
                    `Its heart beats in cycles—swell and hush—`,
                    `It grows in measured pulses, then rests,`,
                ])
                : this.choice([
                    "It grows without pause, a slow, unbroken hymn,",
                    "Its growth is ceaseless, a breath that never ends,",
                    "It unfurls continuously, without interruption,",
                ]);

        // Axis
        const axis =
            architecture.mainAxis === "Monopodial"
                ? this.choice([
                    "lifting a single spine toward the sky",
                    "bearing one central axis, steady and true",
                    "anchored by a faithful vertical leader",
                ])
                : this.choice([
                    "splitting into wandering leaders",
                    "dividing its destiny among several trunks",
                    "guided by many shoulders rather than one",
                ]);

        // Tropism orientation (from architecture.tropism)
        const tropismOrientation =
            architecture.tropism === "Orthotropic"
                ? this.choice(["upright, yearning for the heavens", "reaching vertically, sky-bound", "straight and disciplined"])
                : architecture.tropism === "Plagiotropic"
                    ? this.choice(["stretching sideways to the horizon", "extending like arms into the air", "restless and lateral"])
                    : this.choice(["free of direction", "careless of orientation", "wandering without guidance"]);

        // Physiological pulls
        const lightHunger = this.bucket(
            tropism.phototropismWeight,
            [0.3, 0.6, 0.9],
            ["shy of the sun", "curious of the sun", "eager for the sun", "desperate for the sun"] as const
        );
        const gravityFeel = this.bucket(
            tropism.gravitropismWeight,
            [0.2, 0.5, 0.8],
            ["barely tethered to earth", "sensing the soil gently", "bound to gravity", "heavily drawn to the ground"] as const
        );

        // Phyllotaxy
        const phyllotaxy =
            leaf.branchPhyllotaxy === "Spiral"
                ? this.choice([
                    "its branches spiral in timeless rhythm",
                    "spiral phyllotaxy, a helix of growth",
                    "unfolding in sacred spirals",
                ])
                : this.choice([
                    "branches arranged in orderly whorls",
                    "a geometry of repeating circles",
                    "whorled tiers, precise and patient",
                ]);

        // Branching phase
        const branchingPhase =
            architecture.branchingPhase === "Proleptic"
                ? this.choice([
                    "delaying its promises for another season",
                    "holding its side branches in reserve",
                    "storing energy before releasing growth",
                ])
                : this.choice([
                    "offering branches at once, impatiently",
                    "sending side shoots immediately",
                    "generous in the present moment",
                ]);

        // Bonus: angle character from branchAngle (gentle vs bold) & jitter “mood”
        const angleMood = this.bucket(
            branch.angle,
            [15, 30, 45, 70],
            ["hugging the trunk", "peeling away gently", "reaching out boldly", "splaying wide into space", "flinging itself outward"] as const
        );
        const jitterMood = this.bucket(
            tropism.jitterStrength,
            [0.03, 0.08, 0.15],
            ["composed in its gestures", "lively at the edges", "restless at every tip", "quivering with intent"] as const
        );

        // Compose
        const opening = this.choice([
            `This is ${size}, ${trunk}, ${branching}, ${leaves}.`,
            `Behold ${size}, ${trunk}; ${branching}, ${leaves}.`,
            `You see ${size}, ${trunk}—${branching}, ${leaves}.`,
        ]);

        const mid = `${rhythm} ${axis}, ${tropismOrientation}, ${lightHunger} and ${gravityFeel}.`;

        const close = this.choice([
            `It carries ${phyllotaxy}, ${branchingPhase}; its branches ${angleMood}, its motion ${jitterMood}.`,
            `It bears ${phyllotaxy} and ${branchingPhase}; the angles ${angleMood}, the temperament ${jitterMood}.`,
            `There is ${phyllotaxy}, and there is ${branchingPhase}; limbs ${angleMood}, demeanor ${jitterMood}.`,
        ]);

        return [opening, mid, close].join(" ").replace(/\s+/g, " ");
    }

    private bucket<T>(v: number, thresholds: number[], labels: readonly T[]): T {
        for (let i = 0; i < thresholds.length; i++) if (v < thresholds[i]) return labels[i];
        return labels[labels.length - 1];
    }
    private estimateHeight(segmentLength: number, decay: number, maxDepth: number): number {
        const r = Math.min(Math.max(decay, 0.01), 0.999);
        return (segmentLength * (1 - Math.pow(r, maxDepth))) / (1 - r);
    }
    private choice<T>(arr: readonly T[]): T {
        return arr[Math.floor(this.rng.next() * arr.length)];
    }
}