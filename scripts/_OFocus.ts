import * as hz from "horizon/core";
import LocalCamera from "horizon/camera";
import { OWrapper } from "_OWrapper";

type Unsub = () => void;

export class OFocus {
  private subs: hz.EventSubscription[] = [];
  private unsubs: Unsub[] = [];

  private lastPos: hz.Vec3 = hz.Vec3.zero;
  private lastRot: hz.Quaternion = hz.Quaternion.zero;
  private idleTimer = 0;

  private idleSeconds = 1.0;
  private posEps = 0.001;
  private rotEps = 0.001;

  private dragLast: Record<number, hz.Vec3> = {};
  private enabled = false;

  constructor(
    private wrapper: OWrapper,
    private player: hz.Player
  ) {}

  public setEnabled(flag: boolean) { this.enabled = flag; }
  public isEnabled() { return this.enabled; }

  public enter() { 
    this.player.enterFocusedInteractionMode(); 
    this.enabled = true;
  }
  public exit()  { 
    this.player.exitFocusedInteractionMode(); 
    this.enabled = false;
  }

  public autoEnterWhenStill(seconds = 1.0, posEps = 0.001, rotEps = 0.001) {
    this.idleSeconds = seconds;
    this.posEps = posEps;
    this.rotEps = rotEps;

    this.unsubs.push(
      this.wrapper.onUpdate((dt) => {
        if (!this.enabled) { this.idleTimer = 0; return; }

        const pos = this.player.position.get();
        const rot = LocalCamera.rotation.get();

        const posStill = pos.distance(this.lastPos) < this.posEps;
        const rotStill = Math.abs(rot.angle() - this.lastRot.angle()) < this.rotEps;

        if (posStill && rotStill) {
          this.idleTimer += dt;
          if (this.idleTimer >= this.idleSeconds) {
            this.enter();
            this.idleTimer = 0;
          }
        } else {
          this.idleTimer = 0;
        }

        this.lastPos = pos;
        this.lastRot = rot;
      })
    );

    return this;
  }

  public onInputStarted(cb: (info: hz.InteractionInfo) => void): Unsub {
    const sub = this.wrapper.component.connectLocalBroadcastEvent(
      hz.PlayerControls.onFocusedInteractionInputStarted,
      (payload: { interactionInfo: hz.InteractionInfo[] }) => {
        for (const it of payload.interactionInfo) {
          this.dragLast[it.interactionIndex] = it.screenPosition;
          cb(it);
        }
      }
    );
    this.subs.push(sub);
    const off = () => { try { sub.disconnect?.(); } catch {} };
    this.unsubs.push(off);
    return off;
  }

  public onInputMoved(cb: (info: hz.InteractionInfo, delta: hz.Vec3) => void): Unsub {
    const sub = this.wrapper.component.connectLocalBroadcastEvent(
      hz.PlayerControls.onFocusedInteractionInputMoved,
      (payload: { interactionInfo: hz.InteractionInfo[] }) => {
        for (const it of payload.interactionInfo) {
          const start = this.dragLast[it.interactionIndex];
          const delta = start ? it.screenPosition.sub(start) : hz.Vec3.zero;
          cb(it, delta);
        }
      }
    );
    this.subs.push(sub);
    const off = () => { try { sub.disconnect?.(); } catch {} };
    this.unsubs.push(off);
    return off;
  }

  public onInputEnded(cb: (info: hz.InteractionInfo) => void): Unsub {
    const sub = this.wrapper.component.connectLocalBroadcastEvent(
      hz.PlayerControls.onFocusedInteractionInputEnded,
      (payload: { interactionInfo: hz.InteractionInfo[] }) => {
        for (const it of payload.interactionInfo) {
          delete this.dragLast[it.interactionIndex];
          cb(it);
        }
      }
    );
    this.subs.push(sub);
    const off = () => { try { sub.disconnect?.(); } catch {} };
    this.unsubs.push(off);
    return off;
  }

  public onFocusEntered(cb: (player: hz.Player) => void): Unsub {
    const sub = this.wrapper.component.connectCodeBlockEvent(
      this.wrapper.entity, hz.CodeBlockEvents.OnPlayerEnteredFocusedInteraction,
      (p: hz.Player) => cb(p)
    );
    this.subs.push(sub);
    const off = () => { try { sub.disconnect?.(); } catch {} };
    this.unsubs.push(off);
    return off;
  }

  public onFocusExited(cb: (player: hz.Player) => void): Unsub {
    const sub = this.wrapper.component.connectCodeBlockEvent(
      this.wrapper.entity, hz.CodeBlockEvents.OnPlayerExitedFocusedInteraction,
      (p: hz.Player) => cb(p)
    );
    this.subs.push(sub);
    const off = () => { try { sub.disconnect?.(); } catch {} };
    this.unsubs.push(off);
    return off;
  }

  public castFromInteractions(
    interactions: hz.InteractionInfo[],
    raycast: hz.RaycastGizmo,
    onHit: (hit: hz.EntityRaycastHit, info: hz.InteractionInfo) => void
  ) {
    for (const info of interactions) {
      if (!this.dragLast[info.interactionIndex]) continue;
      const origin = info.worldRayOrigin;
      const dir = info.worldRayDirection;
      const hit = raycast.raycast(origin, dir);

      if (hit?.targetType === hz.RaycastTargetType.Entity && hit.distance !== 0) {
        onHit(hit as hz.EntityRaycastHit, info);
      }
    }
  }

  public dispose() {
    for (const s of this.subs) { try { s.disconnect?.(); } catch {} }
    for (const u of this.unsubs) { try { u(); } catch {} }
    this.subs = [];
    this.unsubs = [];
  }
}
