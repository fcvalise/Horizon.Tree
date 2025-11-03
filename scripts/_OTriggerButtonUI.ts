import * as hz from "horizon/core";
import * as ui from "horizon/ui";
import LocalCamera, { Camera } from "horizon/camera";
import { OWrapper } from "_OWrapper";
import { PlayerEvent } from "_PlayerEvent";
import { OuiHelper } from "_OuiHelpers";

export class OTriggerButtonUI extends ui.UIComponent<OTriggerButtonUI> {
    private leftPct = new ui.Binding<string>("50%");
    private topPct = new ui.Binding<string>("50%");
    private sizePx = 400;
    private sub: number = -1;

    public override start() {
        this.leftPct.set("-100%");
        const owner = this.entity.owner.get();
        if (owner != this.world.getServerPlayer()) {
            this.setEnable(false);
            // this.connectNetworkEvent(owner, PlayerEvent.enableTriggerUI, (payload) => {
            //     this.setEnable(payload.isEnable);
            // })
        }
    }

    private setEnable(enabled: boolean) {
        const owner = this.entity.owner.get();
        if (owner != this.world.getServerPlayer()) {
            if (enabled && this.sub == -1) {
                const wrapper = new OWrapper(this);
                this.sub = wrapper.setInterval(() => this.update(), 0.05);
            } else if (this.sub != -1) {
                this.leftPct.set("-100%");
                this.async.clearInterval(this.sub);
                this.sub = -1;
            }
        }
    }

    private update() {
        const position = LocalCamera.convertWorldToScreenPoint(this.entity.position.get());
        this.leftPct.set(`${position.x * 100}%`);
        this.topPct.set(`${(1 - position.y) * 100}%`);
    }

    public override initializeUI(): ui.UINode {
        const buttonNode = ui.Pressable({
            children: ui.View({
                style: {
                    width: this.sizePx,
                    height: this.sizePx,
                    borderRadius: 99999,
                    backgroundColor: OuiHelper.rgba(0, 0, 0, 0.3),
                    padding: 4,
                    alignItems: "center",
                    justifyContent: "center",
                },
            }),
            onPress: (player) => {
                this.sendNetworkEvent(player, PlayerEvent.onTouchUI, {});
            },
            propagateClick: false,
        });

        return ui.View({
            children: ui.View({
                children: buttonNode,
                style: {
                    position: "absolute",
                    left: this.leftPct,
                    top: this.topPct,
                    transform: [
                        { translateX: -this.sizePx / 2 },
                        { translateY: -this.sizePx / 2 },
                    ],
                    zIndex: 1000,
                },
            }),
            style: {
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
            },
        });
    }
}

ui.UIComponent.register(OTriggerButtonUI);
