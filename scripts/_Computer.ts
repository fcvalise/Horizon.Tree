import { OWrapper } from '_OManager';
import { TreeEvent } from '_TreeEvent';
import * as hz from 'horizon/core';

class Computer extends hz.Component<typeof Computer> {
  private wrapper: OWrapper = new OWrapper(this);
  private physics!: hz.PhysicalEntity;

  private position: hz.Vec3 = hz.Vec3.zero;
  private rotation: hz.Quaternion = hz.Quaternion.zero;

  start() {
    this.physics = this.entity.as(hz.PhysicalEntity);
    this.position = this.entity.position.get();
    this.wrapper.onUpdate((dt) => this.update(dt))
      this.wrapper.component.connectNetworkBroadcastEvent(TreeEvent.spawnTree, (payload) => {
        this.position = payload.position;
        this.rotation = hz.Quaternion.lookRotation(payload.player.up.get());
      });
  }

  private update(dt: number) {
    this.physics.springPushTowardPosition(this.position, {stiffness: 10, damping: 0.2, axisIndependent: false});
    this.physics.springSpinTowardRotation(this.rotation, {stiffness: 10, damping: 1, axisIndependent: false});
  }
}
hz.Component.register(Computer);