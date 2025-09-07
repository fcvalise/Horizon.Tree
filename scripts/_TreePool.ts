// import * as hz from 'horizon/core';
// import { TMath } from '_TreeMath';
// import { TreeTween } from '_TreeTween';
// import { UpdateUIBar } from 'UIBarController';
// import { Library } from '_Library';
// import { TreeEvent } from '_TreeEvent';

// type PooledObject = { entity: hz.Entity | undefined; inUse: boolean; };
// type TrailObject = { trail: hz.TrailGizmo; followEntity: hz.Entity | undefined, inUse: boolean; };

// export class TreePool extends hz.Component<typeof TreePool> {
//     static propsDefinition = {
//         audio: { type: hz.PropTypes.Entity },
//         particleSpawn: { type: hz.PropTypes.Entity },
//         particleRelease: { type: hz.PropTypes.Entity },
//         trailParent: { type: hz.PropTypes.Entity },
//     };

//     public static I: TreePool;
    
//     private poolMap: Map<number, PooledObject[]> = new Map();
//     private tween: TreeTween = new TreeTween(this);
//     private audio!: hz.AudioGizmo;
//     private particleSpawn!: hz.ParticleGizmo;
//     private particleRelease!: hz.ParticleGizmo;
//     private poolCount: number = 0;
//     private poolLimit: number = 400;
    
    
//     preStart() { TreePool.I = this; }
//     start(): void {
//         this.audio = this.props.audio!.as(hz.AudioGizmo);
//         this.particleSpawn = this.props.particleSpawn!.as(hz.ParticleGizmo);
//         this.particleRelease = this.props.particleRelease!.as(hz.ParticleGizmo);
//         this.startTrail();

//         this.connectNetworkBroadcastEvent(TreeEvent.resetAllTree, () => { this.resetAll(); })

//         // this.createAsset(Library.matter, new hz.Vec3(0.1, 0.1, 0.5), this.particleSpawn);
//         // this.async.setTimeout(() => {
//         //     this.createAsset(Library.matter, new hz.Vec3(0.2, 0.2, 0.2), this.particleSpawn);
//         // }, 100);
        
//         // this.async.setTimeout(() => {
//         //     this.createAsset(Library.matter, new hz.Vec3(0.2, 0.2, 0.2), this.particleSpawn);
//         // }, 200);
//         // this.async.setTimeout(() => {
//         //     this.createAsset(Library.matter, new hz.Vec3(0.2, 0.2, 0.2), this.particleSpawn);
//         // }, 300);
        
//         // this.async.setTimeout(() => {
//         //     this.createAsset(Library.segementDynamic, new hz.Vec3(0.2, 0.2, 0.2), this.particleSpawn);
//         // }, 400);
//         // this.async.setTimeout(() => {
//         //     this.createAsset(Library.leafDynamic, new hz.Vec3(0.2, 0.2, 0.2), this.particleSpawn);
//         // }, 500);
//     }

//     private async createAsset(id: number, scale: hz.Vec3, particle: hz.ParticleGizmo) {
//         if (!this.poolMap.has(id)) this.poolMap.set(id, []);
//         const pool = this.poolMap.get(id)!;
//         const asset = new hz.Asset(BigInt(id));
//         const random = new hz.Vec3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
//         const position = TMath.vAdd(this.entity.position.get(), TMath.vScale(random, 1));
//         const rot = hz.Quaternion.fromEuler(TMath.vScale(random, 360));
//         const segEnts = await this.world.spawnAsset(asset, position, rot, hz.Vec3.zero);
//         // this.tween.scaleTo(segEnts[0], scale, 0.5);
//         const available = { entity: segEnts[0]!, inUse: true };
//         this.poolCount++;
//         this.park(available, particle);
//         pool.push(available);
//         if (this.poolCount < this.poolLimit) {
//             this.createAsset(id, scale, particle);
//         }

//         this.updateUI();
//     }
    
//     private updateUI() {
//         let used = 0;
//         let total = 0;
//         this.poolMap.forEach((list) => {
//             total += list.length;
//             for (const obj of list) {
//                 if (obj.inUse) used++;
//             }
//         });
//         // const percent = total > 0 ? (used / total) : 0;
//         // this.sendNetworkBroadcastEvent(UpdateUIBar, {
//         //     id: 'PoolValue',
//         //     percent: percent,
//         //     current: used,
//         //     total: total
//         // });
//     }

//     public async acquire(
//         id: number,
//         pos: hz.Vec3 = hz.Vec3.zero,
//         rot: hz.Quaternion = hz.Quaternion.zero,
//         scale: hz.Vec3 = hz.Vec3.zero,
//     ): Promise<hz.Entity | undefined> {
//         if (!this.poolMap.has(id)) this.poolMap.set(id, []);
//         const pool = this.poolMap.get(id)!;

//         // reuse
//         let available = pool.find(p => !p.inUse);
//         if (available && available.entity) {
//             available.inUse = true;
//             available.entity?.simulated.set(false);
//             // await this.waitFor(() => Boolean(available.entity?.simulated.get()!));
//             this.attach(available.entity!);
//             this.tween.moveAndScaleTo(available.entity!, hz.Vec3.zero, pos, rot, 1.5 +  Math.random() * 1.5);            
//             await this.waitFor(() => !this.tween.isTweening(available?.entity!));

//             await this.prepare(available, pos, rot, scale);
//             await this.waitFor(() => available!.entity!.position!.get()!.distance(pos)! < 0.01);
//             this.tween.scaleTo(available.entity!, scale, 0.2 +  Math.random() * 0.1);
//             await this.waitFor(() => !this.tween.isTweening(available?.entity!));

//             this.updateUI();
//             this.detach(available.entity!);
//             available.entity?.simulated.set(false);

//             return available.entity!;
//         }

//         // return undefined;

//         if (this.poolCount > this.poolLimit) {
//             return undefined;
//         }

//         // spawn
//         // const asset = new hz.Asset(BigInt(id));
//         // available = { entity: undefined, inUse: true };
//         // pool.push(available);
//         // const segEnts = await this.world.spawnAsset(asset, pos, rot, hz.Vec3.zero);
//         // available.entity = segEnts[0];
//         // await this.prepare(available, pos, rot, scale);
//         // this.tween.scaleTo(available.entity!, scale, Math.random());
//         // console.log(`Pool size : ${this.poolCount++}`);

//         // return available!.entity;
//     }

//     public isScaled(entity: hz.Entity) {
//         return !this.tween.isTweening(entity);
//     }

//     private async prepare(
//         object: PooledObject,
//         pos: hz.Vec3,
//         rot: hz.Quaternion,
//         scale: hz.Vec3,
//     ): Promise<void> {
//         object.inUse = true;
//         object.entity!.position.set(pos);
//         object.entity!.rotation.set(rot);
//         object.entity!.scale.set(scale);

//         // object.entity!.scale.set(hz.Vec3.zero);
//         this.audio.position.set(pos);
//         this.audio.play({fade: 0.05});
//     }

//     public async release(entity: hz.Entity) {
//         this.tween.stop(entity);
//         const poolValueList = Array.from(this.poolMap.values());
//         for (const pool of poolValueList) {
//             const match = pool.find(p => p.entity === entity);
//             if (match) {
//                 return this.park(match, this.particleRelease);
//             }
//         }
//     }

//     public async resetAll(): Promise<void> {
//         const poolValueList = Array.from(this.poolMap.values());
//         for (const pool of poolValueList) {
//             for (const item of pool) {
//                 if (item.inUse) {
//                     this.park(item);
//                 }
//             }
//         }
//     }

//     private async park(item: PooledObject, particle: hz.ParticleGizmo | undefined = undefined) {
//         await this.waitFor(() => Boolean(item.entity));
//         await this.waitFor(() => !this.tween.isTweening(item.entity!))
//         item.entity?.simulated.set(true);
//         await this.waitFor(() =>  item.entity?.simulated.get()!)
//         await this.waitFor(() => this.hasFallen(item.entity!));
//         const particlePos = item.entity?.getPhysicsBounds().center!;
//         if (particle) particle.position.set(particlePos);
//         item.entity?.simulated.set(false);
//         if (particle) particle.play();
//         item.inUse = false;
//         this.updateUI();
//     }

//     private hasFallen(entity: hz.Entity) {
//         // const isStopped = TMath.vLen(entity?.as(hz.PhysicalEntity).velocity.get()!) < 0.01;
//         const isStopped = TMath.vLen(entity?.as(hz.PhysicalEntity).velocity.get()!) < 0.01;

//         return isStopped;// || entity.position.get().y < 0.3;
//     }

//     waitFor(condition: () => boolean, checkEveryMs = 50): Promise<void> {
//         return new Promise(resolve => {
//             if (condition()) return resolve(); // already true

//             const i = this.async.setInterval(() => {
//                 if (condition()) {
//                     this.async.clearInterval(i);
//                     resolve();
//                 }
//             }, checkEveryMs);
//         });
//     }


//     //////////////////////


//     private trailList: TrailObject[] = [];

//     startTrail() {
//         const children = this.props.trailParent!.children.get();
//         for(const child of children) {
//             const trail = { trail: child.as(hz.TrailGizmo), followEntity: undefined, inUse: false }
//             this.trailList.push(trail);
//         }
//         this.connectLocalBroadcastEvent(hz.World.onUpdate, (data) => {
//             this.update(data.deltaTime);
//         });
//     }

//     public attach(entity: hz.Entity) {
//         let available = this.trailList.find(p => !p.inUse);
        
//         if (available) {
//             available.inUse = true;
//             available.followEntity = entity;
//             available.trail.play();
//         }
//     }

//     public detach(entity: hz.Entity) {
//         let trail = this.trailList.find(p => p.followEntity == entity)!;
//         trail.followEntity = undefined;
//         trail.trail.stop();
//         this.async.setTimeout(() => trail.inUse = false, 100);
//     }

//     private update(deltaTime: number) {
//         for (const trail of this.trailList) {
//             if (trail.inUse && trail.followEntity) {
//                 trail.trail.position.set(trail.followEntity.position.get()!);
//             }
//         }
//     }
// }
// hz.Component.register(TreePool);
