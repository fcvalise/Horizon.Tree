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

    public getTaggedObject(tag: string) {
        const taggedList = this.world.getEntitiesWithTags([tag]);
        if (taggedList.length > 1) { console.warn(`${taggedList.length} object tagged ${tag} founded`); }
        if (taggedList.length == 0) { console.warn(`No object tagged ${tag} founded`)}
        return taggedList[0];
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

    public onPlayerEnter(cb: (player: hz.Player) => void) : () => void {
        const sub = this.component.connectCodeBlockEvent(this.component.entity, hz.CodeBlockEvents.OnPlayerEnterWorld,
            (player: hz.Player) => { cb(player); });
        this.subscriptions.push(sub);
        console.warn('On player enter shortcut in wrapper is untested');
        return () => { try { sub.disconnect?.(); } catch {} };
    }

    public waitFrames(frames: number = 1): Promise<void> {
        return new Promise(res => {
            let left = frames;
            this.onUpdateUntil(
                () => { if (--left <= 0) res(); },
                () => false // never cancel
            );
        });
    }
}