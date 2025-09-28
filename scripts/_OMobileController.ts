import * as hz from "horizon/core";
import { Gestures } from "horizon/mobile_gestures";
import LocalCamera, { CameraMode, Easing } from "horizon/camera";
import "./_OMath"
import { OWrapper } from "_OWrapper";
import { PlayerLocal } from "_PlayerLocal";
import { OFocus } from "_OFocus";
import { OCursor } from "_OCursor";

class CameraAim {
    private rotation = hz.Quaternion.zero;
    private yaw = 0;
    private pitch = 0;

    constructor(
        private sensitivity = 0.01,
        private minPitch = -Math.PI * 0.49,
        private maxPitch = Math.PI * 0.49
    ) { }

    public setOriginRotation(rotation: hz.Quaternion) {
        this.rotation = rotation;
        this.yaw = 0;
        this.pitch = 0;
    }

    public getOriginRotation(): hz.Quaternion {
        return this.rotation;
    }

    public applyPan(pan: hz.Vec3) {
        this.yaw += pan.x * this.sensitivity;
        this.pitch += -pan.y * this.sensitivity;
        if (this.pitch < this.minPitch) this.pitch = this.minPitch;
        if (this.pitch > this.maxPitch) this.pitch = this.maxPitch;
    }

    public getRotation(): hz.Quaternion {
        const base = this.rotation;
        const qYaw = hz.Quaternion.fromAxisAngle(hz.Vec3.up, this.yaw);
        const yawed = qYaw.mul(base);
        const rightAxis = yawed.rotateVec3(hz.Vec3.right).normalize();
        const qPitch = hz.Quaternion.fromAxisAngle(rightAxis, this.pitch);
        return qPitch.mul(yawed);
    }
}

export class OMobileController {
    private gestures!: Gestures;
    private focus!: OFocus;
    private cursor!: OCursor;
    private aim = new CameraAim(2.5);
    private enablePan: boolean = false;
    private cameraInput!: hz.PlayerInput;
    private backInput!: hz.PlayerInput;

    constructor(private wrapper: OWrapper, private player: hz.Player) {//, private cursor: hz.Entity) {
        this.cursor = new OCursor(wrapper, player);
        this.gestures = new Gestures(this.wrapper.component);
        this.focus = new OFocus(this.wrapper, this.player)
        this.initializeCamera();
        this.registerCameraInput();
        this.registerPan();
        this.registerTouch();
        this.registerExit();
    }

    private initializeCamera() {
        // this.player.focusedInteraction.setTapOptions();
        // this.player.focusedInteraction.setTrailOptions();
        LocalCamera.collisionEnabled.set(false);
        LocalCamera.setCameraModePan({ positionOffset: new hz.Vec3(15, 15, 0) });
    }

    private registerExit() {
        this.focus.onFocusExited((player) => {
            LocalCamera.setCameraModePan({ positionOffset: new hz.Vec3(15, 15, 0) });
        });
    }

    private registerPan() {
        this.wrapper.onUpdate(() => {
            if (LocalCamera.currentMode.get() != CameraMode.Fixed) {
                this.aim.setOriginRotation(LocalCamera.rotation.get())
            }
        });

        this.gestures.onPan.connectLocalEvent(async (payload) => {
            this.applyPan(payload.pan)
            // const touchX = payload.touches[0].current.screenPosition.x;
            // if (touchX > 0.25) {
            // } else {
            //     this.leftSideExit();
            // }
        });

        // this.gestures.onTap.connectLocalEvent(({ touches }) => {
        //     const touchX = touches[0].current.screenPosition.x
        //     if (touchX < 0.25) {
        //         this.leftSideExit();
        //     }
        // });
    }

    private registerTouch() {
        this.focus.onInputStarted((info) => {
            const raycast = this.wrapper.entity.children.get()[0].as(hz.RaycastGizmo);
            this.focus.castFromInteractions([info], raycast, (hit) => {
                if (this.cursor.getSelected() == hit.target) {
                    this.wrapper.component.sendNetworkBroadcastEvent(PlayerLocal.onTouch, { hit, player: this.player });
                    this.cursor.clearSelected();
                } else {
                    this.cursor.select(hit.target);
                }
            });
        });
    }

    private registerCameraInput() {
        if (hz.PlayerControls.isInputActionSupported(hz.PlayerInputAction.RightSecondary)) {
            this.cameraInput = hz.PlayerControls.connectLocalInput(
                hz.PlayerInputAction.RightSecondary,
                hz.ButtonIcon.Inspect,
                this.wrapper.component,
                { preferredButtonPlacement: hz.ButtonPlacement.Default },
            );
            this.cameraInput.registerCallback((action, pressed) => {
                if (pressed) {
                    this.focus.enter();
                    const position = LocalCamera.position.get().add(hz.Vec3.up.mul(2));
                    const rotation = LocalCamera.rotation.get();
                    LocalCamera.setCameraModeFixed({ position: position, rotation: rotation, duration: 0.5 })
                    .then(() =>  {
                        this.enablePan = true;
                        this.cameraInput.disconnect();
                    })
                    this.registerBackInput();
                }
            });
        }
    }

    private registerBackInput() {
        if (hz.PlayerControls.isInputActionSupported(hz.PlayerInputAction.RightSecondary)) {
            this.backInput = hz.PlayerControls.connectLocalInput(
                hz.PlayerInputAction.RightSecondary,
                hz.ButtonIcon.Door,
                this.wrapper.component,
                { preferredButtonPlacement: hz.ButtonPlacement.Default },
            );
            this.backInput.registerCallback((action, pressed) => {
                if (pressed) {
                    this.enablePan = false;
                    const position = LocalCamera.position.get().add(hz.Vec3.up.mul(-2));
                    const rotation = this.aim.getOriginRotation();
                    const angle = Math.max(0.5, this.aim.getRotation().angleTo(this.aim.getOriginRotation()));
                    const duration = (angle.toDegrees() / 360).clamp01() * 10;
                    LocalCamera.setCameraModeFixed({ position: position, rotation: rotation, duration: duration, easing: Easing.EaseInOut })
                    .then(() => {
                        this.cursor.clearSelected();
                        this.focus.exit()
                        this.backInput.disconnect();
                    });
                    this.registerCameraInput();
                }
            });
        }
    }

    private applyPan(pan: hz.Vec3) {
        if (!this.enablePan) return;
        const position = LocalCamera.position.get();
        const rotation = this.aim.getRotation();
        this.aim.applyPan(pan);
        LocalCamera.setCameraModeFixed({ position: position, rotation: rotation, duration: 0 });
    }

    private leftSideExit() {
        const position = LocalCamera.position.get();
        const rotation = this.aim.getOriginRotation();
        const angle = this.aim.getRotation().angleTo(this.aim.getOriginRotation());
        const duration = (angle.toDegrees() / 360).clamp01() * 10;
        LocalCamera.setCameraModeFixed({ position: position, rotation: rotation, duration: duration, easing: Easing.EaseInOut })
            .then(() => this.focus.exit());
    }
}
