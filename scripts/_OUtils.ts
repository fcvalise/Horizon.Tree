import * as hz from "horizon/core";
import { OWrapper } from "_OWrapper";

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

    public static closestPlayer(wrapper: OWrapper, position: hz.Vec3): { player: hz.Player, distance: number } {
        const playerList = wrapper.world.getPlayers();
        let minDistance = Number.MAX_VALUE;
        let closePlayer: hz.Player = wrapper.world.getServerPlayer();
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
}