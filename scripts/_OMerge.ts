import * as hz from 'horizon/core';
import "./_OMath";
import { OEntityManager } from "_OEntityManager";
import { OWrapper } from "_OWrapper";
import { OColor } from '_OColor';
import { Ease } from '_OEntity';

export class OMerge {
    public static readonly scaleAddition = 0.2;
    private index = 0;
    private posLerp = 0.2;

    constructor(
        private wrapper: OWrapper,
        private manager: OEntityManager
    ) {
        this.wrapper.onUpdate(() =>{ this.update(); });
    }

    public update() {
        const coinList = this.manager.getTagArray('Coin');
        if (coinList.length < 2) return;
        this.index = this.index < coinList.length ? this.index + 1 : 0; 
        const current = coinList[this.index];
        for (const coin of coinList) {
            if (coin && current && coin != current &&
                coin.scale.x == current.scale.x) {
                const distance = coin.position.distance(current.position);
                if (distance < coin.scale.x) {
                    const scale = current.scale.add(hz.Vec3.one.mul(OMerge.scaleAddition));
                    const color = new hz.Color(
                        current.color.r * 0.95,
                        current.color.g * 0.95,
                        current.color.b * 0.95,
                    );
                    this.manager.delete(coin);
                    current.tweenTo({
                        duration: 0.4,
                        scale: scale,
                        color: color,
                        makeStatic: false,
                        ease: Ease.easeOutBounce
                    });
                    break;
                }
                if (distance < coin.scale.x * 2) {
                    const middle = coin.position.add(current.position).mul(0.5);
                    coin.position = hz.Vec3.lerp(coin.position, middle, this.posLerp);
                    break;
                }
            }
        }
    }
}