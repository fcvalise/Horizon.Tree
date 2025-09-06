import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';

type TrailObject = { trail: hz.TrailGizmo; followEntity: hz.Entity | undefined, inUse: boolean; };

export class OTrail {
    private trailList: TrailObject[] = [];

    constructor(private wrapper: OWrapper) {
        const trailParent = this.wrapper.world.getEntitiesWithTags(['TrailPool'])[0]!;
        const children = trailParent!.children.get();
        for(const child of children) {
            const trail = { trail: child.as(hz.TrailGizmo), followEntity: undefined, inUse: false }
            this.trailList.push(trail);
        }
        this.wrapper.onUpdate((dt) => { this.update(dt); })
    }
    
    public attach(entity: hz.Entity) {
        let available = this.trailList.find(p => !p.inUse);
        
        if (available) {
            available.inUse = true;
            available.followEntity = entity;
            available.trail.play();
        }
    }
    
    public detach(entity: hz.Entity) {
        let trail = this.trailList.find(p => p.followEntity == entity)!;
        trail.followEntity = undefined;
        trail.trail.stop();
        this.wrapper.component.async.setTimeout(() => trail.inUse = false, 100);
    }
    
    private update(dt: number) {
        for (const trail of this.trailList) {
            if (trail.inUse && trail.followEntity) {
                const bounds = trail.followEntity.getRenderBounds();
                trail.trail.position.set(bounds.center);
            }
        }
    }
}