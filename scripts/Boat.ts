import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';

class Boat extends hz.Component<typeof Boat> {
  static propsDefinition = {
    forwarForce: { type: hz.PropTypes.Number, default: 4 },
    downForce: { type: hz.PropTypes.Number, default: 3 },
  };

  private wrapper!: OWrapper;
  private physics?: hz.PhysicalEntity;
  
  start(): void {
    // this.wrapper = new OWrapper(this);
    // this.wrapper.onUpdate(() => this.update());
    // this.physics = this.entity.as(hz.PhysicalEntity);
  }

  update() {
      const forward = hz.Vec3.forward.mul(this.props.forwarForce);
      const down = hz.Vec3.up.mul(this.props.downForce);
      const direction = forward.add(down);
      this.physics?.applyForce(direction, hz.PhysicsForceMode.VelocityChange);
      this.physics?.springSpinTowardRotation(hz.Quaternion.lookRotation(hz.Vec3.forward));
  }
}

hz.Component.register(Boat);