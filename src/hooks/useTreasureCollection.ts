import { useState, useCallback } from "react";
import {
  EMPTY_PLAYER_HANDS,
  EMPTY_PLAYER_TARGETS,
  EMPTY_OBTAINED_TREASURES,
  TREASURES,
} from "../constants";
import type { PlayerMap } from "../types";

export function useTreasureCollection() {
  const [playerHands, setPlayerHands] =
    useState<PlayerMap<string[]>>(EMPTY_PLAYER_HANDS);
  const [playerActiveTargets, setPlayerActiveTargets] =
    useState<PlayerMap<string | null>>(EMPTY_PLAYER_TARGETS);
  const [obtainedTreasures, setObtainedTreasures] =
    useState<PlayerMap<string[]>>(EMPTY_OBTAINED_TREASURES);
  const [gameMode, setGameMode] =
    useState<"standard" | "coop" | "auto">("standard");
  const [remainingCoopTreasures, setRemainingCoopTreasures] = useState<string[]>([]);
  const [coopObtainedTreasures, setCoopObtainedTreasures] = useState<string[]>([]);

  const handleAddCard = useCallback(
    (treasureId: string, activePawn: string, onTargetAdded?: (pawn: string) => void) => {
      if (playerHands[activePawn]?.includes(treasureId)) return;
      const nextHand = [...(playerHands[activePawn] || []), treasureId];
      setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
      if (!playerActiveTargets[activePawn]) {
        setPlayerActiveTargets((prev) => ({ ...prev, [activePawn]: treasureId }));
      }
      if (onTargetAdded) {
        onTargetAdded(activePawn);
      }
    },
    [playerHands, playerActiveTargets]
  );

  const handleRemoveCard = useCallback(
    (treasureId: string, activePawn: string) => {
      const nextHand = (playerHands[activePawn] || []).filter((id) => id !== treasureId);
      setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
      setPlayerActiveTargets((prev) => ({
        ...prev,
        [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
      }));
    },
    [playerHands]
  );

  const handleAddAllCards = useCallback(
    (activePawn: string, onAllTargetsSet?: (pawn: string, count: number) => void) => {
      const allAvailable = TREASURES.filter((t) => {
        return !Object.entries(playerHands).some(
          ([color, hand]) => color !== activePawn && hand.includes(t.id)
        );
      }).map((t) => t.id);

      setPlayerHands((prev) => ({ ...prev, [activePawn]: allAvailable }));
      setPlayerActiveTargets((prev) => ({
        ...prev,
        [activePawn]: allAvailable.length > 0 ? allAvailable[0] : null,
      }));
      if (onAllTargetsSet) {
        onAllTargetsSet(activePawn, allAvailable.length);
      }
    },
    [playerHands]
  );

  const handleClearAllCards = useCallback(
    (activePawn: string, onClearTargets?: (pawn: string) => void) => {
      setPlayerHands((prev) => ({ ...prev, [activePawn]: [] }));
      setPlayerActiveTargets((prev) => ({ ...prev, [activePawn]: null }));
      if (onClearTargets) {
        onClearTargets(activePawn);
      }
    },
    []
  );

  const handleSelectTargetTreasure = useCallback(
    (
      pawnColor: string,
      treasureId: string | null,
      onSetCustomTarget?: (target: { r: number; c: number; type: "coord" | "empty" }) => void,
      onClearCustomTarget?: () => void
    ) => {
      if (treasureId && (treasureId.startsWith("coord:") || treasureId.startsWith("empty:"))) {
        const prefixLen = treasureId.indexOf(":") + 1;
        const type = treasureId.substring(0, prefixLen - 1) as "coord" | "empty";
        const [r, c] = treasureId.substring(prefixLen).split(",").map(Number);
        if (onSetCustomTarget) {
          onSetCustomTarget({ r, c, type });
        }
      } else {
        setPlayerActiveTargets((prev) => ({ ...prev, [pawnColor]: treasureId }));
        setPlayerHands((prev) => ({ ...prev, [pawnColor]: treasureId ? [treasureId] : [] }));
        if (onClearCustomTarget) {
          onClearCustomTarget();
        }
      }
    },
    []
  );

  const resetTreasureState = useCallback(() => {
    setPlayerHands(EMPTY_PLAYER_HANDS);
    setPlayerActiveTargets(EMPTY_PLAYER_TARGETS);
    setObtainedTreasures(EMPTY_OBTAINED_TREASURES);
    setRemainingCoopTreasures([]);
    setCoopObtainedTreasures([]);
  }, []);

  return {
    playerHands,
    setPlayerHands,
    playerActiveTargets,
    setPlayerActiveTargets,
    obtainedTreasures,
    setObtainedTreasures,
    gameMode,
    setGameMode,
    remainingCoopTreasures,
    setRemainingCoopTreasures,
    coopObtainedTreasures,
    setCoopObtainedTreasures,
    handleAddCard,
    handleRemoveCard,
    handleAddAllCards,
    handleClearAllCards,
    handleSelectTargetTreasure,
    resetTreasureState,
  };
}
