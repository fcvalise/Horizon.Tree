import * as hz from "horizon/core";

export class OuiHelper {
  /** Convert hz.Color to rgba(...) string. If `a` is omitted, use color.a when present, else 1. */
  public static color(c: hz.Color, a?: number) {
    const alpha = (a !== undefined ? a : ((c as any).a ?? 1));
    return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${alpha})`;
  }

  /** Raw rgba helper (sometimes handy for constants). */
  public static rgba(r: number, g: number, b: number, a = 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  }

  /**
   * Build a framed container style: transparent gap (padding) + visible border + rounded inner.
   * Set `snapEvenBorder` to true to avoid thin inner seams on odd border widths.
   */
  public static makeFrame(
    size: { width: number | string; height: number | string },
    color: string,
    pad: number = 2,
    border: number = 2,
    radius: number = 16,
    snapEvenBorder: boolean = true
  ) {
    const bw = snapEvenBorder && (border % 2 !== 0) ? border + 1 : border; // avoid AA seams
    const outerR = radius + pad;

    return {
      outer: {
        padding: pad,
        borderWidth: bw,
        borderColor: color,
        borderRadius: outerR,
        backgroundColor: "transparent",
        width: size.width,
        height: size.height,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      inner: {
        width: "100%",
        height: "100%",
        borderRadius: radius,
        backgroundColor: "transparent",
        overflow: "hidden" as const,  // single clipping edge (use for tracks/tiles)
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    };
  }

  /**
   * Convenience for inventory tiles: uses the same frame logic and returns
   * { outer, inner, fill, text } where `fill` is a 100% sized colored square.
   */
  public static makeSlotStyles(
    size: number,
    color: string,
    pad: number = 2,
    border: number = 2,
    radius: number = 16
  ) {
    const frame = OuiHelper.makeFrame(
      { width: size + pad * 2, height: size + pad * 2 },
      color,
      pad,
      border,
      radius
    );

    return {
      outer: frame.outer,
      inner: frame.inner,
      fill: {
        width: "100%",
        height: "100%",
        backgroundColor: color,
        borderRadius: radius,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      text: {
        fontSize: Math.max(14, Math.round(size * 0.36)),
        fontWeight: "bold" as const,
        color: "white",
        textAlign: "center" as const,
        textShadowColor: "black",
        textShadowOffset: [1, 1] as [number, number],
        textShadowRadius: 2,
      },
    };
  }
}
