import BlobShadowManager from "_BlobShadowManager";
import { Library } from "_Library";
import { ORandom } from "_ORandom";
import { OUtils } from "_OUtils";
import * as hz from "horizon/core";
import { UpdateUIBar } from "UIBarController";

export class OEntity {
    private oPosition: hz.Vec3 = hz.Vec3.zero;
    private oRotation: hz.Quaternion = hz.Quaternion.zero;
    private oScale: hz.Vec3 = hz.Vec3.zero;
    private oColor: hz.Color = hz.Color.white;

    private syncPosition: boolean = false;
    private syncRotation: boolean = false;
    private syncScale: boolean = false;
    private syncColor: boolean = false;

    private staticProxy: hz.Entity | undefined;
    private isReady: boolean = true;
    
    constructor(public entity: hz.Entity | undefined, private wrapper: OWrapper) {
        this.wrapper.onUpdateUntil(()=> this.sync(), () => !Boolean(this.entity));
    }

    public makeStatic() {
        this.getStatic();
    }
    
    public makeDynamic() {
        this.getDynamic();
        this.deleteStatic();
    }

    public makeInvisible() {
        this.deleteDynamic();
        this.deleteStatic();
    }

    private getDynamic() {
        if (!this.entity) {
            this.entity = OisifManager.I.pool.getRaw();
            this.syncPosition = true;
            this.syncRotation = true;
            this.syncScale = true;
            this.syncColor = true;
            this.wrapper.onUpdateUntil(()=> this.sync(), () => !Boolean(this.entity));
        }
    }

    private deleteDynamic() {
        if (this.entity) {
            OisifManager.I.pool.release(this.entity);
            this.entity = undefined;
        }
    }

    private getStatic() {
        if (!this.staticProxy && this.isReady) {
            this.isReady = false;
            const asset = new hz.Asset(BigInt(Library.matterStatic));
            this.wrapper.world.spawnAsset(asset, this.oPosition.sub(hz.Vec3.down.mul(0.01)), this.oRotation, this.oScale.mul(0.98))
            .then((promise) => {
                this.staticProxy = promise[0];
                OPoolManager.staticCount++;
                this.isReady = true;
                this.deleteDynamic();
            });
        }
    }

    private deleteStatic() {
        if (this.staticProxy && this.isReady) {
            this.isReady = false;
            this.wrapper.world.deleteAsset(this.staticProxy).then(() => {
                this.staticProxy = undefined;
                OPoolManager.staticCount--;
                this.isReady = true;
            });
        }
    }

    public sync() {
        if (!this.staticProxy && this.entity) {
            const mesh = this.entity.as(hz.MeshEntity);
            if (this.syncScale) { this.entity.scale.set(this.oScale); this.syncScale = false; }
            if (this.syncColor) { mesh.style.tintColor.set(this.oColor); this.syncColor = false; }
            if (this.syncPosition) { this.entity.position.set(this.oPosition); this.syncPosition = false; }
            if (this.syncRotation) { this.entity.rotation.set(this.oRotation); this.syncRotation = false; }
        }
    }

    get position(): hz.Vec3 { return this.oPosition.clone(); }
    get rotation(): hz.Quaternion { return this.oRotation.clone(); }
    get scale(): hz.Vec3 { return this.oScale.clone(); }
    get color(): hz.Color { return this.oColor.clone(); }
    get isStatic(): boolean { return Boolean(this.staticProxy); }
    get isPhysics(): boolean { return this.entity?.simulated.get() ?? false; }

    set position(p: hz.Vec3) { this.oPosition = p; this.syncPosition = true }
    set rotation(p: hz.Quaternion) { this.oRotation = p; this.syncRotation = true }
    set scale(p: hz.Vec3) { this.oScale = p; this.syncScale = true }
    set color(p: hz.Color) { this.oColor = p; this.syncColor = true}
}

export class OPoolEntity {
    public isUse: boolean = false;
    public lastUse: number = Date.now();

    constructor(public entity: hz.Entity) {}
}

export class OPoolManager {
    public static staticCount = 0;
    private pool: OPoolEntity[] = [];
    private maxCount: number = 500;

    constructor(private wrapper: OWrapper) {
        this.createAsset();
        this.createAsset();
        this.createAsset();
        this.createAsset();
    }

    public get(): OEntity | undefined {
        const pEntity = this.pool.find(e => !e.isUse);
        if (pEntity) {
            this.reserve(pEntity);
            return new OEntity(pEntity.entity, this.wrapper);
        }
        return undefined;
    }

    public getRaw(): hz.Entity | undefined {
        const pEntity = this.pool.find(e => !e.isUse);
        if (pEntity) {
            this.reserve(pEntity);
            return pEntity.entity;
        }
        return undefined;
    }

    private reserve(pEntity: OPoolEntity) {
        pEntity.lastUse = Date.now();
        pEntity.isUse = true;
        this.updateUI();
    }

    private async createAsset() {
        const asset = new hz.Asset(BigInt(Library.matter));
        const random = OisifManager.I.random;
        const position = random.vectorHalf().normalize().mul(random.range(80, 100));
        const rotation = hz.Quaternion.lookRotation(position.mul(-1));
        const scale = new hz.Vec3(random.range(6, 10), random.range(4, 6), 1);
        const promise = await this.wrapper.world.spawnAsset(asset, position, rotation, scale);
        const entity = promise[0];
        const pEntity = new OPoolEntity(promise[0]);

        entity.interactionMode.set(hz.EntityInteractionMode.Physics);
        entity.simulated.set(false);
        pEntity.isUse = false;
        this.pool.push(pEntity);
        this.updateUI();
        if (this.pool.length < this.maxCount) {
            this.createAsset();
        }
    }

    public release(entity: hz.Entity) {
        const poolObject = this.pool.find(p => p.entity == entity);
        if (poolObject) {
            poolObject.isUse = false;
            poolObject.entity.scale.set(hz.Vec3.zero);
            poolObject.entity.position.set(this.wrapper.entity.position.get());
        }
        this.updateUI();
    }

    private updateUI() {
        let used = 0;
        for (const pEntity of this.pool) { if (pEntity.isUse) used++; }
        const percent = this.pool.length > 0 ? (used / this.pool.length) : 0;
        this.wrapper.component.sendNetworkBroadcastEvent(UpdateUIBar, {
            id: 'PoolValue', percent: percent, current: used, total: this.pool.length
        });
    }
}

export class ORaycast {
    public raycast(oWrapper: OWrapper): hz.RaycastHit | undefined {
        return undefined;
    }

    public debug(oWrapper: OWrapper) {
        if (oWrapper.isServer()) {
            this.debugServer();
        } else {
            this.debugLocal();
        }
    }

    private debugServer(): hz.RaycastHit | undefined{
        console.error(`Raycast debug server is not implemented`);
        return undefined;
    }

    private debugLocal(): hz.RaycastHit | undefined{
        console.error(`Raycast debug server is not implemented`);
        return undefined;
    }
}

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

export class OisifManager extends hz.Component<typeof OisifManager> {
    public static I: OisifManager;

    private oWrapper!: OWrapper;
    public pool!: OPoolManager;
    public random!: ORandom; 
    
    public preStart() {
        OisifManager.I = this;
        this.random = new ORandom('OisifTes');
        this.oWrapper = new OWrapper(this);
        this.pool = new OPoolManager(this.oWrapper);
    }

    public start() {}
}
hz.Component.register(OisifManager);