import { OPoolManager } from '_OPool';
import * as hz from 'horizon/core';

export const UpdateUIBar = new hz.NetworkEvent<{ id: string, percent: number, text: string }>('UpdateUIBar');

export class UIBarController extends hz.Component<typeof UIBarController> {
  static propsDefinition = {
    fill: { type: hz.PropTypes.Entity },
    text: { type: hz.PropTypes.Entity }
  };

  override preStart() {
    this.connectNetworkBroadcastEvent(UpdateUIBar, (data) => {
      if (this.entity.tags.contains(data.id)) { this.updateValue(data.percent, data.text); }
    });
  }

  override start() {
  }

  public updateValue(percent: number, text: string) {
    const clampedValue = Math.max(0, Math.min(1, percent));
    const newScale = new hz.Vec3(1, 1, clampedValue);
    this.props.fill?.scale.set(newScale);
    this.props.text?.as(hz.TextGizmo)!.text.set(text);
  }
}

hz.Component.register(UIBarController);