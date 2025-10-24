import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';
import { OMobileController } from '_OMobileController';
import { PlayerRescueModule } from 'PlayerRescueModule';
import { WorldInventory } from 'horizon/core';
import LocalCamera from 'horizon/camera';
import { OUtils } from '_OUtils';

export class PlayerLocal extends hz.Component {
  static propsDefinition = {
    maxYVelocity: { type: hz.PropTypes.Number, default: 1 },
    raycastDistance: { type: hz.PropTypes.Number, default: 0.5 },
    stepHeight: { type: hz.PropTypes.Number, default: 0.1 },
  };

  private mobile!: OMobileController;
  private rescue?: PlayerRescueModule;

  async start() {
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
      this.entity.owner.set(player);
      // WorldInventory.grantItemToPlayer(player, 'free_a065aa47', 100);
    });
    
    const owner = this.entity.owner.get();
    if (owner != this.world.getServerPlayer()) {
      const wrapper = new OWrapper(this);
      // this.mobile = new OMobileController(wrapper, owner);

      this.player = owner;
      this.raycast = OUtils.getChildWithTag(this.entity, 'Raycast')!.as(hz.RaycastGizmo);

      // this.rescue = new PlayerRescueModule(wrapper, owner);
      owner.sprintMultiplier.set(1);
      owner.jumpSpeed.set(0);
      LocalCamera.collisionEnabled.set(false);
      hz.PlayerControls.disableSystemControls();
      wrapper.onUpdate((dt) => this.autoJump(dt));
    }
  }

  private player!: hz.Player;
  private raycast!: hz.RaycastGizmo;
  private maxYVelocity = 1;
  private raycastDistance = 0.5;
  private stepHeight = 0.1;

  private autoJump(dt: number) {
    // this.maxYVelocity = this.props.maxYVelocity;
    this.raycastDistance = this.props.raycastDistance;
    this.stepHeight = this.props.stepHeight;

    if (!this.player.isGrounded) return;
    const velocity = this.player.velocity.get();
    if (velocity.y > this.maxYVelocity) return;
    const forward = this.player.forward.get();
    const direction = forward.mul(this.raycastDistance);
    const playerPosition = this.player.foot.position.get();
    const position = playerPosition.add(direction).add(hz.Vec3.up.mul(10));
    const hit = this.raycast.raycast(position, hz.Vec3.down);

    if (hit) {
      const yDelta = hit.hitPoint.y - playerPosition.y;
      if (yDelta > this.stepHeight) {
        this.maxYVelocity = yDelta / this.stepHeight;
        this.player.velocity.set(hz.Vec3.up.mul(this.maxYVelocity));
      }
    }
  }
}
hz.Component.register(PlayerLocal);