import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';
import { OMobileController } from '_OMobileController';
import { PlayerRescueModule } from 'PlayerRescueModule';
import LocalCamera from 'horizon/camera';
import { OUtils } from '_OUtils';
import { PlayerEvent } from '_PlayerEvent';
import { OColor } from '_OColor';

export class PlayerLocal extends hz.Component {
  static propsDefinition = {
    maxYVelocity: { type: hz.PropTypes.Number, default: 1 },
    raycastDistance: { type: hz.PropTypes.Number, default: 0.5 },
    stepHeight: { type: hz.PropTypes.Number, default: 0.1 },
  };

  private inputMap?: Map<hz.PlayerInputAction, hz.PlayerInput | undefined> = new Map();
  private isMapMode = false;
  private originGravity = 0;
  private originLocomotionSpeed = 0;

  async start() {
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
      const wrapper = new OWrapper(this);
      this.entity.owner.set(player);
      wrapper.setPVar(player, 'Bees:currentScore', 0);
    });
    
    const owner = this.entity.owner.get();
    if (owner != this.world.getServerPlayer()) {
      
      const wrapper = new OWrapper(this);
      this.player = owner;
      this.attachScore();
      this.attachLight();
      this.raycast = OUtils.getChildWithTag(this.entity, 'Raycast')!.as(hz.RaycastGizmo);
      owner.sprintMultiplier.set(1);
      owner.jumpSpeed.set(0);
      this.originLocomotionSpeed = owner.locomotionSpeed.get();
      owner.locomotionSpeed.set(0);
      LocalCamera.collisionEnabled.set(false);
      hz.PlayerControls.disableSystemControls();
      wrapper.onUpdate((dt) => this.autoJump(dt));

      wrapper.setTimeout(() => this.sendNetworkEvent(this.player, PlayerEvent.onAskStart, {}), 1)
      this.connectNetworkEvent(this.player, PlayerEvent.onGetStart, (payload) => {
        this.player.position.set(payload.position.add(hz.Vec3.up.mul(20)));
        this.player.locomotionSpeed.set(this.originLocomotionSpeed);
        hz.PlayerControls.enableSystemControls();
      });
      
      LocalCamera.setCameraModeFixed({
        position: hz.Vec3.zero,
        rotation: hz.Quaternion.lookRotation(hz.Vec3.down.add(hz.Vec3.left.mul(0.01))),
        duration: 0 });
        wrapper.setTimeout(() => {
          LocalCamera.setCameraModePan({ positionOffset: new hz.Vec3(30, 30, 0), duration: 2 });
        }, 0.1)

      wrapper.component.connectNetworkEvent(this.player, PlayerEvent.enableTriggerUI, (payload) => {
        // this.enableInput(this.player, payload.isEnable);
        this.enableInput(
          this.player,
          payload.isEnable,
          hz.PlayerInputAction.RightGrip,
          hz.ButtonIcon.Use,
          () => { this.sendNetworkEvent(this.player, PlayerEvent.onTouchUI, {}) }
        );
      })

        this.enableInput(
          this.player,
          true,
          hz.PlayerInputAction.RightSecondary,
          hz.ButtonIcon.Menu,
          () => {
            if (!this.isMapMode) {
              // const quest = this.world.getEntitiesWithTags(['Quests'])[0].as(hz.TriggerGizmo);
              const position = new hz.Vec3(-0.01, 100, 0);
              const rotation =  hz.Quaternion.lookRotation(hz.Vec3.down.add(hz.Vec3.left.mul(0.01)));
              this.player.enterFocusedInteractionMode();
              LocalCamera.setCameraModeFixed({ position: position, rotation: rotation, duration: 2 });
              this.isMapMode = true;
            } else {
              this.player.exitFocusedInteractionMode();
              LocalCamera.setCameraModePan({ positionOffset: new hz.Vec3(30, 30, 0), duration: 2 });
              this.isMapMode = false;
            }
            this.sendNetworkEvent(this.player, PlayerEvent.onToggleMap, {isEnable: this.isMapMode});
          }
        );
    }
  }

  private score = 0;

  private attachScore() {
    const scoreEntity = OUtils.getChildWithTag(this.entity, 'Player:Score')!;
    const scoreText = OUtils.getChildWithTag(scoreEntity, 'Player:ScoreText')?.as(hz.TextGizmo)!;
    const attach = scoreEntity.as(hz.AttachableEntity);
    attach.attachToPlayer(this.player, hz.AttachablePlayerAnchor.Head);
    
    this.connectNetworkEvent(this.player, PlayerEvent.onScore, (payload) => {
      this.score = this.score + payload.value;
      scoreText.text.set(`<b><font=roboto-bold sdf><material=roboto-bold sdf - drop shadow>${this.score}</b>`);
    });

    const bagText = OUtils.getChildWithTag(scoreEntity, 'Player:BagText')?.as(hz.TextGizmo)!;
    this.connectNetworkEvent(this.player, PlayerEvent.onBag, (payload) => {
      bagText.text.set(`<b><font=roboto-bold sdf><material=roboto-bold sdf - drop shadow>${payload.value==24?'MAX':payload.value}</b>`);
    });
  }

  private attachLight() {
    const lightEntity = OUtils.getChildWithTag(this.entity, 'Player:Light')!;
    const attach = lightEntity.as(hz.AttachableEntity);
    attach.attachToPlayer(this.player, hz.AttachablePlayerAnchor.Head);
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
    const playerForward = this.player.forward.get();
    const position = playerPosition.add(direction).add(hz.Vec3.up.mul(10));
    const hit = this.raycast.raycast(position, hz.Vec3.down);

    if (hit) {
      const yDelta = hit.hitPoint.y - playerPosition.y;
      if (yDelta > this.stepHeight) {
        this.maxYVelocity = Math.min(10, yDelta / this.stepHeight);
        this.player.velocity.set(hz.Vec3.up.mul(this.maxYVelocity));
      }
    }
  }

  // private enableInput(player: hz.Player, isEnable: boolean) {
  //   if (isEnable && !this.input) {
  //     if (hz.PlayerControls.isInputActionSupported(hz.PlayerInputAction.RightGrip)) {
  //       this.input = hz.PlayerControls.connectLocalInput(
  //         hz.PlayerInputAction.RightGrip,
  //         hz.ButtonIcon.Ability,
  //         this,
  //         { preferredButtonPlacement: hz.ButtonPlacement.Default },
  //       );
  //       this.input.registerCallback((action, pressed) => {
  //         if (pressed) {
  //           this.sendNetworkEvent(player, PlayerEvent.onTouchUI, {});
  //         }
  //       });
  //     }
  //   }
  //   if (!isEnable && this.input) {
  //     this.input.disconnect();
  //     this.input = undefined;
  //   }
  // }

    private enableInput(
      player: hz.Player,
      isEnable: boolean,
      type: hz.PlayerInputAction,
      icon: hz.ButtonIcon,
      callback: () => void
    ) {
    const input = this.inputMap?.get(type);
    if (isEnable && !input) {
      if (hz.PlayerControls.isInputActionSupported(type)) {
        const newInput = hz.PlayerControls.connectLocalInput(type, icon, this);
        newInput.registerCallback((action, pressed) => {
          if (pressed) {
            callback()
          }
        });
        this.inputMap?.set(type, newInput);
      }
    }
    if (!isEnable && input) {
      input.disconnect();
      this.inputMap?.set(type, undefined);
    }
  }
}
hz.Component.register(PlayerLocal);











// import * as hz from 'horizon/core';
// import * as npc from 'horizon/npc';
// import { OWrapper } from '_OWrapper';
// import { OMobileController } from '_OMobileController';
// import { PlayerRescueModule } from 'PlayerRescueModule';
// import { WorldInventory } from 'horizon/core';
// import LocalCamera from 'horizon/camera';
// import { OUtils } from '_OUtils';
// import { PlayerEvent } from '_PlayerEvent';

// export class PlayerLocal extends hz.Component {
//   static propsDefinition = {
//     maxYVelocity: { type: hz.PropTypes.Number, default: 1 },
//     raycastDistance: { type: hz.PropTypes.Number, default: 0.5 },
//     stepHeight: { type: hz.PropTypes.Number, default: 0.1 },
//   };

//   private mobile!: OMobileController;
//   private rescue?: PlayerRescueModule;

//   async start() {
//     this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player) => {
//       this.entity.owner.set(player);
//       // WorldInventory.grantItemToPlayer(player, 'free_a065aa47', 100);
//     });
    
//     const owner = this.entity.owner.get();
//     if (owner != this.world.getServerPlayer()) {
//       const wrapper = new OWrapper(this);
//       // this.mobile = new OMobileController(wrapper, owner);

//       this.player = owner;
//       this.raycast = OUtils.getChildWithTag(this.entity, 'Raycast')!.as(hz.RaycastGizmo);

//       // this.rescue = new PlayerRescueModule(wrapper, owner);
//       owner.sprintMultiplier.set(1);
//       owner.jumpSpeed.set(0);
//       wrapper.onUpdate((dt) => this.autoJump(dt));

//       this.initialize();
//       // this.player.avatarScale.set(0.05);
//     }
//   }

//   private player!: hz.Player;
//   private raycast!: hz.RaycastGizmo;
//   private maxYVelocity = 1;
//   private raycastDistance = 0.5;
//   private stepHeight = 0.1;

//   private autoJump(dt: number) {
//     // this.maxYVelocity = this.props.maxYVelocity;

//       // const playerPosition = this.player.position.get();
//       // const locomotion = this.player.moveToPosition(playerPosition.add(this.movementDirection));

//     this.movementDirection = this.movementDirection.mul(4);
//     let targetVelocity = new hz.Vec3(-this.movementDirection.y, -8, this.movementDirection.x);

    
//     this.raycastDistance = this.props.raycastDistance;
//     this.stepHeight = this.props.stepHeight;
//     if (!this.player.isGrounded) return;
//     // const velocity = this.player.velocity.get();
//     if (targetVelocity.y > this.maxYVelocity) return;
//     const forward = this.player.forward.get();
//     const direction = forward.mul(this.raycastDistance);
//     const playerPosition = this.player.foot.position.get();
//     // const playerPosition = this.player.foot.position.get();
//     const playerForward = this.player.forward.get();
//     const position = playerPosition.add(direction).add(hz.Vec3.up.mul(10));
//     const hit = this.raycast.raycast(position, hz.Vec3.down);

//     if (hit) {
//       const yDelta = hit.hitPoint.y - playerPosition.y;
//       if (yDelta > this.stepHeight) {
//         this.maxYVelocity = yDelta / this.stepHeight;
//         this.player.velocity.set(targetVelocity.add(hz.Vec3.up.mul(this.maxYVelocity).add(playerForward.mul(0.1))));
//       }
//     }
//     this.player.velocity.set(targetVelocity);
//     this.player.rootRotation.set(hz.Quaternion.lookRotation(new hz.Vec3(targetVelocity.x, 0 , targetVelocity.z)));

//     this.player.playAvatarAnimationLocomotion({
//       simulatedVelocity: this.player.velocity.get(),
//       falling: this.player.isGrounded.get()
//     })
//     // hz.PlayerControls.triggerInputActionDown(hz.PlayerInputAction.LeftXAxis);
//   }


//   private raycastGizmo!: hz.RaycastGizmo;
// 	private dragLastPositions: Record<number, hz.Vec3> = {}; // Multi-touch tracking
//   private movementDirection: hz.Vec3 = hz.Vec3.zero;
// 	private particleTouch!: hz.ParticleGizmo;

// 	public initialize() {
// 		this.raycastGizmo = OUtils.getChildWithTag(this.entity, 'Raycast')?.as(hz.RaycastGizmo)!;
// 		this.player.enterFocusedInteractionMode();

// 		this.particleTouch = this.entity.children.get()[0].as(hz.ParticleGizmo);

// 		this.connectLocalBroadcastEvent(hz.PlayerControls.onFocusedInteractionInputStarted,  
// 			(payload: { interactionInfo: hz.InteractionInfo[] }) => this.onFocusedInteractionInputStarted(payload.interactionInfo)
// 		);
    
// 		this.connectLocalBroadcastEvent(hz.PlayerControls.onFocusedInteractionInputMoved,
// 			(payload: { interactionInfo: hz.InteractionInfo[] }) => this.onFocusedInteractionInputMoved(payload.interactionInfo)
// 		);

// 		this.connectLocalBroadcastEvent(hz.PlayerControls.onFocusedInteractionInputEnded,
// 			(payload: { interactionInfo: hz.InteractionInfo[] }) => this.onFocusedInteractionInputEnded(payload.interactionInfo)
// 		);

// 		this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerExitedFocusedInteraction, (player) => {
// 			const owner = this.entity.owner.get();
// 			if (player == owner) {
// 				this.player.enterFocusedInteractionMode();
// 			}
// 		});
// 	}

// 	private onFocusedInteractionInputStarted(interactionInfos: hz.InteractionInfo[]) {
//     this.sendNetworkEvent(this.player, PlayerEvent.onTouchUI, {});

// 		for (const interactionInfo of interactionInfos) {
// 			this.dragLastPositions[interactionInfo.interactionIndex] = interactionInfo.screenPosition;
// 		}
//     console.log('Started');
    
// 	}

// 	private onFocusedInteractionInputMoved(interactionInfos: hz.InteractionInfo[]) {
// 		for (const interactionInfo of interactionInfos) {
// 			const start = this.dragLastPositions[interactionInfo.interactionIndex];
// 			if (!start) continue;
// 			const delta = interactionInfo.screenPosition.sub(start);
//       this.movementDirection = delta.normalize();

//       // console.log(this.movementDirection);
      
// 		}
// 	}

// 	private onFocusedInteractionInputEnded(interactionInfos: hz.InteractionInfo[]) {
// 			// this.castRay(interactionInfos);
//       this.movementDirection = hz.Vec3.zero;
// 		for (const interactionInfo of interactionInfos) {
// 			delete this.dragLastPositions[interactionInfo.interactionIndex];
// 		}
// 	}

// 	private castRay(interactionInfos: hz.InteractionInfo[]) {
// 		for (const interactionInfo of interactionInfos) {
// 			if (!this.dragLastPositions[interactionInfo.interactionIndex]) continue;
// 			const origin = interactionInfo.worldRayOrigin;
// 			const direction = interactionInfo.worldRayDirection;
// 			const hit = this.raycastGizmo.raycast(origin, direction);
// 			if (hit?.targetType === hz.RaycastTargetType.Entity && hit.distance !== 0) {
// 				// this.onTouch((hit as hz.EntityRaycastHit).target);
// 				// const camera = LocalCamera.position.get().sub(hit.hitPoint).normalize();
// 				// this.particleTouch.position.set(hit.hitPoint.add(camera.mul(0.4)));
// 				// this.particleTouch.play();
// 			}
// 		}
// 	}
// }
// hz.Component.register(PlayerLocal);