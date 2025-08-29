import * as hz from "horizon/core";
import { Library } from "_Library";
import { OWrapper } from "_OWrapper";
import { OisifManager } from "_OManager";
import { OPoolManager } from "_OPool";

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
    
    constructor(public entity: hz.Entity | undefined, public wrapper: OWrapper) {
        this.wrapper.onUpdateUntil(()=> this.sync(), () => !Boolean(this.entity));
    }

    public makeDynamic() {
        if (this.getDynamic()) {
            this.deleteStatic();
        }
    }

    public makeStatic() {
        this.getStatic();
    }
    
    public makeInvisible() {
        this.deleteDynamic();
        this.deleteStatic();
    }

    private getDynamic(): boolean {
        if (!this.entity) {
            this.entity = OisifManager.I.pool.getRaw();
            this.syncPosition = true;
            this.syncRotation = true;
            this.syncScale = true;
            this.syncColor = true;
            this.wrapper.onUpdateUntil(()=> this.sync(), () => !Boolean(this.entity));
            return true;
        }
        return false;
    }

    private deleteDynamic() {
        if (this.entity) {
            OisifManager.I.pool.release(this.entity);
            this.entity = undefined;
        }
    }

    private getStatic(): boolean {
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
            return true;
        }
        return false;
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