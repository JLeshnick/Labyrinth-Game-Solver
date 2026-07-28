import { Compass, Layers, Users, HelpCircle, Shield, Award } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface WelcomeGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}

export function WelcomeGuide({ open, onOpenChange, onDismiss }: WelcomeGuideProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-[500px] md:max-w-[650px] lg:max-w-[750px] xl:max-w-[850px] bg-card text-stone-100 p-6 rounded-3xl border-3 border-stone-950 shadow-[6px_6px_0_0_#000000] overflow-hidden flex flex-col max-h-[85vh]"
        onKeyDown={(e) => {
          if (e.key === " ") e.stopPropagation();
        }}
      >
        <DialogHeader className="shrink-0 pb-3 border-b border-stone-850">
          <DialogTitle className="text-xl font-black text-stone-100 flex items-center gap-2 uppercase tracking-wide">
            <Compass className="w-6 h-6 text-theme-primary" />
            Labyrinth Companion & Solver Guide
          </DialogTitle>
          <p className="text-xs text-stone-400 mt-1">
            Learn the game rules, cooperative mechanics, and how the pathfinding solver ranks suggestions.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 my-4 flex flex-col gap-5 text-sm">
          {/* Section 1: Gameplay Basics */}
          <div className="flex flex-col gap-2 p-3.5 app-surface">
            <h3 className="font-bold text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-1.5 uppercase text-xs tracking-wider">
              <Layers className="w-4 h-4 text-theme-primary" />
              1. Labyrinth Rules & Basics
            </h3>
            <div className="text-xs text-stone-300 flex flex-col gap-2 mt-1 leading-relaxed">
              <p>
                The game board consists of a <span className="font-bold text-stone-100">7x7 grid</span> of pathways. Sixteen fixed tiles are permanently locked, while the remaining 33 tiles are movable pathways slid into the grid. One spare tile always remains loose outside.
              </p>
              <div className="pl-3 border-l-2 border-stone-800 flex flex-col gap-1.5">
                <p>
                  <span className="font-bold text-theme-primary">Two-Phase Turns:</span> Every player's turn must follow two steps:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <span className="font-semibold text-stone-100">Slide:</span> Insert the loose spare tile (rotated as you choose) into any row or column marked with an arrow (odd indices <span className="font-semibold">1, 3, 5</span>). This pushes out a new spare tile on the opposite side. If your pawn is pushed off, it wraps around to the newly inserted tile.
                  </li>
                  <li>
                    <span className="font-semibold text-stone-100">Walk:</span> Walk your pawn as far as you want along connected, uninterrupted pathways.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: Game Modes */}
          <div className="flex flex-col gap-2 p-3.5 app-surface">
            <h3 className="font-bold text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-1.5 uppercase text-xs tracking-wider">
              <Users className="w-4 h-4 text-theme-primary" />
              2. Play Modes & Setups
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1.5">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Classic / Standard Mode
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Traditional competitive rules. Each active player has a private hand of secret target cards they must reach in order. You navigate pawns toward their own targets.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> Cooperative Mode
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  All players work together against the game to collect all 24 treasures. The solver pools the remaining treasures and automatically identifies which player pawn has the absolute closest/most efficient route, suggesting that player take the next action to optimize total turn count.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Solver Architecture & Algorithms */}
          <div className="flex flex-col gap-2 p-3.5 app-surface">
            <h3 className="font-bold text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-1.5 uppercase text-xs tracking-wider">
              <Shield className="w-4 h-4 text-theme-primary" />
              3. Solver Engine & Ranking Metrics
            </h3>
            <div className="text-xs text-stone-300 flex flex-col gap-2.5 mt-1 leading-relaxed">
              <p>
                The solver uses an asynchronous Web Worker to simulate and search every board permutation. It ranks suggestions based on three strict criteria:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2.5 app-surface flex flex-col gap-1">
                  <div className="text-xs font-black text-theme-primary uppercase tracking-wide">1. Turn Depth</div>
                  <p className="text-[11px] text-stone-300 leading-normal">
                    Checks if the treasure can be reached in 1 turn (Direct Route). If not, it simulates multi-turn setups.
                  </p>
                </div>
                <div className="p-2.5 app-surface flex flex-col gap-1">
                  <div className="text-xs font-black text-theme-primary uppercase tracking-wide">2. Walk Spaces</div>
                  <p className="text-[11px] text-stone-300 leading-normal">
                    Fewer walked spaces are heavily prioritized for clean, direct pathways and easier board readability.
                  </p>
                </div>
                <div className="p-2.5 app-surface flex flex-col gap-1">
                  <div className="text-xs font-black text-theme-primary uppercase tracking-wide">3. Safety Score</div>
                  <p className="text-[11px] text-stone-300 leading-normal">
                    Rates board connectivity out of 100. High safety means you stay open; low means you risk getting trapped.
                  </p>
                </div>
              </div>
              <div className="p-3 app-surface flex flex-col gap-3">
                <div className="font-bold text-theme-primary text-xs uppercase tracking-wider flex items-center justify-between border-b border-stone-800 pb-1.5">
                  <span>How the Algorithm Score is Calculated (0 to 100)</span>
                  <span className="text-[10px] text-stone-400 font-mono font-normal">Final Score Clamped 0 – 100</span>
                </div>

                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Every move candidate starts at <span className="font-bold text-stone-100 font-mono">0 points</span>. Points are added for safety & efficiency, and subtracted for risk or extra turns:
                </p>

                {/* Step-by-Step Point Rules */}
                <div className="flex flex-col gap-2 text-[11px] leading-relaxed">
                  <div className="p-2.5 app-surface flex flex-col gap-1 border-l-2 border-emerald-400">
                    <div className="font-bold text-emerald-400 text-xs font-mono">+ Point Addition Rules:</div>
                    <ul className="list-disc pl-4 space-y-1 text-stone-300 text-[11px]">
                      <li>
                        <span className="font-bold text-stone-100">Reachability Score (0 to +50 pts)</span>: The engine simulates floating your pawn on the new tile and counts how many total board tiles you can reach. Reaching 15+ tiles awards the full <span className="text-emerald-400 font-mono">+50 pts</span> (calculated as <span className="font-mono text-stone-200">(reachableTiles / 15) * 50</span>).
                      </li>
                      <li>
                        <span className="font-bold text-stone-100">Fixed Corner/Tile Bonus (+15 pts)</span>: If your pawn ends on one of the 16 glued fixed board tiles (even row & even column), you get <span className="text-emerald-400 font-mono">+15 pts</span> because opponents can never push a fixed tile.
                      </li>
                      <li>
                        <span className="font-bold text-stone-100">Tile Exits Bonus (+10 or +15 pts)</span>: Landing on a T-junction tile (3 corridor exits) grants <span className="text-emerald-400 font-mono">+15 pts</span>. Landing on a Straight or Corner (2 exits) grants <span className="text-emerald-400 font-mono">+10 pts</span>.
                      </li>
                      <li>
                        <span className="font-bold text-stone-100">Walk Efficiency Bonus (0 to +10 pts)</span>: Rewards short walking paths (<span className="font-mono text-stone-200">10 - stepDistance</span>). For example, walking 2 steps gives <span className="text-emerald-400 font-mono">+8 pts</span> (10 - 2).
                      </li>
                    </ul>
                  </div>

                  <div className="p-2.5 app-surface flex flex-col gap-1 border-l-2 border-red-400">
                    <div className="font-bold text-red-400 text-xs font-mono">- Point Subtraction Penalties:</div>
                    <ul className="list-disc pl-4 space-y-1 text-stone-300 text-[11px]">
                      <li>
                        <span className="font-bold text-stone-100">Board Wrap Penalty (0 to -10 pts)</span>: Deducts up to <span className="text-red-400 font-mono">-10 pts</span> if the slide forces your pawn off the board edge to wrap around onto the opposite side.
                      </li>
                      <li>
                        <span className="font-bold text-stone-100">Extra Turn Penalty (-15 pts / turn)</span>: Direct 1-turn moves lose <span className="font-mono text-stone-400">0 pts</span>. Multi-turn solutions deduct <span className="text-red-400 font-mono">-15 pts</span> for every extra setup turn required (e.g. 2 turns = <span className="text-red-400 font-mono">-15 pts</span>, 3 turns = <span className="text-red-400 font-mono">-30 pts</span>).
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Explicit Addition Calculation Box */}
                <div className="p-3 app-surface flex flex-col gap-2 text-[11px] leading-relaxed border-l-2 border-amber-400">
                  <div className="text-amber-400 font-bold text-xs flex items-center justify-between">
                    <span>📐 Complete Addition Formula & Concrete Example:</span>
                  </div>
                  <div className="text-stone-200 text-[11px] font-mono leading-relaxed space-y-1.5">
                    <div className="bg-stone-950/60 p-2 rounded border border-stone-800 text-stone-300">
                      <span className="text-stone-100 font-bold">Total Score</span> = Reachability + FixedBonus + ExitBonus + WalkBonus - WrapPenalty - TurnPenalty
                    </div>
                    <div className="text-stone-300 text-[11px] space-y-1 pt-1">
                      <div>1. Player lands on glued T-Junction tile after walking 2 spaces in 1 turn (with 15 open tiles):</div>
                      <div className="pl-3 text-stone-400">
                        • Reachability (15 open tiles) = <span className="text-emerald-400 font-bold">50</span><br />
                        • Fixed Tile Bonus (Glued space) = <span className="text-emerald-400 font-bold">15</span><br />
                        • Exit Bonus (T-Junction) = <span className="text-emerald-400 font-bold">15</span><br />
                        • Walk Bonus (10 - 2 steps) = <span className="text-emerald-400 font-bold">8</span><br />
                        • Wrap Penalty = <span className="text-stone-400">0</span>, Turn Penalty (1 turn) = <span className="text-stone-400">0</span>
                      </div>
                      <div className="border-t border-stone-800 pt-1.5 font-bold text-stone-100 flex items-center justify-between font-sans text-xs">
                        <span>Final Sum:</span>
                        <span className="text-emerald-400 font-mono text-sm">50 + 15 + 15 + 8 = 88 / 100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pl-3 border-l-2 border-stone-800 flex flex-col gap-1">
                <p>
                  <span className="font-bold text-amber-400">Fallback Strategy:</span> If a treasure is unreachable, the solver searches for slides that position your pawn closest (Manhattan distance) to set up future routes.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Tips & Custom Commands */}
          <div className="flex flex-col gap-1.5 text-xs text-stone-300">
            <h4 className="font-semibold text-stone-200">Pro Tips:</h4>
            <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
              <li>
                <span className="font-semibold text-theme-primary">Custom Targets:</span> During play, you can click <span className="font-semibold text-stone-100">any tile on the board</span> to set a custom destination. The solver will immediately calculate paths to that coordinate instead of your active card. Click clear to return to your cards.
              </li>
              <li>
                <span className="font-semibold text-theme-primary">Manual Moves:</span> You are not forced to follow the solver. Feel free to drag-and-drop the spare tile or click the board manually; the solver will automatically adapt.
              </li>
            </ul>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between border-t border-stone-800 pt-4 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <HelpCircle className="w-4 h-4 text-theme-primary" />
            Click <span className="text-theme-primary font-bold">?</span> to view this guide again.
          </div>
          <Button
            onClick={() => {
              onDismiss();
              onOpenChange(false);
            }}
            className="neo-brutalism-button bg-theme-primary border-stone-950 text-stone-950 font-black px-5 py-2 rounded-xl text-xs cursor-pointer shadow-[3px_3px_0_0_#000000]"
          >
            Got it, let's play
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
