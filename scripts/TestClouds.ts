import * as hz from 'horizon/core';

class TestClouds extends hz.Component<typeof TestClouds> {
  static propsDefinition = {
    sky: { type: hz.PropTypes.Entity },
    cloud: { type: hz.PropTypes.Entity },
    skySpeed: { type: hz.PropTypes.Number },
    cloudSpeed: { type: hz.PropTypes.Number },
  };
  
  private skyAngle: number = 0;
  private cloudAngle: number = 0;

  start() {
    const sub = this.connectLocalBroadcastEvent(hz.World.onUpdate, (payload) => this.update(payload.deltaTime) );
  }

  private update(dt: number) {
    this.skyAngle += dt * this.props.skySpeed;
    this.props.sky?.rotation.set(hz.Quaternion.fromEuler(new hz.Vec3(0, this.skyAngle, 0)));
    this.cloudAngle += dt * this.props.cloudSpeed;
    this.props.cloud?.rotation.set(hz.Quaternion.fromEuler(new hz.Vec3(0, this.cloudAngle, 0)));
  }
}
hz.Component.register(TestClouds);