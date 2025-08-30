import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";

// NOT IMPLEMENTED
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

    private debugServer(): hz.RaycastHit | undefined {
        console.error(`Raycast debug server is not implemented`);
        return undefined;
    }

    private debugLocal(): hz.RaycastHit | undefined {
        console.error(`Raycast debug server is not implemented`);
        return undefined;
    }
}