import * as hz from 'horizon/core';

export default class BlobShadowManager extends hz.Component<typeof BlobShadowManager> {

    private shadowBlobPool: hz.Entity[] = [];
    private shadowCasterList: hz.Entity[] = [];
    private raycast!: hz.RaycastGizmo;

    async start() {
        this.shadowBlobPool = this.entity.children.get();
        this.shadowCasterList = this.world.getEntitiesWithTags(['Shadow']);
        if (this.shadowCasterList.length > this.shadowBlobPool.length) {
            console.warn("Not enough shadow blob in the pool");
        }

        this.connectLocalBroadcastEvent(hz.World.onUpdate, ({ deltaTime }) => this.updateShadows());
        this.updateShadows();
    }

    private updateShadows() {
        for (let index = 0; index < this.shadowCasterList.length; index++) {
            if (index < this.shadowBlobPool.length) {
                const shadowCaster = this.shadowCasterList[index];
                const shadowBlob = this.shadowBlobPool[index];
                if (this.isVisible(shadowCaster)) {
                    const bounds = shadowCaster.getRenderBounds();
                    const position = new hz.Vec3(bounds.center.x, 0.02, bounds.center.z);
                    const scale = new hz.Vec3(bounds.size().x, 1, bounds.size().z);
                    
        
                    shadowBlob.position.set(position);
                    shadowBlob.scale.set(scale);
                    shadowBlob.visible.set(true);
                } else {
                    shadowBlob.transform.localPosition.set(hz.Vec3.zero);
                    shadowBlob.visible.set(false);
                }
            }
        }
    }

    private isVisible(entity: hz.Entity): boolean {
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
hz.Component.register(BlobShadowManager);