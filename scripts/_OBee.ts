import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';

export class OBee {
    // Follow
    public target!: hz.Player;
    private tickMs = 33;
    private posLerp = 0.15;
    private rotLerp = 0.12;

    constructor(private wrapper: OWrapper, private entity: hz.Entity) {
        wrapper.onPlayerEnter((player) => {
            this.target = player;
        });
        wrapper.setInterval(() => this.tickFollow(entity), this.tickMs);
    }

  private tickFollow(beeEntity: hz.Entity) {
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