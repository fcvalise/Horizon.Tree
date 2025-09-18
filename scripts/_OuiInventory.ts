import { OColor } from "_OColor";
import { OuiHelper } from "_OuiHelpers";
import * as hz from "horizon/core";
import { UIComponent, UINode, View, Text, Binding } from "horizon/ui";

export const OuiInventoryEvent =
  new hz.NetworkEvent<{ id: string; count: number; color?: string }>("OuiInventoryEvent");

type Slot = {
  id: string;
  count: Binding<string>;
  color: string;
};

export class OuiInventory extends UIComponent<typeof OuiInventory> {
  static propsDefinition = {
    enabled: { type: hz.PropTypes.Boolean, default: true },
    screenOffset: { type: hz.PropTypes.Vec3,    default: new hz.Vec3(50, 10, 0) },
    scale: { type: hz.PropTypes.Number,  default: 1.0 },
    slotSize: { type: hz.PropTypes.Number,  default: 56 },
  };

  private slots: Slot[] = [];

  preStart() {
    if (!this.props.enabled) this.entity.visible.set(false);

    this.connectNetworkBroadcastEvent(OuiInventoryEvent, (data) => {
      let slot = this.slots.find(s => s.id === data.id);
      if (!slot) {
        slot = this.slots.find(s => s.id === "");
        if (!slot) return;
        slot.id = data.id;
        if (data.color) slot.color = data.color;
      }
      slot.count.set(String(data.count));
    });
  }

  private slotView(slot: Slot): UINode {
    const size   = this.props.slotSize;

    const frame = OuiHelper.makeFrame({ width: size, height: size }, slot.color);

    return View({
      style: { margin: 6, ...frame.outer },
      children: [
        View({
          style: frame.inner,
          children: [
            View({
              style: {
                width: "100%",
                height: "100%",
                backgroundColor: slot.color,
                alignItems: "center" as const,
                justifyContent: "center" as const,
              },
              children: [
                Text({
                  text: slot.count,
                  style: {
                    fontSize: Math.max(14, Math.round(size * 0.36)),
                    fontWeight: "bold" as const,
                    color: "white",
                    textAlign: "center" as const,
                    textShadowColor: "black",
                    textShadowOffset: [1, 1] as [number, number],
                    textShadowRadius: 2,
                  },
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  initializeUI(): UINode {
    const defaults = [
      OuiHelper.color(OColor.Orange, 0.8),
      // OuiHelper.color(OColor.Black, 0.8),
    //   OuiHelper.color(OColor.LightGreen, 0.8), // duplicate or replace with your palette
    //   OuiHelper.color(OColor.Black, 0.8),
    //   OuiHelper.color(OColor.LightGreen, 0.8),
    //   OuiHelper.color(OColor.Black, 0.8),
    ];

    this.slots = [];
    for (let i = 0; i < defaults.length; i++) {
      this.slots.push({
        id: "",
        count: new Binding("0"),
        color: defaults[i % defaults.length],
      });
    }
    const children: UINode[] = this.slots.map((slot) => this.slotView(slot));

    return View({
      style: {
        flexDirection: "row",
        justifyContent: "center" as const,
        alignItems: "center" as const,

        position: "absolute" as const,
        layoutOrigin: [0.5, 0],
        left: `${this.props.screenOffset.x}%`,
        top:  `${this.props.screenOffset.y}%`,
        transform: [{ scale: this.props.scale }],
        zIndex: this.props.screenOffset.z,

        backgroundColor: "transparent",
        padding: 0,
      },
      children,
    });
  }
}

UIComponent.register(OuiInventory);
