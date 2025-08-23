import * as hz from "horizon/core";

// Deterministic RNG with numeric or string seed
export class RNG {
    private state: number;

    constructor(seed: number | string) {
        this.state = typeof seed === "number" ? seed >>> 0 : RNG.fnv1a32(seed);
        if (this.state === 0) this.state = 0x9e3779b9; // avoid trivial zero
    }

    // FNV-1a 32-bit hash (string -> 32-bit seed)
    private static fnv1a32(str: string): number {
        let h = 0x811c9dc5; // offset basis
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193); // 16777619
        }
        return h >>> 0;
    }

    // Mulberry32 core: returns an unbiased 32-bit unsigned int
    nextUint32(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    }

    // Float in [0, 1)
    public next(): number {
        return this.nextUint32() / 0x100000000; // 2^32
    }

    public range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    // Integer in [min, max) with rejection to avoid modulo bias
    public int(min: number, max: number): number {
        if (!(max > min)) throw new Error("int(min,max): require max>min");
        const span = max - min >>> 0;
        const limit = 0x100000000 - (0x100000000 % span);
        let r: number;
        do { r = this.nextUint32(); } while (r >= limit);
        return min + (r % span);
    }

    // Random vector inside sphere
    public vector(): hz.Vec3 {
        const u = this.next();
        const v = this.next();
        const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1), s = Math.sin(phi);
        return hz.Vec3.normalize(new hz.Vec3(Math.cos(theta) * s, Math.cos(phi), Math.sin(theta) * s));
    }

    // Random vector inside *half sphere* (upper hemisphere by default)
    public vectorHalf(up: hz.Vec3 = new hz.Vec3(0, 1, 0)): hz.Vec3 {
        let vec = this.vector();
        if (hz.Vec3.dot(vec, up) < 0) {
            vec = new hz.Vec3(-vec.x, -vec.y, -vec.z);
        }
        return vec;
    }

    // Bernoulli trial (true with probability p)
    bool(p = 0.5): boolean {
        if (p <= 0) return false;
        if (p >= 1) return true;
        return this.next() < p;
    }

    // In-place Fisher–Yates shuffle
    shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.int(0, i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
