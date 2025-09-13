import { OuiHelper } from "_OuiHelpers";
import * as hz from "horizon/core";
import { UIComponent, UINode, View, Text, Binding } from "horizon/ui";

export const OuiMapEvent = new hz.NetworkEvent<{ grid: string }>('OuiMapEvent');

export class OuiMap extends UIComponent<typeof OuiMap> {
  static propsDefinition = {
    enabled: { type: hz.PropTypes.Boolean, default: true },
    fontSize: { type: hz.PropTypes.Number,  default: 18 },
    color: { type: hz.PropTypes.Color,   default: new hz.Color(1,1,1) },
    alpha: { type: hz.PropTypes.Number,   default: 0.9},

    screenOffset: { type: hz.PropTypes.Vec3, default: new hz.Vec3(50, 50, 0) },
    rotation: { type: hz.PropTypes.Number, default: 0 },
    scale: { type: hz.PropTypes.Number, default: 1.0 },
  };

  private stringMap = new Binding<string>("");

  start(): void {
      this.connectNetworkBroadcastEvent(OuiMapEvent, (data) => {
        this.stringMap.set(data.grid);
      })
  }

  initializeUI(): UINode {
    if (!this.props.enabled) this.entity.visible.set(false);

    return View({
      children: [
        Text({
          text: this.stringMap,
          style: {
            fontFamily: "Roboto-Mono",
            fontSize: this.props.fontSize,
            fontWeight: "bold",
            lineHeight: this.props.fontSize * 0.5,
            letterSpacing: -5,
            whiteSpace: 'pre-wrap',
            color: OuiHelper.color(this.props.color, this.props.alpha),
            textAlign: "center",
            textShadowColor: "black",
          },
        }),
      ],
      style: {
        position: "absolute",
        layoutOrigin: [0.5, 0.5],
        left: `${this.props.screenOffset.x}%`,
        top: `${100 - this.props.screenOffset.y}%`,
        transform: [{ rotate: `${this.props.rotation}deg` }, { scale: this.props.scale }],
        zIndex: this.props.screenOffset.z,
        alignItems: "center",
        justifyContent: "center",
      },
    });
  }
}
UIComponent.register(OuiMap);
