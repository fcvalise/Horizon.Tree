import { OEntity } from '_OEntity';
import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';

type TrailObject = { trail: hz.TrailGizmo; followEntity: OEntity | undefined, inUse: boolean, duration: number };

export class OTrail {
    private trailList: TrailObject[] = [];

    constructor(private wrapper: OWrapper) {
        const trailParent = this.wrapper.world.getEntitiesWithTags(['TrailPool'])[0]!;
        const children = trailParent!.children.get();
        for(const child of children) {
            const trailGizmo = child.as(hz.TrailGizmo)!;
            const trail = { trail: trailGizmo, followEntity: undefined, inUse: false, duration: trailGizmo.length.get() }
            this.trailList.push(trail);
        }
        this.wrapper.onUpdate((dt) => { this.update(dt); })
    }
    
    public attach(oEntity: OEntity) {
        let available = this.trailList.find(p => !p.inUse);
        
        if (available) {
            available.inUse = true;
            available.followEntity = oEntity;
            available.trail.stop();
            this.wrapper.component.async.setTimeout(() => available?.trail.play(), 100);
        }
    }
    
    public detach(oEntity: OEntity) {
        let trail = this.trailList.find(p => p.followEntity == oEntity)!;
        if (trail) {
            trail.followEntity = undefined;
            this.wrapper.component.async.setTimeout(() => trail.trail.stop() , trail.duration * 1000);
            this.wrapper.component.async.setTimeout(() => trail.inUse = false, trail.duration * 1100);
        }
    }
    
    private update(dt: number) {
        for (const trail of this.trailList) {
            if (trail.inUse && trail.followEntity?.entity) {
                const bounds = trail.followEntity.entity.getRenderBounds();
                trail.trail.position.set(bounds.center);
            }
        }
    }
}