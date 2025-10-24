import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import * as hz from "horizon/core";

export class SimpleFollow extends hz.Component<typeof SimpleFollow> {
  target!: hz.Player;
  random!: ORandom;
  
  posLerp = 0.15;
  rotLerp = 0.9;
  t = 0;
  
  start(): void {
    this.random = new ORandom('Oisif');
    const wrapper = new OWrapper(this);
    wrapper.onPlayerEnter((player) => {
      this.target = player;
    })
    wrapper.onUpdate((dt) => this.tick(dt));
  }

  private tick(dt: number) {
    this.t += dt * 0.4;
    if (!this.target) return;
    const position = this.entity.position.get();
    const perlin = new hz.Vec3(
      this.random.perlin.noise2(this.t, 0) * 8 - 4,
      2,
      this.random.perlin.noise2(-this.t, 0) * 8 - 4,
    );
    const targetPosition = this.target.position.get().add(perlin);
    const newPosition = hz.Vec3.lerp(position, targetPosition, this.posLerp);
    this.entity.position.set(newPosition);

    const direction = targetPosition.sub(newPosition).normalize();
    const rotation = this.entity.rotation.get();
    const targetRotation = hz.Quaternion.lookRotation(direction);
    this.entity.rotation.set(hz.Quaternion.slerp(rotation, targetRotation, this.rotLerp));
  }
}
hz.Component.register(SimpleFollow);