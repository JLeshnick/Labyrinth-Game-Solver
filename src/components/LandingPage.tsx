import { useState } from "react";
import { Compass, Plus, FolderOpen, Upload } from "lucide-react";
import { Button } from "./ui/button";
import type { SaveSlot } from "../hooks/useLabyrinthStorage";

interface LandingPageProps {
  allSlots: SaveSlot[];
  onNewGame: (gameName: string) => void;
  onLoadSlot: (key: string, name: string) => void;
}

export function LandingPage({ allSlots, onNewGame, onLoadSlot }: LandingPageProps) {
  const [gameName, setGameName] = useState("");

  return (
    <div className="flex-1 flex items-center justify-center bg-[#0c0a09] p-4 sm:p-6 relative min-h-0 overflow-y-auto z-20">
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-theme-primary-10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <div className="max-w-4xl w-full z-10 flex flex-col items-center py-4 sm:py-0">
        <div className="flex flex-col items-center gap-3 sm:gap-4 mb-8 sm:mb-16 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-theme-primary-10 flex items-center justify-center border border-theme-primary-20 mb-1 sm:mb-2 shadow-lg shadow-theme-glow">
            <Compass className="w-6 h-6 sm:w-8 sm:h-8 text-theme-primary animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-stone-200 to-theme-primary bg-clip-text text-transparent">Labyrinth Game Solver</h1>
          <p className="text-stone-400 max-w-md text-sm sm:text-lg">Create, edit, simulate, and solve Labyrinth board game configurations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-3xl min-h-0">
          {/* New Game */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              // Only trigger if clicking the card background or non-input elements
              const target = e.target as HTMLElement;
              if (target.tagName !== "INPUT" && target.tagName !== "SPAN") {
                onNewGame(gameName);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                const target = e.target as HTMLElement;
                if (target.tagName !== "INPUT") {
                  e.preventDefault();
                  onNewGame(gameName);
                }
              }
            }}
            className="group relative flex flex-col items-center text-center gap-4 sm:gap-6 p-5 sm:p-8 rounded-2xl bg-stone-900/50 border border-stone-800 hover:border-theme-primary-40 hover:bg-stone-900 transition-all cursor-pointer shadow-xl text-left"
          >
            <div className="w-14 h-14 rounded-full bg-theme-primary-10 flex items-center justify-center group-hover:scale-110 group-hover:bg-theme-primary-20 transition-all">
              <Plus className="w-6 h-6 text-theme-primary" />
            </div>
            <div className="w-full flex flex-col items-center">
              <h2 className="text-lg font-bold text-white mb-1">New Game</h2>
              <p className="text-sm text-stone-400 mb-4 text-center">Initialize a new board with fixed tile presets and customize it.</p>
              
              <div className="w-full flex flex-col gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Game Name (optional)..."
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.stopPropagation();
                    }
                  }}
                  className="w-full bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-theme-primary transition-colors text-center"
                />
                <span className="text-[10px] text-stone-500 text-center leading-normal">
                  * If left blank, named by time of creation.
                </span>
              </div>
            </div>
          </div>

          {/* Load Game */}
          <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-stone-900/50 border border-stone-800 shadow-xl min-h-[240px] sm:min-h-[300px] overflow-hidden">
            <div className="flex items-center gap-2.5 text-left border-b border-stone-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-theme-primary-10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-theme-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Load Game Layout</h2>
                <p className="text-xs text-stone-500">Pick a previously saved game</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
              {allSlots.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <span className="text-xs text-stone-600">No saved games found.</span>
                  <button onClick={() => onNewGame("")} className="text-xs text-theme-primary hover:text-theme-primary-200 underline mt-2">
                    Start a new one now
                  </button>
                </div>
              ) : (
                allSlots.map((slot) => (
                  <div
                    key={slot.key}
                    className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-xl hover:border-theme-primary-20 transition-all flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0 pr-2 text-left">
                      <div className="text-xs font-bold text-stone-200 truncate">{slot.name}</div>
                      <div className="text-[10px] text-stone-500">
                        {new Date(slot.timestamp).toLocaleDateString()} at{" "}
                        {new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLoadSlot(slot.key, slot.name)}
                      className="h-7 px-2.5 border-stone-800 hover:bg-stone-900 text-xs text-stone-200 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3 text-theme-primary" />
                      Load
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
