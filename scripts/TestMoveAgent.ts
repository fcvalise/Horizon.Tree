import * as hz from 'horizon/core';

class TestMoveAgent extends hz.Component<typeof TestMoveAgent> {
  static propsDefinition = {};

  start() {
    const position = this.entity.position.get();
    let t = 0;
    this.connectLocalBroadcastEvent(hz.World.onUpdate, (data) => {
      t += data.deltaTime;
      this.entity.position.set(position.add(new hz.Vec3(0, Math.sin(t), 0)));
    });
  }
}
hz.Component.register(TestMoveAgent);