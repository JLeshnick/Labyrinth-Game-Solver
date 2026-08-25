export interface Point {
  x: number;
  y: number;
}

/**
 * Converts an array of 2D coordinates into a continuous SVG path `d` string
 * with smooth Bézier curvature at all 90-degree turns instead of sharp right angles.
 *
 * @param points Array of {x, y} coordinates
 * @param radius Corner curve radius (defaults to 0.25 grid units)
 */
export function generateCurvedSvgPath(points: Point[], radius: number = 0.25): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)} L ${points[1].x.toFixed(3)} ${points[1].y.toFixed(3)}`;
  }

  let d = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) continue;

    const ux1 = dx1 / len1;
    const uy1 = dy1 / len1;
    const ux2 = dx2 / len2;
    const uy2 = dy2 / len2;

    // Check if path is continuing straight in the same direction
    const isStraight = Math.abs(ux1 - ux2) < 1e-4 && Math.abs(uy1 - uy2) < 1e-4;

    if (isStraight) {
      continue;
    }

    // Calculate curve radius bounded by segment lengths
    const r = Math.min(radius, len1 / 2, len2 / 2);

    // Tangent start point on incoming segment
    const ax = curr.x - r * ux1;
    const ay = curr.y - r * uy1;

    // Tangent end point on outgoing segment
    const bx = curr.x + r * ux2;
    const by = curr.y + r * uy2;

    d += ` L ${ax.toFixed(3)} ${ay.toFixed(3)} Q ${curr.x.toFixed(3)} ${curr.y.toFixed(3)} ${bx.toFixed(3)} ${by.toFixed(3)}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(3)} ${last.y.toFixed(3)}`;

  return d;
}
