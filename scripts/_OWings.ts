import * as hz from "horizon/core";
import './_OMath';
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";

interface OWingsParams {
    axis: 'x' | 'y' | 'z',
    ampDeg: number,
    freqHz: number
}

const OWingsParamsDefault = {
    axis: 'z' as const,
    ampDeg: 30,
    freqHz: 1.2
}

export class OWings {
    private tickMs = 0.033;

    private t = 0;
    private baseL!: hz.Quaternion;
    private baseR!: hz.Quaternion;

    constructor(
        private wrapper: OWrapper,
        private left: hz.Entity,
        private right: hz.Entity,
        private params: OWingsParams = OWingsParamsDefault
    ) {
        this.baseL = this.left.transform.localRotation.get().clone();
        this.baseR = this.right.transform.localRotation.get().clone();
        this.wrapper.setInterval(() => this.tick(), this.tickMs);
    }

    private tick() {
        this.t += this.tickMs;
        const angle = this.params.ampDeg.toRadians() * Math.sin(2 * Math.PI * this.params.freqHz * this.t);

        // left = +angle, right = -angle (mirror)
        this.left.transform.localRotation.set(this.baseL.mul(hz.Quaternion.fromAxisAngle(this.axisVec(this.params.axis), angle)));
        this.right.transform.localRotation.set(this.baseR.mul(hz.Quaternion.fromAxisAngle(this.axisVec(this.params.axis), -angle)));
    }

    public static Create(wrapper: OWrapper, root: hz.Entity, params: OWingsParams = OWingsParamsDefault): OWings {
        const left = OUtils.getChildWithTag(root, 'OWings:Left')!;
        const right = OUtils.getChildWithTag(root, 'OWings:Right')!;
        if (!left || !right) console.error(`Create OWings require entity tagged 'OFollow:Left' and 'OFollow:Right' (${root.name.get()})`);
        return new OWings(wrapper, left, right, params);
    }

    private axisVec(a: 'x' | 'y' | 'z') { return a === 'x' ? new hz.Vec3(1, 0, 0) : a === 'y' ? new hz.Vec3(0, 1, 0) : new hz.Vec3(0, 0, 1); }
}