import { OuiHelper } from "_OuiHelpers";
import * as hz from "horizon/core";
import { Binding, Text, UIComponent, UINode, View } from "horizon/ui";

export const OuiProgressEvent =
  new hz.NetworkEvent<{ id: string; percent: number; text: string }>("OuiProgressEvent");

class OuiProgress extends UIComponent<typeof OuiProgress> {
  protected panelHeight: number = 300;
  protected panelWidth: number = 500;
  private progressBar = new Binding<string>("0%");
  private progressText = new Binding<string>("0%");

  static propsDefinition = {
    enabled: { type: hz.PropTypes.Boolean, default: true },
    alpha: { type: hz.PropTypes.Number, default: 0.8 },
    fillColor: { type: hz.PropTypes.Color },
    barColor: { type: hz.PropTypes.Color },
    showValue: { type: hz.PropTypes.Boolean, default: true },
    valueColor: { type: hz.PropTypes.Color },
    screenOffset: { type: hz.PropTypes.Vec3, default: new hz.Vec3(50, 90, 0) },
    rotation: { type: hz.PropTypes.Number, default: 0 },
    scale: { type: hz.PropTypes.Number, default: 1.0 },

    // Frame visuals
    border: { type: hz.PropTypes.Number, default: 8 },
    cornerRadius: { type: hz.PropTypes.Number, default: 20 },
  };

  private hudItem(progressBar: Binding<string>, progressText: Binding<string>) {
    return [
      View({
        children: [
          // Fill
          View({
            style: {
              height: "100%",
              width: progressBar,
              backgroundColor: this.getColor(this.props.fillColor),
              alignSelf: "flex-start" as const,
            },
          }),
          // Label
          Text({
            text: progressText,
            style: {
              fontFamily: "Roboto",
              fontSize: 24,
              textAlign: "center" as const,
              color: this.getColor(this.props.valueColor),
              position: "absolute" as const,
              display: this.props.showValue ? "flex" : "none",
              transform: [{ rotate: `${360 - this.props.rotation}deg` }],
            },
          }),
        ],
        style: {
          height: "100%",
          width: "100%",
          alignSelf: "flex-end" as const,
          backgroundColor: "transparent",
          borderRadius: this.props.cornerRadius,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          overflow: "hidden" as const,
        },
      }),
    ];
  }

  initializeUI(): UINode {
    if (!this.props.enabled) this.entity.visible.set(false);

    const frame = OuiHelper.makeFrame({ width: "100%", height: "100%" }, this.getColor(this.props.barColor));

    return View({
      children: [
        View({
          style: frame.outer,
          children: [
            View({
              style: frame.inner,
              children: [...this.hudItem(this.progressBar, this.progressText)],
            }),
          ],
        }),
      ],
      style: {
        width: "40%",
        height: 40,
        layoutOrigin: [0.5, 0.5],
        left: `${this.props.screenOffset.x}%`,
        top: `${this.props.screenOffset.y}%`,
        position: "absolute",
        transform: [
          { rotate: `${this.props.rotation}deg` },
          { scale: this.props.scale },
        ],
        zIndex: this.props.screenOffset.z,
      },
    });
  }

  preStart() {
    if (!this.props.enabled) return;

    this.connectNetworkBroadcastEvent(OuiProgressEvent, (data) => {
      
      if (this.entity.tags.contains(data.id)) {
        this.progressBar.set(`${data.percent}%`);
        this.progressText.set(data.text);
      }
    });
  }

  private getColor(color: hz.Color): string {
    return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${this.props.alpha})`;
  }

  showUI(show: boolean) {
    this.entity.visible.set(show);
  }
}
UIComponent.register(OuiProgress);

export function convertOffsetToScreenSpace(offset: hz.Vec3): { x: string; y: string } {
  const x = `${offset.x}%`;
  const y = `${100 - offset.y}%`;
  return { x, y };
}
