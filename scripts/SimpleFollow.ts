import { OWrapper } from "_OWrapper";
import * as hz from "horizon/core";

export class SimpleFollow extends hz.Component<typeof SimpleFollow> {
  target!: hz.Player;
  
  tickMs = 33;
  posLerp = 0.15;
  rotLerp = 0.9;
  
  start(): void {
    const wrapper = new OWrapper(this);
    wrapper.onPlayerEnter((player) => {
      this.target = player;
    })
    this.async.setInterval(() => this.tick(), this.tickMs);
  }

  private tick() {
    if (!this.target) return;
    const position = this.entity.position.get();
    const targetPosition = this.target.position.get().add(hz.Vec3.one.mul(2));
    const newPosition = hz.Vec3.lerp(position, targetPosition, this.posLerp);
    this.entity.position.set(newPosition);

    const direction = targetPosition.sub(newPosition).normalize();
    const rotation = this.entity.rotation.get();
    const targetRotation = hz.Quaternion.lookRotation(direction);
    this.entity.rotation.set(hz.Quaternion.slerp(rotation, targetRotation, this.rotLerp));
  }
}
hz.Component.register(SimpleFollow);