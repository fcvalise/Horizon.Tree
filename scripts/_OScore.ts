import * as hz from 'horizon/core';
import { OWrapper } from "_OWrapper";
import { PlayerEvent } from "_PlayerEvent";
import { OColor } from '_OColor';

export class OScoreData {
    public score = 0;
    public maxScore = 0;
    public hasPopup = false;
}

export class OScore {
    private playerMap: Map<hz.Player, OScoreData> = new Map();

    constructor(wrapper: OWrapper) {
        wrapper.onPlayerEnter((player) => {
            const scoreData = new OScoreData();
            scoreData.maxScore = wrapper.getPVar(player, 'Bees:maxScore') ?? 0;
            this.playerMap.set(player, scoreData);
            wrapper.component.connectNetworkEvent(player, PlayerEvent.onScore, (payload) => {
                this.addScore(wrapper, player, payload.value);
            })
        })
    }

    public addScore(wrapper: OWrapper, player: hz.Player, value: number) {
        const data = this.playerMap.get(player)!;
        data.score += value;

        wrapper.setPVar(player, 'Bees:currentScore', data.score);

        if (data.score > data.maxScore && data.score > 10) {
            data.maxScore = data.score;
            wrapper.setPVar(player, 'Bees:maxScore', data.score);
            wrapper.world.leaderboards.setScoreForPlayer('Score', player, data.score, true);

            if (!data.hasPopup) {
                data.hasPopup = true;
                wrapper.world.ui.showPopupForPlayer(player, 'NEW HIGHSCORE!', 5, {
                    position: hz.Vec3.zero,
                    fontSize: 2,
                    fontColor: OColor.Orange,
                    backgroundColor: hz.Color.white,
                    playSound: false,
                    showTimer: false,
                });
            }
        }
    }
}