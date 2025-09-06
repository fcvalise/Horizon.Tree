import type { Bud } from "_TreeGrowth";

export type TreeProgressMetrics = {
  axes: number;
  maxDepth: number;
  deepestPerAxis: { [axisId: number]: number };
  depthSum: number;
  expectedSegments: number;
  progress: number;
  completed: boolean;
};

export function estimateTreeProgressCurrent(
  root: Bud,
  maxDepth: number
): TreeProgressMetrics {
  var deepestPerAxis: { [axisId: number]: number } = {};
  var stack: Bud[] = [root];

  while (stack.length) {
    var b = stack.pop()!;
    var prev = deepestPerAxis[b.axisId];
    if (prev === undefined || b.depth > prev) deepestPerAxis[b.axisId] = b.depth;

    if (b.children && b.children.length) {
      for (var i = 0; i < b.children.length; i++) stack.push(b.children[i]);
    }
  }

  var depthSum = 0;
  var axes = 0;
  var completed = true;

  for (var k in deepestPerAxis) {
    if (Object.prototype.hasOwnProperty.call(deepestPerAxis, k)) {
      var deepest = deepestPerAxis[k as any] || 0;
      var levels = deepest + 1;
      if (levels > maxDepth) levels = maxDepth;
      depthSum += levels;
      axes++;
      if (levels < maxDepth) completed = false;
    }
  }

  if (axes === 0 || maxDepth <= 0) {
    return {
      axes: axes,
      maxDepth: maxDepth,
      deepestPerAxis: deepestPerAxis,
      depthSum: 0,
      expectedSegments: axes * maxDepth,
      progress: 0,
      completed: false
    };
  }

  var expected = axes * maxDepth;
  var progress = completed ? 1 : clamp01(depthSum / expected);

  return {
    axes: axes,
    maxDepth: maxDepth,
    deepestPerAxis: deepestPerAxis,
    depthSum: depthSum,
    expectedSegments: expected,
    progress: progress,
    completed: completed
  };
}

function clamp01(x: number): number { return x < 0 ? 0 : (x > 1 ? 1 : x); }
