import * as hz from "horizon/core";

// Wrapper arround horizon access
export class OWrapper {
    public component!: hz.Component;
    public world!: hz.World;
    public entity!: hz.Entity;

    private subscriptions: hz.EventSubscription[] = [];

    constructor(component: hz.Component) {
        this.component = component;
        this.world = component.world;
        this.entity = component.entity;
    }

    public isServer() {
        return this.entity.owner.get() == this.world.getServerPlayer();
    }

    public onUpdate(cb: (dt: number) => void): () => void {
        const sub = this.component.connectLocalBroadcastEvent(hz.World.onUpdate,
            (payload: { deltaTime: number }) => { cb(payload.deltaTime); });
        this.subscriptions.push(sub);
        return () => { try { sub.disconnect?.(); } catch {} };
    }

    public onUpdateUntil(cb: (dt: number) => void, stop: () => boolean): void {
        const off = this.onUpdate((dt) => { if (stop()) return off(); cb(dt); });
    }
}