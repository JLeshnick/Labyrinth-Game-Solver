import { describe, it, expect } from "vitest";
import { generateCurvedSvgPath } from "./svgPath";

describe("generateCurvedSvgPath", () => {
  it("handles empty or single point path", () => {
    expect(generateCurvedSvgPath([])).toBe("");
    expect(generateCurvedSvgPath([{ x: 2.5, y: 3.5 }])).toBe("M 2.500 3.500");
  });

  it("handles straight line between two points", () => {
    expect(
      generateCurvedSvgPath([
        { x: 1.5, y: 1.5 },
        { x: 2.5, y: 1.5 },
      ])
    ).toBe("M 1.500 1.500 L 2.500 1.500");
  });

  it("keeps collinear points as straight lines", () => {
    const pts = [
      { x: 1.5, y: 1.5 },
      { x: 2.5, y: 1.5 },
      { x: 3.5, y: 1.5 },
    ];
    expect(generateCurvedSvgPath(pts)).toBe("M 1.500 1.500 L 3.500 1.500");
  });

  it("adds quadratic Bézier curves at 90-degree turns", () => {
    const pts = [
      { x: 2.5, y: 1.5 },
      { x: 2.5, y: 2.5 },
      { x: 3.5, y: 2.5 },
    ];
    const path = generateCurvedSvgPath(pts, 0.25);
    expect(path).toBe("M 2.500 1.500 L 2.500 2.250 Q 2.500 2.500 2.750 2.500 L 3.500 2.500");
  });

  it("supports S-curves and multiple turns", () => {
    const pts = [
      { x: 1.5, y: 1.5 },
      { x: 2.5, y: 1.5 },
      { x: 2.5, y: 2.5 },
      { x: 3.5, y: 2.5 },
    ];
    const path = generateCurvedSvgPath(pts, 0.25);
    expect(path).toContain("Q 2.500 1.500");
    expect(path).toContain("Q 2.500 2.500");
    expect(path.endsWith("L 3.500 2.500")).toBe(true);
  });
});
