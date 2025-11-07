// ODrop.ts — single-drop water simulation (Fall → Bounce → Absorb → Finished)
// Clean state machine, no abbreviations, Horizon-friendly wrapper style.

import * as hz from "horizon/core";
import "./_OMath";
import { OWrapper } from "_OWrapper";
import { Ease, OEntity } from "_OEntity";
import { OEntityManager } from "_OEntityManager";
import { OGrass } from "_OGrass";

// ──────────────────────────────────────────────────────────────────────────────
// Parameters (same pattern as OFollow: interface + Default constant)
// ──────────────────────────────────────────────────────────────────────────────
export interface ODropParams {
    // Shape & stretch while falling
    maxLifetime: number,
    baseScale: number;
    fallMinimumXY: number;          // how thin XY gets at maximum vertical speed
    fallMaximumZ: number;           // how tall Z gets at maximum vertical speed
    maximumVerticalSpeed: number;   // vertical speed that maps to full stretch

    // Bounce pulse (splash-like flattening)
    bounceDuration: number;         // seconds
    bounceTargetXYMultiplier: number;
    bounceMinimumZ: number;

    // Orientation responsiveness
    orientSpeed: number;            // slerp factor per second

    // Settle thresholds (to enter Absorbing/Finished)
    verticalSettleEpsilon: number;  // |vy| ≤ epsilon
    lateralSettleEpsilon: number;
    verticalDeadZone: number;       // impact detection threshold

    // Colors & weights
    colorRest: hz.Color;
    colorFast: hz.Color;
    colorStretch: hz.Color;
    colorImpact: hz.Color;
    colorStretchWeight: number;
    colorImpactWeight: number;

    // Tag
    tag: string;
}

export const ODropParamsDefault: ODropParams = {
    // Shape & stretch while falling
    maxLifetime: 12,
    baseScale: 0.20,
    fallMinimumXY: 0.25,
    fallMaximumZ: 8.0,
    maximumVerticalSpeed: 10.0,

    // Bounce pulse
    bounceDuration: 0.12,
    bounceTargetXYMultiplier: 10.0,
    bounceMinimumZ: 0.03,

    // Orientation responsiveness
    orientSpeed: 50.0,

    // Settle thresholds
    verticalSettleEpsilon: 0.1,
    lateralSettleEpsilon: 0.5,
    verticalDeadZone: 0.5,

    // Colors & weights
    colorRest: new hz.Color(0.20, 0.55, 1.00),
    colorFast: new hz.Color(0.35, 0.90, 1.00),
    colorStretch: new hz.Color(0.65, 0.45, 1.00),
    colorImpact: hz.Color.white,
    colorStretchWeight: 0.35,
    colorImpactWeight: 1.0,

    // Tag
    tag: "Rain",
};

export enum DropPhase {
    Idle = "Idle",
    Falling = "Falling",
    Bouncing = "Bouncing",
    Absorbing = "Absorbing",
    Finished = "Finished",
}

export class ODrop {
    private readonly alignZupToYup = new hz.Quaternion(-0.7071, 0, 0, 0.7071);

    private readonly wrapper: OWrapper;
    private readonly manager: OEntityManager;
    private readonly params: ODropParams;

    private drop!: OEntity;
    private phase: DropPhase = DropPhase.Idle;

    private wasFallingLastFrame = false;
    private bounceTimeRemaining = 0;
    private lifetime = 0;

    private onAbsorb?: (position: hz.Vec3) => void;

    constructor(
        wrapper: OWrapper,
        manager: OEntityManager,
        params: ODropParams = ODropParamsDefault
    ) {
        this.wrapper = wrapper;
        this.manager = manager;
        this.params = params;

        this.drop = this.manager.create();
        this.wrapper.onUpdate((deltaTime) => this.update(deltaTime));
    }

    public async launch(position: hz.Vec3, onAbsorb?: (position: hz.Vec3) => void) {
        this.onAbsorb = onAbsorb;
        this.drop.setTags([this.params.tag]);
        this.drop.isAutoSleep = false;
        this.drop.isAutoMelody = false;
        this.drop.color = this.params.colorRest;
        this.drop.scale = new hz.Vec3(this.params.baseScale, this.params.baseScale, this.params.baseScale);

        this.drop.position = position;
        this.drop.rotation = hz.Quaternion.lookRotation(hz.Vec3.down);
        this.drop.scale = new hz.Vec3(this.params.baseScale, this.params.baseScale, this.params.baseScale);
        this.drop.color = this.params.colorRest;

        this.drop.makeDynamic();

        this.wrapper.setTimeout(() => {
            this.drop.makePhysic();
            const physical = this.drop.entity!.as(hz.PhysicalEntity);
            physical.zeroVelocity();

            this.wasFallingLastFrame = false;
            this.bounceTimeRemaining = 0;
            this.phase = DropPhase.Falling;
            this.lifetime = 0;
        }, 0.1)
    }

    public finish(): void {
        if (this.onAbsorb && this.drop.entity) {
            const p = this.drop.entity!.position.get();
            this.onAbsorb(new hz.Vec3(p.x, p.y, p.z));
        }
        
        this.phase = DropPhase.Finished;
        this.drop.tweenTo({
            duration: 0.4,
            scale: hz.Vec3.zero,
            makeStatic: false,
            ease: Ease.easeOutBack
        }).then(() => {
            this.drop.makeInvisible();
        })
    }

    private update(deltaTime: number): void {
        if (this.phase === DropPhase.Idle || this.phase === DropPhase.Finished) return;

        this.lifetime += deltaTime;
        if (this.lifetime > this.params.maxLifetime) {
            this.finish();
            return;
        }

        const physical = this.drop.entity?.as(hz.PhysicalEntity);
        if (!physical) return;
        const velocity = physical.velocity.get();

        this.drop.rotation = hz.Quaternion.slerp(
            this.drop.rotation,
            // this.alignZupToYup,
            hz.Quaternion.lookRotation(velocity.mul(-1)),
            Math.min(1, this.params.orientSpeed * deltaTime)
        );

        const verticalSpeed = Math.abs(velocity.y);
        const lateralSpeed = Math.hypot(velocity.x, velocity.z);
        const isCurrentlyFalling = velocity.y < -this.params.verticalDeadZone;

        if (this.phase === DropPhase.Falling) {
            if (this.wasFallingLastFrame && !isCurrentlyFalling) {
                this.beginBounce();
                this.drop.playMelody();
            }
        }

        if (this.phase === DropPhase.Bouncing) {
            this.bounceTimeRemaining = Math.max(0, this.bounceTimeRemaining - deltaTime);
            if (this.bounceTimeRemaining <= 0) {
                this.phase = DropPhase.Absorbing;
            }
        }

        if (this.phase === DropPhase.Absorbing) {
            if (Math.abs(velocity.y) <= this.params.verticalSettleEpsilon &&
                lateralSpeed <= this.params.lateralSettleEpsilon
            ) {
                this.finish();
                return;
            }
        }

        this.applyScale(deltaTime, verticalSpeed);
        this.applyColor(verticalSpeed, lateralSpeed);
        this.wasFallingLastFrame = isCurrentlyFalling;
    }

    private beginBounce(): void {
        this.phase = DropPhase.Bouncing;
        this.bounceTimeRemaining = this.params.bounceDuration;
    }

    private applyScale(deltaTime: number, verticalSpeed: number): void {
        const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
        const speedRatio = clamp01(verticalSpeed / this.params.maximumVerticalSpeed);

        if (this.phase === DropPhase.Bouncing) {
            // Pulse flatten: widen in XY, compress in Z
            const targetXY = this.params.baseScale * this.params.bounceTargetXYMultiplier;
            const targetZ = Math.max(
                this.params.bounceMinimumZ,
                (this.params.baseScale * this.params.baseScale * this.params.baseScale) / (targetXY * targetXY)
            );

            this.drop.scale = new hz.Vec3(
                this.drop.scale.x * 0.85 + targetXY * 0.15,
                this.drop.scale.y * 0.85 + targetXY * 0.15,
                this.drop.scale.z * 0.65 + targetZ * 0.35
            );
            return;
        }

        // Falling or absorbing: stretchy teardrop proportional to vertical speed
        const targetXY = this.params.baseScale * (1 - speedRatio * (1 - this.params.fallMinimumXY));
        const targetZ = this.params.baseScale * (1 + speedRatio * (this.params.fallMaximumZ - 1));

        const lerpFactor = this.phase === DropPhase.Absorbing ? 0.05 : 0.02;

        this.drop.scale = new hz.Vec3(
            this.drop.scale.x * (1 - lerpFactor) + targetXY * lerpFactor,
            this.drop.scale.y * (1 - lerpFactor) + targetXY * lerpFactor,
            this.drop.scale.z * (1 - lerpFactor) + targetZ * lerpFactor
        );
    }

    private applyColor(verticalSpeed: number, lateralSpeed: number): void {
        const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

        // Speed blend
        const speedBlend = clamp01(verticalSpeed / this.params.maximumVerticalSpeed);
        let color = hz.Color.lerp(this.params.colorRest, this.params.colorFast, speedBlend);

        // Stretch tint (based on z vs xy mean)
        const xyMean = (this.drop.scale.x + this.drop.scale.y) * 0.5;
        const stretchAmount = clamp01(
            (this.drop.scale.z / Math.max(1e-6, xyMean) - 1) / (this.params.fallMaximumZ - 1)
        );
        if (stretchAmount > 0) {
            color = hz.Color.lerp(color, this.params.colorStretch, stretchAmount * this.params.colorStretchWeight);
        }

        // Impact flash during bounce
        if (this.phase === DropPhase.Bouncing && this.params.bounceDuration > 0) {
            const pulse = clamp01(this.bounceTimeRemaining / this.params.bounceDuration);
            color = hz.Color.lerp(color, this.params.colorImpact, pulse * this.params.colorImpactWeight);
        }

        // Slight slide tint when skidding laterally
        const slideBlend = clamp01(lateralSpeed / 4);
        if (slideBlend > 0) {
            color = hz.Color.lerp(color, new hz.Color(0.65, 1.0, 0.75), 0.15 * slideBlend);
        }

        this.drop.color = color;
    }
}
