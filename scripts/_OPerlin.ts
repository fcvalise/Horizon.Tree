export class OPerlin {
  private perm: number[] = [];

  constructor(seed: string | number = 1337) {
    this.reseed(seed);
  }

  reseed(seed: string | number) {
    const s = typeof seed === "number" ? seed : this.hashString(seed);
    const rnd = this.mulberry32(s >>> 0);

    // create shuffled array [0..255]
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    // duplicate to 512 entries
    this.perm = [];
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  // --- 2D noise ---
  noise2(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);

    const u = this.fade(x), v = this.fade(y);

    const A = this.perm[X] + Y, AA = this.perm[A], AB = this.perm[A + 1];
    const B = this.perm[X + 1] + Y, BA = this.perm[B], BB = this.perm[B + 1];

    const lerpX1 = this.lerp(u,
      this.grad2(this.perm[AA], x, y),
      this.grad2(this.perm[BA], x - 1, y)
    );
    const lerpX2 = this.lerp(u,
      this.grad2(this.perm[AB], x, y - 1),
      this.grad2(this.perm[BB], x - 1, y - 1)
    );

    return (this.lerp(v, lerpX1, lerpX2) + 1) * 0.5; // [0,1]
  }

  // --- 3D noise ---
  noise3(x: number, y: number, z: number): number {
    let X = Math.floor(x) & 255;
    let Y = Math.floor(y) & 255;
    let Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = this.fade(x), v = this.fade(y), w = this.fade(z);

    const A  = this.perm[X] + Y, AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z;
    const B  = this.perm[X + 1] + Y, BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z;

    const x1 = this.lerp(u,
      this.grad3(this.perm[AA], x,     y,     z),
      this.grad3(this.perm[BA], x - 1, y,     z)
    );
    const x2 = this.lerp(u,
      this.grad3(this.perm[AB], x,     y - 1, z),
      this.grad3(this.perm[BB], x - 1, y - 1, z)
    );
    const y1 = this.lerp(v, x1, x2);

    const x3 = this.lerp(u,
      this.grad3(this.perm[AA + 1], x,     y,     z - 1),
      this.grad3(this.perm[BA + 1], x - 1, y,     z - 1)
    );
    const x4 = this.lerp(u,
      this.grad3(this.perm[AB + 1], x,     y - 1, z - 1),
      this.grad3(this.perm[BB + 1], x - 1, y - 1, z - 1)
    );
    const y2 = this.lerp(v, x3, x4);

    return (this.lerp(w, y1, y2) + 1) * 0.5; // [0,1]
  }

  // --- fBm (fractal noise) ---
  fbm2(x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise2(x * freq, y * freq);
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }

  fbm3(x: number, y: number, z: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise3(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }

  // --- helpers ---
  private fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
  private lerp(t: number, a: number, b: number) { return a + t * (b - a); }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h & 1 ? -x : x;
    const v = h & 2 ? -y : y;
    return u + v;
  }
  private grad3(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private hashString(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  ridged2(x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      const n = this.noise2(x * freq, y * freq);
      const r = 1 - Math.abs(2 * n - 1); // ridge: inverted abs
      sum += r * amp;
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }

  private mulberry32(seed: number) {
    let a = seed >>> 0;
    return function(): number {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
