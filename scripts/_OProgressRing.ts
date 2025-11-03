import { Component } from 'horizon/core';
import { Bindable, Binding, UIComponent, UINode, View } from 'horizon/ui';

/**
 * Creates a circular progress ring UI node that visually represents a percentage (0–100).
 *
 * Parameters:
 * @param percent - Binding<number> that represents the current progress in percent (0..100). The UI updates automatically when this binding changes.
 * @param radius - Outer radius of the ring in pixels. The overall view size is radius * 2.
 * @param thickness - Stroke thickness of the ring (borderWidth).
 * @param color - Color string used for the filled portion of the ring.
 * @param backgroundColor - Color string used for the unfilled portion of the ring.
 *
 * Returns:
 * @returns UINode representing the composed progress ring.
 */
export function Ring(percent: Binding<number>, radius: number, thickness: number, color: string, backgroundColor: string): UINode {
  // Calculate rotations based on percent binding using derive method
  const leftHalfRotation = percent.derive((p) => `${Math.max(0, p - 50) * 3.6}deg`);
  const rightHalfRotation = percent.derive((p) => `${180 + (-Math.min(p, 50) * 3.6)}deg`);

  const HalfRing = (leftColor: string, rightColor: string, rotation: Bindable<string>) => {
    return View({
      children: [
        // Left half of the inner ring
        View({
          children: [
            View({
              style: {
                width: radius * 2,
                height: radius * 2,
                borderRadius: radius,
                borderWidth: thickness,
                borderColor: leftColor,
                position: 'absolute',
                left: 0,
                top: 0,
              },
            }),
          ],
          style: {
            width: radius,
            height: radius * 2,
            overflow: 'hidden',
            position: 'absolute',
            left: 0,
            top: 0,
          },
        }),
        // Right half of the inner ring
        View({
          style: {
            width: radius,
            height: radius * 2,
            overflow: 'hidden',
            position: 'absolute',
            left: radius,
            top: 0,
          },
          children: [
            View({
              style: {
                width: radius * 2,
                height: radius * 2,
                borderRadius: radius,
                borderWidth: thickness,
                borderColor: rightColor,
                position: 'absolute',
                left: -radius,
                top: 0,
              },
            }),
          ],
        }),
      ],
      style: {
        width: radius * 2,
        height: radius * 2,
        transform: [{ rotate: rotation }],
      },
    });
  };

  // Left Half: background on left, color on right
  const LeftHalf = View({
    children: [HalfRing(backgroundColor, color, leftHalfRotation)],
    style: {
      width: radius + 1,
      height: radius * 2,
      overflow: 'hidden',
      position: 'absolute',
      left: 0,
      top: 0,
    },
  });

  // Right Half: color on left, background on right (flipped with scaleX)
  const RightHalf = View({
    children: [HalfRing(color, backgroundColor, rightHalfRotation)],
    style: {
      width: radius,
      height: radius * 2,
      overflow: 'hidden',
      position: 'absolute',
      left: radius - 1,
      top: 0,
      transform: [{ scaleX: -1 }],
    },
  });

  const output = View({
    children: [LeftHalf, RightHalf],
    style: {
      width: radius * 2,
      height: radius * 2,
      position: 'relative',
    },
  });

  return output;
}

class Example extends UIComponent<typeof Example> {
  static propsDefinition = {};

  panelHeight = 480;
  panelWidth = 480;

  private percent = new Binding<number>(0);
  private increasing: boolean = true;

  initializeUI(): UINode {
    return View({
      children: [
        Ring(this.percent, 200, 20, '#00FF00', '#555555'),
      ],
      style: {
        width: this.panelWidth,
        height: this.panelHeight,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#222222',
      },
    });
  }

  start() {
    this.async.setInterval(() => {
      // Cycle the percent at 1 every 100ms to 100 and back to 0 on a continuous loop
      if (this.increasing) {
        const newPercent = this.percent['_globalValue'] + 1;
        if (newPercent >= 100) {
          this.percent.set(100);
          this.increasing = false;
        } else {
          this.percent.set(newPercent);
        }
      } else {
        const newPercent = this.percent['_globalValue'] - 1;
        if (newPercent <= 0) {
          this.percent.set(0);
          this.increasing = true;
        } else {
          this.percent.set(newPercent);
        }
      }
    }, 100);
  }
}
Component.register(Example);