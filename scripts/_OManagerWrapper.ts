import { OisifManager } from "_OManager";
import * as hz from "horizon/core";

export class OisifManagerWrapper extends hz.Component<typeof OisifManagerWrapper> {
    public preStart() {
        new OisifManager(this);
    }

    public start() {}
}
hz.Component.register(OisifManagerWrapper);