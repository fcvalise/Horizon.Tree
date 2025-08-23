import * as hz from "horizon/core";

export class TMath {
    public static vZero(): hz.Vec3 { return new hz.Vec3(0, 0, 0); }
    public static vAdd(a: hz.Vec3, b: hz.Vec3): hz.Vec3 { return new hz.Vec3(a.x + b.x, a.y + b.y, a.z + b.z); }
    public static vSub(a: hz.Vec3, b: hz.Vec3): hz.Vec3 { return new hz.Vec3(a.x - b.x, a.y - b.y, a.z - b.z); }
    public static vScale(a: hz.Vec3, s: number): hz.Vec3 { return new hz.Vec3(a.x * s, a.y * s, a.z * s); }
    public static vDot(a: hz.Vec3, b: hz.Vec3): number { return a.x * b.x + a.y * b.y + a.z * b.z; }
    public static vCross(a: hz.Vec3, b: hz.Vec3): hz.Vec3 {
        return new hz.Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    public static vLen2(a: hz.Vec3): number { return a.x * a.x + a.y * a.y + a.z * a.z; }
    public static vLen(a: hz.Vec3): number { return Math.sqrt(this.vLen2(a)); }
    public static vNorm(a: hz.Vec3): hz.Vec3 { const L = this.vLen(a); return L > 1e-8 ? this.vScale(a, 1 / L) : this.vZero(); }

    public static projectOnPlane(v: hz.Vec3, n: hz.Vec3): hz.Vec3 {
        const nn = this.vNorm(n); const d = this.vDot(v, nn); return this.vSub(v, this.vScale(nn, d));
    }

    public static rotateAroundAxis(v: hz.Vec3, axis: hz.Vec3, deg: number): hz.Vec3 {
        const rad = (deg * Math.PI) / 180; const u = this.vNorm(axis);
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const term1 = this.vScale(v, cos);
        const term2 = this.vScale(this.vCross(u, v), sin);
        const term3 = this.vScale(u, this.vDot(u, v) * (1 - cos));
        return this.vAdd(this.vAdd(term1, term2), term3);
    }

    public static rotateVec(v: hz.Vec3, yawDeg: number, pitchDeg: number): hz.Vec3 {
        const yaw = (yawDeg * Math.PI) / 180, pitch = (pitchDeg * Math.PI) / 180;
        const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
        const vx = v.x * cY + v.z * sY, vz = -v.x * sY + v.z * cY, vy = v.y;
        const px = vx, pz = vz * cP - vy * sP, py = vz * sP + vy * cP;
        return new hz.Vec3(px, py, pz);
    }

    public static lookRotation(forward: hz.Vec3, up: hz.Vec3): hz.Quaternion {
        const f = hz.Vec3.normalize(forward); const r = hz.Vec3.normalize(this.vCross(up, f)); const u = this.vCross(f, r);
        return this.basisToQuat(f, u);
    }

    public static basisToQuat(forward: hz.Vec3, up: hz.Vec3): hz.Quaternion {
        const f = hz.Vec3.normalize(forward); const r = hz.Vec3.normalize(this.vCross(up, f)); const u = this.vCross(f, r);
        const m00 = r.x, m01 = u.x, m02 = f.x, m10 = r.y, m11 = u.y, m12 = f.y, m20 = r.z, m21 = u.z, m22 = f.z;
        const tr = m00 + m11 + m22;
        let qw: number, qx: number, qy: number, qz: number;
        if (tr > 0) { const S = Math.sqrt(tr + 1.0) * 2; qw = 0.25 * S; qx = (m21 - m12) / S; qy = (m02 - m20) / S; qz = (m10 - m01) / S; }
        else if (m00 > m11 && m00 > m22) { const S = Math.sqrt(1.0 + m00 - m11 - m22) * 2; qw = (m21 - m12) / S; qx = 0.25 * S; qy = (m01 + m10) / S; qz = (m02 + m20) / S; }
        else if (m11 > m22) { const S = Math.sqrt(1.0 + m11 - m00 - m22) * 2; qw = (m02 - m20) / S; qx = (m01 + m10) / S; qy = 0.25 * S; qz = (m12 + m21) / S; }
        else { const S = Math.sqrt(1.0 + m22 - m00 - m11) * 2; qw = (m10 - m01) / S; qx = (m02 + m20) / S; qy = (m12 + m21) / S; qz = 0.25 * S; }
        return new hz.Quaternion(qx, qy, qz, qw);
    }

    public static clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
    public static lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
}