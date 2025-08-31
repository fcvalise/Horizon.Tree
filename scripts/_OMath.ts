import * as hz from "horizon/core";

export {}

declare global {
  interface NumberConstructor {
    lerp(a: number, b: number, t: number): number;
  }
  interface Number {
    toRadians(): number;
    toDegrees(): number;
    clamp01(): number;
  }
}

Number.lerp = function (a: number, b: number, t: number): number {
  return a + (b - a) * t;
};

Number.prototype.toRadians = function(): number {
  return (this as number) * Math.PI / 180;
};

Number.prototype.toDegrees = function(): number {
  return (this as number) * 180 / Math.PI;
};

Number.prototype.clamp01 = function (): number {
  const v = this as number;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
};

declare module "horizon/core" {
  interface Vec3 {
    angle(axis?: hz.Vec3): number;
    rotateArround(deg: number, axis?: hz.Vec3): hz.Vec3;
    length(): number;
    length2(): number;
  }
}

hz.Vec3.prototype.angle = function(axis: hz.Vec3 = hz.Vec3.up): number {
    const v = (this as hz.Vec3);
    const a = hz.Vec3.normalize(v);
    const b = hz.Vec3.normalize(axis);
    const dot = Math.max(-1, Math.min(1, hz.Vec3.dot(a, b)));
    return Math.acos(dot); // radians
}

hz.Vec3.prototype.rotateArround = function(deg: number, axis: hz.Vec3 = hz.Vec3.up): hz.Vec3 {
    const v = (this as hz.Vec3);
    const rad = deg.toRadians();
    const u = axis.normalize();
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const term1 = v.mul(cos);
    const term2 = hz.Vec3.cross(u, v).mul(sin);
    const term3 = u.mul(hz.Vec3.dot(u, v) * (1 - cos));
    return term1.add(term2).add(term3);
}

hz.Vec3.prototype.length = function(): number {
  return Math.sqrt(this.length2());
}

hz.Vec3.prototype.length2 = function(): number {
  const v = (this as hz.Vec3);
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

declare module "horizon/core" {
  interface Quaternion {
    rotateVec3(v: hz.Vec3): hz.Vec3;
    forward: hz.Vec3;
    right: hz.Vec3;
    up: hz.Vec3;
  }
}

// rotate any vector by a quaternion
(hz.Quaternion.prototype as any).rotateVec3 = function(v: hz.Vec3): hz.Vec3 {
  const q = this as hz.Quaternion;
  const x = v.x, y = v.y, z = v.z;
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  // v' = v + qw * t + cross(q.xyz, t)
  return new hz.Vec3(
    x + qw * tx + (qy * tz - qz * ty),
    y + qw * ty + (qz * tx - qx * tz),
    z + qw * tz + (qx * ty - qy * tx)
  );
};

// convenience accessors
Object.defineProperty(hz.Quaternion.prototype, "forward", {
  get: function(this: hz.Quaternion) {
    return this.rotateVec3(hz.Vec3.forward);
  }
});

Object.defineProperty(hz.Quaternion.prototype, "right", {
  get: function(this: hz.Quaternion) {
    return this.rotateVec3(hz.Vec3.right);
  }
});

Object.defineProperty(hz.Quaternion.prototype, "up", {
  get: function(this: hz.Quaternion) {
    return this.rotateVec3(hz.Vec3.up);
  }
});