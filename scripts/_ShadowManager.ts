import * as hz from 'horizon/core';
import "./_OMath";

export class ShadowObject {
    constructor(public readonly entity: hz.Entity) {}
    public caster: hz.Entity | undefined;
    public isUse: boolean = false;
}

// This component create fake blob shadow under object tagged 'Shadow'
// It need to be attach to a raycast gizmo and have the shadow meshes as children
export class ShadowManager extends hz.Component<typeof ShadowManager> {
    private raycast!: hz.RaycastGizmo;
    private shadowList: ShadowObject[] = [];

    public start() {
        this.raycast = this.entity.as(hz.RaycastGizmo);
        this.preparePool();
        this.updateCaster();
        this.connectLocalBroadcastEvent(hz.World.onUpdate, () => this.updateShadows());
        // Uncomment if your caster changes in real time
        // this.connectLocalBroadcastEvent(hz.World.onUpdate, () => this.updateCaster());
    }

    private preparePool() {
        const children = this.entity.children.get();
        for (const child of children) {
            const shadowObject = new ShadowObject(child);
            this.shadowList.push(shadowObject);
        }
    }

    // You can ad conditions here (distance check, area check, etc)
    private shadowCondition(caster: hz.Entity) {
        return this.isVisible(caster);
    }

    private updateShadows() {
        for (const shadow of this.shadowList) {
            if (shadow.isUse && shadow.caster) {
                const bounds = shadow.caster.getRenderBounds();
                const casterPosition =  shadow.caster.position.get();
                // const raycastOrigin = new hz.Vec3(casterPosition.x, casterPosition.y - bounds.size().y * 0.5, casterPosition.z)
                const raycastOrigin = bounds.center;
                const hit = this.raycast.raycast(raycastOrigin, hz.Vec3.down);
                
                if (hit) {
                    const position = new hz.Vec3(casterPosition.x, hit.hitPoint.y + 0.1, casterPosition.z);// hit.hitPoint.add(hz.Vec3.up.mul(0.1))
                    let direction = hit.normal;
                    const angle = hit.normal.angle().toDegrees();
                    if (angle > 50) { direction = hz.Vec3.up; }
                    const rotation = hz.Quaternion.lookRotation(direction);
                    const scale = new hz.Vec3(bounds.size().x, 1, bounds.size().z);

                    shadow.entity.position.set(position);
                    shadow.entity.rotation.set(rotation);
                    shadow.entity.scale.set(scale);
                }
            } else if (shadow.isUse && !shadow.caster) {
                shadow.isUse = false;
            }
        }
    }

    private updateCaster() {
        const casterList = this.world.getEntitiesWithTags(['Shadow']);
        for (const caster of casterList) {
            if (this.shadowCondition(caster)) {
                const shadowObject = this.shadowList.find(s => !s.isUse);
                if (shadowObject) {
                    shadowObject.caster = caster;
                    shadowObject.isUse = true;
                }
            } else {
                const shadowObject = this.shadowList.find(s => s.caster == caster);
                if (shadowObject) {
                    shadowObject.isUse = false;
                    this.hideShadow(shadowObject);
                }
            }
        }
    }

    private hideShadow(shadow: ShadowObject) {
        shadow.entity.transform.localPosition.set(hz.Vec3.zero);
    }

    private isVisible(entity: hz.Entity | undefined): boolean {
        if (!entity) return false;
        if (!entity.visible.get()) {
            return false;
        }
        const parent = entity.parent.get();
        if (!parent) {
            return true;
        }
        return this.isVisible(parent);
    }
}
hz.Component.register(ShadowManager);