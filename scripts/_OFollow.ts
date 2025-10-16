import * as hz from "horizon/core";
import "./_OMath";
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";

interface OFollowParams {
    spacing: number;
    posLerp: number;
    rotLerp: number;
    maxDist: number;
    maxRot: number;
}

const OFollowParamsDefault = {
    spacing: 0.2,
    posLerp: 0.1,
    rotLerp: 0.1,
    maxDist: 0.25,
    maxRot: 10,
}

type OFollower = {
    target?: OFollower;
    entity: hz.Entity;
    position: hz.Vec3;
    rotation: hz.Quaternion;
}

export class OFollow {
    private leader: OFollower;
    private followerList: OFollower[] = [];
    private tickMs = 0.033;

    constructor(
        private wrapper: OWrapper,
        leaderEntity: hz.Entity,
        followerEntityList: hz.Entity[],
        private params: OFollowParams = OFollowParamsDefault
    ) {
        this.leader = {
            entity: leaderEntity,
            position: leaderEntity.position.get(),
            rotation: leaderEntity.rotation.get()
        }

        let index = 0;
        for (const entity of followerEntityList) {
            const target = this.followerList[this.followerList.length - 1];
            const follower = {
                target: index++ == 0 ? this.leader : target,
                entity: entity,
                position: entity.position.get(),
                rotation: entity.rotation.get(),
            }
            this.followerList.push(follower);
        }

        this.wrapper.setInterval(() => this.tick(), this.tickMs);
    }
    
    private tick() {
        this.updateLeader();
        this.updateFollowers();
    }

    private updateLeader() {
        this.leader.position = this.leader.entity.position.get();
        this.leader.rotation = this.leader.entity.rotation.get();
    }

    private updateFollowers() {
        for (const follower of this.followerList) {
            const Lpos = follower.target?.position!;
            const Lrot = follower.target?.rotation!;

            const fwd = Lrot.getForward().mul(-1);
            const targetPos = Lpos.sub(fwd.mul(this.params.spacing));

            const curPos = follower.position;
            let newPos = hz.Vec3.lerp(curPos, targetPos, this.params.posLerp);

            const curRot = follower.rotation;
            let newRot = hz.Quaternion.slerp(curRot, Lrot, this.params.rotLerp);

            const toSeg = newPos.sub(Lpos);
            const dist = Math.hypot(toSeg.x, toSeg.y, toSeg.z);
            if (dist > this.params.maxDist) {
                const inv = 1 / Math.max(1e-6, dist);
                const dir = new hz.Vec3(toSeg.x * inv, toSeg.y * inv, toSeg.z * inv);
                newPos = Lpos.add(dir.mul(this.params.maxDist));
            }

            const ang = newRot.angleTo(Lrot);
            const maxAng = this.params.maxRot.toRadians();
            if (ang > maxAng) {
                const t = maxAng / Math.max(1e-6, ang);
                newRot = hz.Quaternion.slerp(Lrot, newRot, t);
            }

            follower.position = newPos;
            follower.rotation = newRot;
            // We could defer the actual update if out of screen
            follower.entity.position.set(newPos);
            follower.entity.rotation.set(newRot);
        }
    }

    public static Create(wrapper: OWrapper, root: hz.Entity, params: OFollowParams = OFollowParamsDefault): OFollow {
        const leader = OUtils.getChildWithTag(root, 'OFollow:Leader')!;
        if (!leader) console.error(`Create OFollow require entity tagged 'OFollow:Leader' (${root.name.get()})`);

        const followerList: hz.Entity[] = [];
        OUtils.getChildrenWithTag(root, followerList, 'OFollow:Follower');
        if (followerList.length == 0) console.error(`Create OFollow require entity tagged 'OFollow:Leader' (${root.name.get()})`);

        return new OFollow(wrapper, leader, followerList, params);
    }
}
