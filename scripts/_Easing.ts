export class Easing {

	public static lerpClamped(a: number, b: number, t: number): number {
		const tClamped = Math.max(Math.min(t, 1), 0);
		return a + (b - a) * tClamped;
	}

	public static lerpUnclamped(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	public static easeInQuad(x: number): number {
		return x * x;
	}

	public static easeInQuart(x: number): number {
		return x * x * x * x;
	}

	public static easeInExpo(x: number): number {
		return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
	}

    public static easeOutExpo(x: number): number {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

	public static easeInOutQuad(x: number): number {
		return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
	}

	public static easeInOutCubic(t: number): number {
		return t < 0.5
			? 4 * t * t * t
			: 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	public static easeInOutExpo(t: number): number {
		return t === 0
			? 0
			: t === 1
				? 1
				: t < 0.5
					? Math.pow(2, 20 * t - 10) / 2
					: (2 - Math.pow(2, -20 * t + 10)) / 2;
	}

	public static easeOutElastic(x: number): number {
		const c4 = (2 * Math.PI) / 3;

		return x === 0
			? 0
			: x === 1
				? 1
				: Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
	}

	public static easeOutBounce(x: number): number {
		const n1 = 7.5625;
		const d1 = 2.75;

		if (x < 1 / d1) {
			return n1 * x * x;
		} else if (x < 2 / d1) {
			return n1 * (x -= 1.5 / d1) * x + 0.75;
		} else if (x < 2.5 / d1) {
			return n1 * (x -= 2.25 / d1) * x + 0.9375;
		} else {
			return n1 * (x -= 2.625 / d1) * x + 0.984375;
		}
	}

	public static easeOutBack(x: number): number {
		const c1 = 1.70158;
		const c3 = c1 + 1;

		return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
	}

	public static easeInOutSine(t: number): number {
		return -(Math.cos(Math.PI * t) - 1) / 2;
	}
}
