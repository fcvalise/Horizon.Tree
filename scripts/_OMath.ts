import * as hz from "horizon/core";

declare global {
  interface Number {
    toRadians(): number;
    toDegrees(): number;
  }
}

Number.prototype.toRadians = function(): number {
  return (this as number) * Math.PI / 180;
};

Number.prototype.toDegrees = function(): number {
  return (this as number) * 180 / Math.PI;
};

declare module "horizon/core" {
  interface Vec3 {
    angle(axis?: hz.Vec3): number;
  }
}

hz.Vec3.prototype.angle = function(axis: hz.Vec3 = hz.Vec3.up): number {
    const v = (this as hz.Vec3);
    const a = hz.Vec3.normalize(v);
    const b = hz.Vec3.normalize(axis);
    const dot = Math.max(-1, Math.min(1, hz.Vec3.dot(a, b)));
    return Math.acos(dot); // radians
}

// export class OMath {
//     public static angle(v: hz.Vec3, axis: hz.Vec3 = hz.Vec3.up): number {
//         const a = hz.Vec3.normalize(v);
//         const b = hz.Vec3.normalize(axis);
//         const dot = Math.max(-1, Math.min(1, hz.Vec3.dot(a, b)));
//         return Math.acos(dot); // radians
//     }
// }