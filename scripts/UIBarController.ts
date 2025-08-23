import * as hz from 'horizon/core';

export const UpdateUIBar = new hz.NetworkEvent<{ id: string, percent: number, current: number, total: number }>('UpdateUIBar');

export class UIBarController extends hz.Component<typeof UIBarController> {
  static propsDefinition = {
    fill: { type: hz.PropTypes.Entity },
    text: { type: hz.PropTypes.Entity }
  };

  override preStart() {
    this.connectNetworkBroadcastEvent(UpdateUIBar, (data) => {
      if (this.entity.tags.contains(data.id)) { this.updateValue(data.percent, data.current, data.total); }
    });
  }

  override start() {
  }

  public updateValue(percent: number, current: number, total: number) {
    const clampedValue = Math.max(0, Math.min(1, percent));
    const newScale = new hz.Vec3(clampedValue, 1, 1);
    this.props.fill?.scale.set(newScale);
    this.props.text?.as(hz.TextGizmo)!.text.set(`${current}/${total}`);
  }
}

hz.Component.register(UIBarController);