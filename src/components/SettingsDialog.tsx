import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Eye, FolderOpen, Settings, Palette, HardDrive, Trash2, Download, Upload, Volume2, VolumeX } from "lucide-react";
import { Tile } from "./Tile";
import { PAWNS } from "../constants";
import { AUTOSAVE_KEY } from "../hooks/useLabyrinthStorage";
import { playClickSound } from "../utils/audio";
import type { SaveSlot } from "../hooks/useLabyrinthStorage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsTab: "profiles" | "preferences" | "themes" | "storage";
  setSettingsTab: (tab: "profiles" | "preferences" | "themes" | "storage") => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  activePlayers: string[];
  setActivePlayers: (players: string[]) => void;
  activePawn: string;
  saveName: string;
  setSaveName: (name: string) => void;
  allSlots: SaveSlot[];
  peekSlotKey: string | null;
  setPeekSlotKey: (key: string | null) => void;
  peekedState: any;
  onSaveSlot: (name: string) => void;
  onLoadSlot: (key: string, name: string) => void;
  onDeleteSlot: (key: string) => void;
  showToast: (msg: string) => void;
}

const THEMES = [
  { id: "amber",    name: "Amber",    class: "bg-amber-500" },
  { id: "neon",     name: "Neon",     class: "bg-lime-500" },
  { id: "ice",      name: "Ice",      class: "bg-sky-500" },
  { id: "dracula",  name: "Dracula",  class: "bg-purple-500" },
  { id: "rose",     name: "Rose",     class: "bg-pink-500" },
  { id: "emerald",  name: "Emerald",  class: "bg-emerald-500" },
  { id: "sapphire", name: "Sapphire", class: "bg-blue-500" },
  { id: "sunset",   name: "Sunset",   class: "bg-orange-500" },
  { id: "gold",     name: "Gold",     class: "bg-yellow-500" },
  { id: "nord",     name: "Nord",     class: "bg-cyan-500" },
];

const SIDEBAR_TABS = [
  { key: "profiles",    label: "Saved Profiles", description: "Manage slots & previews",  icon: <FolderOpen className="w-4 h-4" /> },
  { key: "preferences", label: "Preferences",    description: "General & active players", icon: <Settings  className="w-4 h-4" /> },
  { key: "themes",      label: "App Themes",     description: "Select theme colors",      icon: <Palette   className="w-4 h-4" /> },
  { key: "storage",     label: "File Storage",   description: "Local cache pathways",     icon: <HardDrive className="w-4 h-4" /> },
] as const;

export function SettingsDialog({
  open, onOpenChange,
  settingsTab, setSettingsTab,
  isMuted, onToggleMute,
  activeTheme, setActiveTheme,
  activePlayers, setActivePlayers,
  saveName, setSaveName,
  allSlots, peekSlotKey, setPeekSlotKey, peekedState,
  onSaveSlot, onLoadSlot, onDeleteSlot, showToast,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => { if (!isMuted) playClickSound(); }}
          className="border-stone-800 hover:bg-stone-900 text-stone-300"
          title="Settings & Saves"
          aria-label="Open settings and save slots"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] bg-stone-900 border-stone-800 text-stone-100 shadow-2xl p-0 rounded-2xl flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-stone-800 px-6 py-4 flex flex-row items-center justify-between bg-gradient-to-r from-stone-950/30 to-transparent">
          <DialogTitle className="text-lg font-bold tracking-tight text-theme-primary flex items-center gap-2">
            <Settings className="w-5 h-5 text-theme-primary" />
            Settings & Save Slots
          </DialogTitle>
          <span className="text-[10px] text-stone-400 font-normal mr-6">
            Labyrinth Game Solver v{__APP_VERSION__}
          </span>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-stone-800/80 flex flex-col py-4 px-3 gap-1 shrink-0 bg-stone-950/50">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { if (!isMuted) playClickSound(); setSettingsTab(tab.key); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group cursor-pointer ${
                  settingsTab === tab.key
                    ? "bg-theme-primary-10 border border-theme-primary/30 text-theme-primary"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/40 border border-transparent"
                }`}
              >
                <span className={settingsTab === tab.key ? "text-theme-primary" : "text-stone-500 group-hover:text-stone-300"}>
                  {tab.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-none">{tab.label}</div>
                  <div className={`text-[9px] mt-1 leading-none truncate ${settingsTab === tab.key ? "text-theme-primary/70" : "text-stone-500"}`}>
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
            <div className="mt-auto pt-4 border-t border-stone-800/60">
              <p className="text-[10px] text-stone-500 font-semibold">Labyrinth Solver</p>
              <p className="text-[9px] text-stone-600">v{__APP_VERSION__} • Desktop</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 bg-stone-900/20">

            {settingsTab === "profiles" && (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
                  <div className="flex flex-col gap-2 shrink-0">
                    <h3 className="text-sm font-semibold text-stone-200">Save Current Layout</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Slot Name (e.g. Map Trial 1)..."
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        className="flex-1 bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-theme-primary transition-colors"
                      />
                      <Button
                        onClick={() => { if (saveName.trim()) onSaveSlot(saveName); }}
                        disabled={!saveName.trim()}
                        className="bg-theme-primary text-stone-950 font-bold hover:bg-theme-primary-hover rounded-xl cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                    <h3 className="text-sm font-semibold text-stone-200">Saved Game Profiles</h3>
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                      {allSlots.length === 0 ? (
                        <div className="text-xs text-stone-500 py-6 text-center">No saved board layouts found.</div>
                      ) : (
                        allSlots.map((slot) => (
                          <div
                            key={slot.key}
                            className={`p-3 bg-stone-950/50 border rounded-xl flex items-center justify-between transition-all group ${
                              peekSlotKey === slot.key ? "border-theme-primary bg-theme-primary-10" : "border-stone-800"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2 text-left">
                              <div className="text-xs font-bold text-stone-200 truncate">{slot.name}</div>
                              <div className="text-[10px] text-stone-500">
                                {new Date(slot.timestamp).toLocaleDateString()} at{" "}
                                {new Date(slot.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { if (!isMuted) playClickSound(); setPeekSlotKey(peekSlotKey === slot.key ? null : slot.key); }}
                                className={`w-7 h-7 hover:bg-stone-900 ${peekSlotKey === slot.key ? "text-theme-primary" : "text-stone-400"}`}
                                title="Peek Layout"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onLoadSlot(slot.key, slot.name)}
                                className="h-7 px-2 border-stone-800 hover:bg-stone-900 text-xs text-stone-200 rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3 text-theme-primary" />
                                Load
                              </Button>
                              {slot.key !== AUTOSAVE_KEY && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (!isMuted) playClickSound();
                                    onDeleteSlot(slot.key);
                                    if (peekSlotKey === slot.key) setPeekSlotKey(null);
                                    showToast("Save Slot Deleted");
                                  }}
                                  className="w-7 h-7 text-stone-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                  title="Delete Save"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-center items-center bg-stone-950/40 border border-stone-800 rounded-2xl p-4 min-h-[300px]">
                  {peekedState ? (
                    <div className="flex flex-col gap-4 items-center w-full h-full justify-center">
                      <div className="text-xs text-stone-400 font-bold self-start flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-theme-primary" />
                        Previewing Saved Board:
                      </div>
                      <div className="grid grid-cols-7 grid-rows-7 gap-[4px] p-3 bg-stone-900 border border-stone-800 rounded-xl max-w-full aspect-square">
                        {peekedState.board.map((row: any[], rIdx: number) =>
                          row.map((cell: any, cIdx: number) => {
                            let hasPawn: string | null = null;
                            if (peekedState.pawnPositions) {
                              const found = Object.entries(peekedState.pawnPositions).find(
                                ([, pos]: any) => pos.r === rIdx && pos.c === cIdx
                              );
                              if (found) hasPawn = found[0];
                            }
                            return (
                              <div key={`${rIdx}-${cIdx}`} className="w-8 h-8 rounded-sm overflow-hidden flex items-center justify-center relative bg-stone-950 border border-stone-800/40">
                                {cell ? (
                                  <Tile tile={cell} disabled boardRotation={0} className="w-full h-full pointer-events-none shadow-none rounded-none border-0 text-[3px]" />
                                ) : (
                                  <div className="w-full h-full border border-dashed border-stone-800 bg-stone-950/20" />
                                )}
                                {hasPawn && (
                                  <div className={`absolute w-2 h-2 rounded-full ring-[1px] ring-white shadow z-20 ${
                                    hasPawn === "red" ? "bg-red-500" : hasPawn === "blue" ? "bg-blue-500" : hasPawn === "green" ? "bg-green-500" : "bg-yellow-400"
                                  }`} />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500 text-center font-medium">Miniature preview of corridors, spawns, and pawns.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 text-stone-500 text-xs">
                      <Eye className="w-8 h-8 text-stone-700 mb-2" />
                      <span>Click the eye icon on a save slot profile to load its miniature preview here.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "preferences" && (
              <div className="flex flex-col gap-6 max-w-xl text-left">
                <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-xl flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-stone-200">System Preferences</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-300">Retro Audio Oscillators</span>
                    <Button
                      variant={isMuted ? "outline" : "default"}
                      onClick={onToggleMute}
                      className={isMuted ? "border-stone-800 text-stone-400" : "bg-theme-primary text-stone-950 font-bold hover:bg-theme-primary-hover"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                      {isMuted ? "Muted" : "Active"}
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-xl flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-stone-200">Manage Active Players</h3>
                  <p className="text-xs text-stone-400 leading-normal">
                    Enable or disable players to tailor the setup checklist and turns list. If playing solo or only tracking your piece, keep only Red active.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 mt-2">
                    {PAWNS.map((p) => {
                      const isActive = activePlayers.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (!isMuted) playClickSound();
                            if (isActive) {
                              if (activePlayers.length > 1) {
                                setActivePlayers(activePlayers.filter((id) => id !== p.id));
                              } else {
                                showToast("At least one player must be active!");
                              }
                            } else {
                              setActivePlayers([...activePlayers, p.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? "border-theme-primary bg-theme-primary-10 text-theme-primary"
                              : "border-stone-800 bg-stone-950/40 hover:bg-stone-900 text-stone-400 hover:text-stone-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full ring-1 ring-white/20 ${p.colorClass}`} />
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[10px] opacity-75">{isActive ? "Active" : "Off"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "themes" && (
              <div className="flex flex-col gap-4 max-w-xl text-left">
                <h3 className="text-sm font-semibold text-stone-200">App Theme Colors</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { if (!isMuted) playClickSound(); setActiveTheme(t.id); }}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold justify-start transition-all cursor-pointer ${
                        activeTheme === t.id
                          ? "border-theme-primary bg-theme-primary-10 text-theme-primary"
                          : "border-stone-800 bg-stone-950/40 hover:bg-stone-900 text-stone-300"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ring-1 ring-white/10 ${t.class}`} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {settingsTab === "storage" && (
              <div className="flex flex-col gap-4 max-w-xl text-left">
                <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-xl flex flex-col gap-2.5 text-xs text-stone-400">
                  <h3 className="text-sm font-semibold text-stone-200">File Storage Information</h3>
                  <div>
                    <div className="font-semibold text-stone-300">Local Cache Directory:</div>
                    <div className="font-mono bg-stone-950 p-2.5 rounded-lg border border-stone-800 select-text break-all mt-1">
                      {navigator.userAgent.toLowerCase().includes("win")
                        ? "%APPDATA%\\Labyrinth-Game-Solver\\Local Storage\\"
                        : "~/Library/Application Support/Labyrinth-Game-Solver/Local Storage/"}
                    </div>
                  </div>
                  <div className="mt-1 leading-normal">
                    Layout presets and custom slots are persisted securely locally within your sandboxed app configurations folder.
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
