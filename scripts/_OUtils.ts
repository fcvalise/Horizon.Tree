import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";
import { OEntity } from "_OEntity";

export class OUtils {
    public static waitFor(wrapper: OWrapper, condition: () => boolean, checkEveryMs = 50): Promise<void> {
        return new Promise(resolve => {
            if (condition()) return resolve(); // already true

            const i = wrapper.component.async.setInterval(() => {
                if (condition()) {
                    wrapper.component.async.clearInterval(i);
                    resolve();
                }
            }, checkEveryMs);
        });
    }

    public static async spiralGrid(cols: number, rows: number, fn: (x: number, y: number, i: number) => void) {
        const cx = Math.floor(cols / 2);
        const cy = Math.floor(rows / 2);
        let x = cx; let y = cy; let dx = 0; let dy = -1;

        let maxSteps = cols * rows;
        for (let i = 0; i < maxSteps; i++) {
            if (x >= 0 && x < cols && y >= 0 && y < rows) { fn(x, y, i); } // process current cell
            // if at a corner, turn right
            if (x - cx === y - cy || (x - cx < 0 && x - cx === -(y - cy)) || (x - cx > 0 && x - cx === 1 - (y - cy))) {
                const tmp = dx; dx = -dy; dy = tmp;
            }
            x += dx; y += dy;
        }
    }

    public static async spiralGridAsync(wrapper: OWrapper, interval: number, cols: number, rows: number, fn: (x: number, y: number, i: number) => void): Promise<boolean> {
        const cx = Math.floor(cols / 2);
        const cy = Math.floor(rows / 2);
        let x = cx; let y = cy; let dx = 0; let dy = -1;

        let maxSteps = cols * rows;
        let index = 0;

        const sub = wrapper.setInterval(() => {
            if (index < maxSteps) {
                if (x >= 0 && x < cols && y >= 0 && y < rows) { fn(x, y, index); } // process current cell
                // if at a corner, turn right
                if (x - cx === y - cy || (x - cx < 0 && x - cx === -(y - cy)) || (x - cx > 0 && x - cx === 1 - (y - cy))) {
                    const tmp = dx; dx = -dy; dy = tmp;
                }
                x += dx; y += dy;
                index++;
                // if (index % 10 == 0) {
                //     console.log(index/maxSteps);
                // }
            } else {
                console.log(`Terrain created!`);
                wrapper.stopInterval(sub);
            }
        }, interval);
        return true;
    }

    public static closestPlayer(wrapper: OWrapper, position: hz.Vec3, playerList?: hz.Player[], serverPlayer?: hz.Player): { player: hz.Player, distance: number } {
        if (!playerList) playerList = wrapper.world.getPlayers(); // Expensive
        if (!serverPlayer) serverPlayer = wrapper.world.getServerPlayer();
        let minDistance = Number.MAX_VALUE;
        let closePlayer: hz.Player = serverPlayer;
        for (const player of playerList) {
            const playerPosition = player.position.get();
            const distance = playerPosition.distance(position);
            if (distance < minDistance) {
                minDistance = distance;
                closePlayer = player
            }
        }
        return { player: closePlayer, distance: minDistance };
    }

    public static closestOEntity(position: hz.Vec3, entityList: readonly OEntity[]): { oEntity: OEntity, distance: number } {
        let minDistance = Number.MAX_VALUE;
        let closestOEntity: OEntity;
        for (const entity of entityList) {
            const entityPosition = entity.position;
            const distance = position.distance(entityPosition);
            if (distance < minDistance) {
                minDistance = distance;
                closestOEntity = entity
            }
        }
        return { oEntity: closestOEntity!, distance: minDistance };
    }

    public static closestEntity(position: hz.Vec3, entityList: hz.Entity[]): { entity: hz.Entity, distance: number } {
        let minDistance = Number.MAX_VALUE;
        let closestEntity: hz.Entity;
        for (const entity of entityList) {
            const entityPosition = entity.position.get();
            const distance = position.distance(entityPosition);
            if (distance < minDistance) {
                minDistance = distance;
                closestEntity = entity
            }
        }
        return { entity: closestEntity!, distance: minDistance };
    }

    public static getChildWithTag(entity: hz.Entity, tag: string): hz.Entity | null {
		for (const child of entity.children.get()) {
			if (child.tags.contains(tag)) {
				return child;
			}
			else if (child.children.get().length != 0) {
				const match = this.getChildWithTag(child, tag);
				if (match != null) { return match; }
			}
		}
		return null;
	}
	
	public static getChildrenWithTag(entity: hz.Entity, list: hz.Entity[], tag: string) {
		for (const child of entity.children.get()) {
			if (child.tags.contains(tag)) {
				list.push(child)
			}
			else if (child.children.get().length != 0) {
				this.getChildrenWithTag(child, list, tag);
			}
		}
	}

    public static setOwnership(entity: hz.Entity, owner: hz.Player, reccursive: boolean = true, ignoreTags: string[] = []) {
        entity.owner.set(owner);
        const children = entity.children.get();
        for (const child of children) {
            if (!ignoreTags.some(tag => child.tags.contains(tag))) {
                this.setOwnership(child, owner);
            }
        }
    }
}