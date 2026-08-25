import { useState, useRef, useCallback } from "react";
import { FIXED_TILES_PRESETS, generateMovablePool } from "../constants";
import type { TileData, Rotation } from "../types";
import { toSolverBoard, toSolverSpare } from "../lib/solverAdapter";
import { playRotateSound } from "../utils/audio";

export function createInitialPresetGrid(): (TileData | null)[][] {
  const initialGrid: (TileData | null)[][] = Array(7)
    .fill(null)
    .map(() => Array(7).fill(null));
  Object.entries(FIXED_TILES_PRESETS).forEach(([coord, tilePartial]) => {
    const [x, y] = coord.split(",").map(Number);
    initialGrid[y][x] = {
      id: `fixed_${x}_${y}`,
      shape: tilePartial.shape!,
      rotation: tilePartial.rotation!,
      treasure: tilePartial.treasure,
      isFixed: true,
      color: tilePartial.color,
    };
  });
  return initialGrid;
}

export function useBoardManagement() {
  const tileCounter = useRef(0);
  const nextTileId = useCallback(() => `movable_${++tileCounter.current}`, []);

  const [grid, setGrid] = useState<(TileData | null)[][]>(createInitialPresetGrid);
  const [looseTiles, setLooseTiles] = useState<TileData[]>(generateMovablePool);
  const [spareTile, setSpareTile] = useState<TileData>({
    id: "spare_initial",
    shape: "straight",
    rotation: 0,
    isFixed: false,
  });
  const [lastShiftArrowId, setLastShiftArrowId] = useState<string | null>(null);
  const [showEmptyTiles, setShowEmptyTiles] = useState(false);

  const getSolverFormattedBoard = useCallback(
    (g: (TileData | null)[][], pos: Record<string, { r: number; c: number }>) =>
      toSolverBoard(g, pos),
    []
  );

  const getSolverFormattedSpare = useCallback(
    (tile: TileData) => toSolverSpare(tile),
    []
  );

  const handleTileClick = useCallback(
    (id: string, isGameStarted: boolean, isMuted: boolean) => {
      if (id === spareTile.id) {
        if (!isMuted) playRotateSound();
        setSpareTile((prev) => ({
          ...prev,
          rotation: ((prev.rotation + 90) % 360) as Rotation,
        }));
        return;
      }
      if (isGameStarted) return;

      if (!isMuted) playRotateSound();
      setLooseTiles((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, rotation: ((t.rotation + 90) % 360) as Rotation }
            : t
        )
      );
      setGrid((prev) =>
        prev.map((row) =>
          row.map((tile) =>
            tile && tile.id === id && !tile.isFixed
              ? { ...tile, rotation: ((tile.rotation + 90) % 360) as Rotation }
              : tile
          )
        )
      );
    },
    [spareTile.id]
  );

  const resetBoardPresets = useCallback(() => {
    const initialGrid = createInitialPresetGrid();
    const freshMovablePool = generateMovablePool();
    setGrid(initialGrid);
    setLooseTiles(freshMovablePool);
    setSpareTile({
      id: "spare_initial",
      shape: "straight",
      rotation: 0,
      isFixed: false,
    });
    setLastShiftArrowId(null);
    return { initialGrid, freshMovablePool };
  }, []);

  return {
    grid,
    setGrid,
    looseTiles,
    setLooseTiles,
    spareTile,
    setSpareTile,
    lastShiftArrowId,
    setLastShiftArrowId,
    showEmptyTiles,
    setShowEmptyTiles,
    nextTileId,
    getSolverFormattedBoard,
    getSolverFormattedSpare,
    handleTileClick,
    resetBoardPresets,
  };
}
