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
                <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80">
                  <div className="font-semibold text-stone-100 mb-0.5">1. Turn Depth</div>
                  <p className="text-[10px] text-stone-400 leading-normal">
                    Checks if the treasure can be reached in 1 turn (Direct Route). If not, it simulates multi-turn setups.
                  </p>
                </div>
                <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80">
                  <div className="font-semibold text-stone-100 mb-0.5">2. Walk Spaces</div>
                  <p className="text-[10px] text-stone-400 leading-normal">
                    Fewer walked spaces (👣) are heavily prioritized for clean, direct pathways and easier board readability.
                  </p>
                </div>
                <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80">
                  <div className="font-semibold text-stone-100 mb-0.5">3. Safety Score</div>
                  <p className="text-[10px] text-stone-400 leading-normal">
                    Ranks connectivity out of 100. High safety means you stay open; low safety warning means you run the risk of getting trapped.
                  </p>
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
