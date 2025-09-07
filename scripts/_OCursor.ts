import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";

export class OCursor {
    private cursor!: hz.Entity;
    private selected: hz.Entity | null = null;

    constructor(
        private wrapper: OWrapper,
        owner: hz.Player
    ) {
        this.cursor = this.getCursorEntity();
        this.cursor.visible.set(false);
        this.cursor.collidable.set(false);
        this.cursor.owner.set(owner);
    }

    public getCursorEntity(): hz.Entity {
        if (!this.cursor) {
            const children = this.wrapper.entity.children.get();
            for (const child of children) {
                if (child.tags.contains('Cursor')) {
                    this.cursor = child;
                    break;
                }
            }
        }
        return this.cursor;
    }

    public getSelected(): hz.Entity | null {
        return this.selected;
    }

    public select(target: hz.Entity) {
        this.selected = target;
        const pos = target.position.get().sub(target.forward.get().mul(0.05));
        const rot = target.rotation.get();
        const scl = this.computeScale(target);

        this.cursor.position.set(pos);
        this.cursor.rotation.set(rot);
        this.cursor.scale.set(scl);
        this.cursor.visible.set(true);
    }

    public clearSelected() {
        this.selected = null;
        if (this.cursor) this.cursor.visible.set(false);
    }

    private computeScale(target: hz.Entity) {
        const R0 = 0.5;
        const H0 = 1.0;

        const tSide = 0.1;
        const tTop = 0.1;

        const s = target.scale.get();
        const ax = s.x * R0;
        const az = s.z * R0;
        const hy = s.y * H0;

        const sx = (ax + tSide) / R0;
        const sz = (az + tSide) / R0;
        const sy = (hy + tTop) / H0;

        return new hz.Vec3(sx, sy, sz);
    }
}
