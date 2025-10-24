import * as hz from "horizon/core";
import { Interactable, OInteractableManager } from "_OInteractableManager";
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";
import { Ease } from "_OEntity";

export class OTrigger {
    private readonly searchRadius = 8;
    private readonly activateRadius = 3;

    private trigger?: hz.TriggerGizmo;
    private mesh?: hz.MeshEntity;
    private light?: hz.DynamicLightGizmo;
    private price?: hz.TextGizmo;
    private infos?: hz.TextGizmo;
    private defaultScale!: hz.Vec3;
    private defaultIntensity!: number;
    
    private position!: hz.Vec3;
    private scale!: hz.Vec3;
    private intensity!: number;
    private time: number = 0;
    private isReady: boolean = false;
    private currentTarget?: Interactable;

    constructor(
        private wrapper: OWrapper,
        public entity: hz.Entity,
        public player: hz.Player,
        private interactableManager: OInteractableManager
    ) {
        this.trigger = OUtils.getChildWithTag(this.entity, 'Button')!.as(hz.TriggerGizmo);
        this.mesh = OUtils.getChildWithTag(this.entity, "Mesh")!.as(hz.MeshEntity);
        this.light = OUtils.getChildWithTag(this.entity, "Light")!.as(hz.DynamicLightGizmo);
        this.price = OUtils.getChildWithTag(this.entity, "Price")!.as(hz.TextGizmo);
        this.infos = OUtils.getChildWithTag(this.entity, "Infos")!.as(hz.TextGizmo);
        this.position = this.player.position.get();
        this.scale = this.defaultScale = this.mesh.scale.get();
        this.intensity = this.defaultIntensity = this.light.intensity.get();

        this.wrapper.onUpdate((dt) => this.update(dt));

        this.wrapper.component.connectCodeBlockEvent(this.trigger, hz.CodeBlockEvents.OnPlayerEnterTrigger, (player: hz.Player) => {
            if (this.isReady) {
                this.currentTarget?.interact(player);
            }
        });
    }

    private update(dt: number) {
        this.time += dt;
        let nearest: Interactable | undefined;
        let nearestDist = Infinity;

        this.interactableManager.forEach((interactable) => {
            const oe = interactable?.oEntity;
            if (!oe) return;
            const d = oe.position.distance(this.player.position.get());
            if (d < nearestDist) {
                nearestDist = d;
                nearest = interactable;
            }
        });

        if (!nearest || nearestDist > this.searchRadius) {
            this.currentTarget = undefined;
            this.entity.position.set(new hz.Vec3(0, -999, 0));
            return;
        }

        const oEntity = nearest.oEntity;
        if (this.currentTarget != nearest) {
            this.currentTarget = nearest;
            this.isReady = false;
        }

        const distance = this.position.distance(oEntity.position);
        const oscilation = 1 + (Math.sin(this.time) + 1) / 2;
        if (distance < 0.02) {
            if (this.scale.x > this.defaultScale.x * 0.98) {
                this.isReady = true;
                this.trigger?.enabled.set(true);
                this.scale = hz.Vec3.lerp(this.scale, this.defaultScale.mul(oscilation), dt * 5);
                this.infos?.text.set(this.currentTarget.infos);
            } else {
                this.scale = hz.Vec3.lerp(this.scale, this.defaultScale.mul(oscilation), dt * 5);
                this.mesh!.scale.set(this.scale);
                this.intensity = Number.lerp(this.intensity, this.defaultIntensity, dt * 5);
                this.light?.intensity.set(this.intensity);
            }
        } else {
            if (this.scale.x > 0.02) {
                this.scale = hz.Vec3.lerp(this.scale, hz.Vec3.zero, dt * 10);
                this.mesh!.scale.set(this.scale);
                this.intensity = Number.lerp(this.intensity, 0, dt * 5);
                this.light?.intensity.set(this.intensity);
            } else {
                this.position = hz.Vec3.lerp(this.position, oEntity.position, dt * 10);
                this.entity.position.set(this.position);
                this.trigger?.enabled.set(false);
                this.infos?.text.set(this.currentTarget.price.toString());
            }
        }
    }

    public dispose() {
        this.entity.tags.add('OTrigger:Trigger');
    }

    public static Create(wrapper: OWrapper, player: hz.Player, interactable: OInteractableManager) {
        const poolEntity = wrapper.getTaggedObject('OTrigger:Pool')!;
        const triggerEntity = OUtils.getChildWithTag(poolEntity, 'OTrigger:Trigger')!;
        triggerEntity.tags.remove('OTrigger:Trigger');

        return new OTrigger(wrapper, triggerEntity, player, interactable);
    }
}
