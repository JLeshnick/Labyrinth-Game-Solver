import { Compass, Layers, MapPin, Play, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import guideStep1Tiles from "../assets/guide-step1-tiles.png";
import guideStep2Pawns from "../assets/guide-step2-pawns.png";
import guideStep3Solve from "../assets/guide-step3-solve.png";

interface WelcomeGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Layers,
    title: "1. Place the tiles",
    body: "Drag the loose tiles onto the board, or tap Randomize Board to lay them out instantly. Fixed corner and edge tiles are already in place.",
    preview: guideStep1Tiles,
  },
  {
    icon: MapPin,
    title: "2. Place the pawns",
    body: "Assign each player's pawn to a starting corner and deal treasure cards to their hand.",
    preview: guideStep2Pawns,
  },
  {
    icon: Play,
    title: "3. Play",
    body: "Slide a tile in, then move your pawn toward its target treasure. The panel beside (or below) the board always shows the solver's best slide-and-move combo to reach your current target in the fewest turns.",
    preview: guideStep3Solve,
  },
];

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
        className="sm:max-w-[440px] app-dialog-panel border border-stone-800 text-stone-100 shadow-2xl p-6 rounded-2xl"
        onKeyDown={(e) => {
          if (e.key === " ") e.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-stone-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-theme-primary" />
            Welcome to Labyrinth Solver
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-stone-400 mt-1 leading-relaxed">
          Set up the board to match your real Labyrinth game, then let the solver guide every turn.
        </p>
        <div className="flex flex-col gap-4 mt-4 max-h-[52vh] overflow-y-auto pr-1">
          {STEPS.map((step) => (
            <div key={step.title} className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-theme-primary-10 border border-theme-primary-20 text-theme-primary shrink-0">
                <step.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-100">{step.title}</div>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{step.body}</p>
                <img
                  src={step.preview}
                  alt=""
                  className="mt-2 w-full rounded-lg border border-stone-800 object-cover max-h-24"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-5 p-3 rounded-xl bg-theme-primary-10 border border-theme-primary-20 text-xs text-stone-300">
          <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />
          Tip: tap the <span className="font-semibold text-theme-primary mx-1">?</span> button anytime to see this again.
        </div>
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => {
              onDismiss();
              onOpenChange(false);
            }}
            className="rounded-xl"
          >
            Got it, let's play
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
