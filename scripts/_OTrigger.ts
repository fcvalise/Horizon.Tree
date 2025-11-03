import * as hz from "horizon/core";
import { Interactable, OInteractableManager } from "_OInteractableManager";
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";
import { Ease, OEntity } from "_OEntity";
import { PlayerEvent } from "_PlayerEvent";
import { OMelody } from "_OMelody";
import { OuiHelper } from "_OuiHelpers";
import { OInventory, OInventoryManager } from "_OInventory";

export class OTrigger {
    private readonly searchRadius = 8;

    // private trigger?: hz.TriggerGizmo;
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
        private interactableManager: OInteractableManager,
        private inventory: OInventoryManager
    ) {
        // this.trigger = OUtils.getChildWithTag(this.entity, 'Button')!.as(hz.TriggerGizmo);
        this.mesh = OUtils.getChildWithTag(this.entity, "Mesh")!.as(hz.MeshEntity);
        this.light = OUtils.getChildWithTag(this.entity, "Light")!.as(hz.DynamicLightGizmo);
        this.price = OUtils.getChildWithTag(this.entity, "Price")!.as(hz.TextGizmo);
        this.infos = OUtils.getChildWithTag(this.entity, "Infos")!.as(hz.TextGizmo);
        this.position = this.mesh.position.get();
        this.scale = this.defaultScale = this.mesh.scale.get();
        this.intensity = this.defaultIntensity = this.light.intensity.get();

        this.wrapper.onUpdate((dt) => this.update(dt));
        this.entity.setVisibilityForPlayers([this.player], hz.PlayerVisibilityMode.VisibleTo);
        
        this.wrapper.component.connectNetworkEvent(this.player, PlayerEvent.onTouchUI, () => {
            if (this.isReady && this.currentTarget) {
                this.currentTarget.interact(player);
            }
        })
    }

    private update(dt: number) {
        this.time += dt;
        let nearest: Interactable | undefined;
        let nearestDist = Infinity;
        const inventory = this.inventory.get(this.player);
        const playerPosition = this.player.position.get();

        this.interactableManager.forEach((interactable) => {
            const oe = interactable?.oEntity;
            if (!oe) return;
            const d = oe.position.distance(playerPosition);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = interactable;
            }
        });

        if (!nearest || nearestDist > this.searchRadius || playerPosition.y < -1.9) {
            this.currentTarget = undefined;
            this.entity.position.set(new hz.Vec3(-100, 100, 0));
            this.position = new hz.Vec3(-100, 100, 0);
            return;
        }

        const oEntity = nearest.oEntity;
        if (this.currentTarget != nearest) {
            this.currentTarget = nearest;
            this.setReady(false);
        }

        const forward = oEntity.rotation.getForward();
        let targetPosition = oEntity.position;
        if (forward.y > 0) {
            targetPosition = targetPosition.add(forward.mul(oEntity.scale.z));
        }
        const hasEnough = inventory?.has(this.currentTarget.price ?? 0);
        const oscilation = (Math.sin(this.time * 10) + 1) / 2;
        const flatPosition = new hz.Vec3(this.position.x, 0, this.position.z);
        const flatTarget = new hz.Vec3(targetPosition.x, 0, targetPosition.z);
        const distance = flatPosition.distance(flatTarget);
        const alphaHex = hasEnough ? OuiHelper.numberToHex01(1) : OuiHelper.numberToHex01(0.4);
        if (distance < 0.2) {
            if (this.scale.x > this.defaultScale.x * 0.98) {
                this.scale = hz.Vec3.lerp(this.scale, this.defaultScale, dt * 5);
                if (hasEnough) {
                    this.entity.scale.set(hz.Vec3.one.mul(1 + oscilation * 0.1));
                } else {
                    this.entity.scale.set(hz.Vec3.one);
                }
                this.price?.text.set(`<alpha=${alphaHex}><font=roboto-bold sdf><material=roboto-bold sdf - drop shadow>${this.currentTarget.price.toString()}`);
                this.infos?.text.set(`<alpha=${alphaHex}><font=roboto-bold sdf><material=roboto-bold sdf - drop shadow><uppercase>${this.currentTarget.infos}</uppercase>`);
            } else {
                this.scale = hz.Vec3.lerp(this.scale, this.defaultScale, dt * 5);
                this.mesh!.scale.set(this.scale);
                this.intensity = Number.lerp(this.intensity, this.defaultIntensity, dt * 5);
                this.light?.intensity.set(this.intensity);
                this.setReady(true);
            }
        } else {
            this.time = 0;
            if (this.scale.x > 0.02) {
                this.scale = hz.Vec3.lerp(this.scale, hz.Vec3.zero, dt * 10);
                this.mesh!.scale.set(this.scale);
                this.intensity = Number.lerp(this.intensity, 0, dt * 5);
                this.light?.intensity.set(this.intensity);
            } else {
                this.position = hz.Vec3.lerp(this.position, targetPosition, dt * 10);
                this.entity.position.set(this.position);
                this.infos?.scale.set(hz.Vec3.one.mul(0.7 + oscilation * 0.1));
                this.price?.text.set(`<alpha=${alphaHex}><font=roboto-bold sdf><material=roboto-bold sdf - drop shadow>${this.currentTarget.price.toString()}`);
                this.infos?.text.set(`<alpha=${alphaHex}><font=roboto-bold sdf><material=roboto-bold sdf - drop shadow><uppercase>${this.currentTarget.infos}</uppercase>`);
            }
        }
    }

    private setReady(isReady: boolean) {
        if (isReady != this.isReady) {
            this.wrapper.component.sendNetworkEvent(this.player, PlayerEvent.enableTriggerUI, {isEnable: isReady });
            OEntity.melody?.triggerWithTags(this.position, ['Terrain']);
            // this.trigger?.enabled.set(isReady);
        }
        this.isReady = isReady;
    }

    public dispose() {
        this.entity.tags.add('OTrigger:Trigger');
    }

    public static Create(wrapper: OWrapper, player: hz.Player, interactable: OInteractableManager, inventory: OInventoryManager) {
        const poolEntity = wrapper.getTaggedObject('OTrigger:Pool')!;
        const triggerEntity = OUtils.getChildWithTag(poolEntity, 'OTrigger:Trigger')!;
        triggerEntity.tags.remove('OTrigger:Trigger');

        return new OTrigger(wrapper, triggerEntity, player, interactable, inventory);
    }
}
