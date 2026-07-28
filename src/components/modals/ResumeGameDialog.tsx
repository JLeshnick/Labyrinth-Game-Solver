import React from "react";
import { Play, RotateCcw, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";

interface ResumeGameDialogProps {
  isOpen: boolean;
  onResume: () => void;
  onNewGame: () => void;
}

export const ResumeGameDialog: React.FC<ResumeGameDialogProps> = ({
  isOpen,
  onResume,
  onNewGame,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onResume(); }}>
      <DialogContent className="max-w-md app-dialog-panel neo-brutalism-card bg-stone-900 border-3 border-stone-950 text-stone-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="gap-2 text-center items-center">
          <div className="w-12 h-12 rounded-2xl bg-theme-primary/20 border-2 border-stone-950 flex items-center justify-center text-theme-primary mb-1">
            <AlertCircle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-black uppercase tracking-wide text-stone-100">
            Resume Saved Game?
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-400 leading-relaxed max-w-sm">
            We found a previously saved game session in your browser. Would you like to continue playing or start fresh?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={onResume}
            className="flex-1 py-2.5 neo-brutalism-button bg-theme-primary text-stone-950 hover:bg-theme-primary-hover font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-stone-950" /> Continue Game
          </Button>
          <Button
            onClick={onNewGame}
            variant="outline"
            className="flex-1 py-2.5 neo-brutalism-button bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 font-bold text-xs uppercase tracking-wider rounded-xl border-stone-950 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Start New
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
