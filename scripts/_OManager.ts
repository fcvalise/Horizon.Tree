import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

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