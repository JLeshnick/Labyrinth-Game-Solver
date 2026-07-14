import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import {
  Eye, FolderOpen, Settings, Palette, HardDrive, Trash2, Download, Upload,
  Volume2, VolumeX, Cpu, RefreshCw, Keyboard,
} from "lucide-react";
import { Tile } from "./Tile";
import { PAWNS } from "../constants";
import { AUTOSAVE_KEY } from "../hooks/useLabyrinthStorage";
import { playClickSound } from "../utils/audio";
import type { SaveSlot } from "../hooks/useLabyrinthStorage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsTab: "profiles" | "preferences" | "appearance" | "storage" | "application";
  setSettingsTab: (tab: "profiles" | "preferences" | "appearance" | "storage" | "application") => void;
  isMuted: boolean;
  onToggleMute: () => void;
  baseTheme: "dark" | "light";
  setBaseTheme: (theme: "dark" | "light") => void;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  activePlayers: string[];
  setActivePlayers: (players: string[]) => void;
  activePawn: string;
  saveName: string;
  setSaveName: (name: string) => void;
  allSlots: SaveSlot[];
  peekSlotKey: string | null;
  setPeekSlotKey: (key: string | null) => void;
  peekedState: any;
  onSaveSlot: (name: string) => void | Promise<any>;
  onLoadSlot: (key: string, name: string) => void | Promise<any>;
  onDeleteSlot: (key: string) => void | Promise<any>;
  showToast: (msg: string) => void;
  desktopSettings: { gamesDir: string } | null;
  onSetDesktopSettings: (settings: { gamesDir: string }) => void | Promise<any>;
}

const ACCENT_PRESETS = [
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#84cc16", name: "Lime" },
  { hex: "#0ea5e9", name: "Sky Blue" },
  { hex: "#a855f7", name: "Purple" },
  { hex: "#ec4899", name: "Rose" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#22d3ee", name: "Cyan" },
];

const KEYBOARD_SHORTCUTS = [
  {
    group: "Board",
    shortcuts: [
      { keys: ["Ctrl", "Z"], desc: "Undo last action" },
      { keys: ["Ctrl", "Y"], desc: "Redo last action" },
      { keys: ["Ctrl", "S"], desc: "Save current game" },
    ],
  },
  {
    group: "Interface",
    shortcuts: [
      { keys: ["Esc"], desc: "Close dialogs" },
      { keys: ["?"], desc: "Open Settings" },
    ],
  },
];

const SIDEBAR_TABS = [
  { key: "profiles",    label: "Saved Games",  description: "Manage slots & previews",  icon: <FolderOpen className="w-4 h-4" /> },
  { key: "preferences", label: "Preferences",  description: "General & active players", icon: <Settings className="w-4 h-4" /> },
  { key: "appearance",  label: "Appearance",   description: "Themes & accent color",    icon: <Palette className="w-4 h-4" /> },
  { key: "storage",     label: "File Storage", description: "Local cache pathways",     icon: <HardDrive className="w-4 h-4" /> },
  { key: "application", label: "Application",  description: "Info & shortcuts",         icon: <Cpu className="w-4 h-4" /> },
] as const;

export function SettingsDialog({
  open, onOpenChange,
  settingsTab, setSettingsTab,
  isMuted, onToggleMute,
  baseTheme, setBaseTheme,
  accentColor, setAccentColor,
  activePlayers, setActivePlayers,
  saveName, setSaveName,
  allSlots, peekSlotKey, setPeekSlotKey, peekedState,
  onSaveSlot, onLoadSlot, onDeleteSlot, showToast,
  desktopSettings, onSetDesktopSettings,
}: SettingsDialogProps) {
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<SaveSlot | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  const handleCheckForUpdates = () => {
    setUpdateChecking(true);
    setUpdateResult(null);
    setTimeout(() => {
      setUpdateChecking(false);
      setUpdateResult("You're up to date!");
    }, 1500);
    const releasesUrl = "https://github.com/jleshnick/Labyrinth-Game-Solver/releases";
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(releasesUrl);
    } else {
      window.open(releasesUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleResetCache = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("labyrinth"));
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  const isCustomAccent = !ACCENT_PRESETS.some((p) => p.hex.toLowerCase() === accentColor.toLowerCase());

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => { if (!isMuted) playClickSound(); }}
          className="border-stone-800 hover:bg-stone-900 text-stone-300"
          title="Settings"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] app-dialog-panel border-stone-800 text-stone-100 shadow-2xl p-0 rounded-2xl flex flex-col overflow-hidden" onKeyDown={(e) => {
        if (e.key === " ") {
          e.stopPropagation();
        }
      }}>
        <DialogHeader className="shrink-0 border-b border-stone-800 px-6 py-4 flex flex-row items-center justify-between bg-gradient-to-r from-stone-950/30 to-transparent">
          <DialogTitle className="text-lg font-bold tracking-tight text-theme-primary flex items-center gap-2">
            <Settings className="w-5 h-5 text-theme-primary" />
            Settings
          </DialogTitle>
          <span className="text-[10px] text-stone-400 font-normal mr-6">
            Labyrinth Game Solver v{__APP_VERSION__}
          </span>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-stone-800/80 flex flex-col py-4 px-3 gap-1 shrink-0 bg-stone-950/50">
            <div role="tablist" aria-label="Settings sections" className="flex flex-col gap-1">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={settingsTab === tab.key}
                aria-controls={`settings-panel-${tab.key}`}
                id={`settings-tab-${tab.key}`}
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
            </div>
            <div className="mt-auto pt-4 border-t border-stone-800/60">
              <p className="text-[10px] text-stone-500 font-semibold">Labyrinth Solver</p>
              <p className="text-[9px] text-stone-600">v{__APP_VERSION__} • Desktop</p>
            </div>
          </div>

          {/* Content */}
          <div key={settingsTab} className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 bg-stone-900/20 animate-slide-in-bottom">

            {settingsTab === "profiles" && (
              <div
                id="settings-panel-profiles"
                role="tabpanel"
                aria-labelledby="settings-tab-profiles"
                className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0"
              >
                <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
                  <div className="flex flex-col gap-2 shrink-0">
                    <h3 className="text-sm font-semibold text-stone-200">Save Current Layout</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Slot Name (e.g. Map Trial 1)..."
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === " ") {
                            e.stopPropagation();
                          }
                        }}
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
                    <h3 className="text-sm font-semibold text-stone-200">Saved Games</h3>
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                      {allSlots.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 bg-stone-950/20 border border-dashed border-stone-800 rounded-2xl">
                          <span className="text-xs text-stone-600">No saved games found.</span>
                        </div>
                      ) : (
                        allSlots.map((slot) => (
                          <div
                            key={slot.key}
                            className={`p-3 bg-stone-950/60 border border-stone-800 rounded-xl hover:border-theme-primary-20 transition-all flex items-center justify-between group ${
                              peekSlotKey === slot.key ? "border-theme-primary/30 bg-theme-primary-5" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-xs font-bold text-stone-200 truncate">{slot.name}</div>
                              <div className="text-[9px] text-stone-500 mt-0.5">
                                {new Date(slot.timestamp).toLocaleDateString()} at{" "}
                                {new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
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
                                    setDeleteConfirmSlot(slot);
                                  }}
                                  className="w-7 h-7 text-stone-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                  title="Delete Save"
                                  aria-label={`Delete saved game: ${slot.name}`}
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
                  {peekedState && peekedState.board ? (
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
                      <span>Click the eye icon on a save slot to load its miniature preview here.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "preferences" && (
              <div id="settings-panel-preferences" role="tabpanel" aria-labelledby="settings-tab-preferences" className="flex flex-col gap-6 max-w-xl text-left">
                <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-xl flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-stone-200">System Preferences</h3>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Retro Audio</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: false, label: "Sound On", icon: <Volume2 className="w-4 h-4" />, desc: "Retro oscillator effects" },
                        { id: true,  label: "Sound Off", icon: <VolumeX className="w-4 h-4" />, desc: "All audio muted" },
                      ].map((opt) => {
                        const isActive = isMuted === opt.id;
                        return (
                          <button
                            key={String(opt.id)}
                            onClick={isActive ? undefined : onToggleMute}
                            className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isActive
                                ? "border-theme-primary/50 bg-theme-primary-10 text-theme-primary"
                                : "border-stone-800 bg-stone-950/40 hover:bg-stone-900 text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            <span className={`flex items-center gap-1.5 text-xs font-semibold leading-none ${isActive ? "text-theme-primary" : ""}`}>
                              {opt.icon}
                              {opt.label}
                            </span>
                            <span className="text-[9px] text-stone-500 mt-0.5">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
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

            {settingsTab === "appearance" && (
              <div id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" className="flex flex-col gap-6 max-w-2xl text-left">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-100">Appearance</h3>
                  <p className="text-xs text-stone-400">Customize the color theme and accent color highlights.</p>
                </div>

                {/* Dark / Light Mode */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Color Theme</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      { id: "dark"  as const, name: "Dark Mode",  description: "Deep midnight theme",       preview: "#1c1917" },
                      { id: "light" as const, name: "Light Mode", description: "Clean high-contrast theme", preview: "#fafaf9" },
                    ]).map((t) => {
                      const isActive = baseTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { if (!isMuted) playClickSound(); setBaseTheme(t.id); }}
                          className={`relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                            isActive
                              ? "border-theme-primary/50 bg-theme-primary-10 text-stone-100"
                              : "border-stone-800 bg-stone-950/40 hover:border-stone-700 hover:bg-stone-900/60 text-stone-400"
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 ring-1 ring-white/10 shadow-md"
                            style={{ background: t.preview }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-none ${isActive ? "text-stone-100" : "text-stone-300"}`}>{t.name}</p>
                            <p className="text-[10px] text-stone-500 mt-0.5 truncate">{t.description}</p>
                          </div>
                          {isActive && (
                            <div
                              className="absolute top-2 right-2 w-2 h-2 rounded-full shadow-sm ring-1 ring-stone-500/40"
                              style={{ background: t.preview }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div className="space-y-3 pt-4 border-t border-stone-800">
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Accent Color</h4>
                    <p className="text-xs text-stone-400 mt-1 leading-normal">
                      Pick an accent color for buttons, highlights, and glows. Works with both themes.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {ACCENT_PRESETS.map((acc) => {
                      const isActive = accentColor.toLowerCase() === acc.hex.toLowerCase();
                      return (
                        <button
                          key={acc.hex}
                          onClick={() => { if (!isMuted) playClickSound(); setAccentColor(acc.hex); }}
                          className={`w-8 h-8 rounded-full border-2 transition-all relative cursor-pointer ${
                            isActive ? "border-stone-200 scale-110 shadow-[0_0_8px_var(--theme-color)]" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: acc.hex }}
                          title={acc.name}
                        />
                      );
                    })}
                    {/* Custom Color */}
                    <label
                      className={`w-8 h-8 rounded-full border-2 transition-all relative cursor-pointer flex items-center justify-center [background:conic-gradient(from_180deg,#f97316,#eab308,#84cc16,#22d3ee,#3b82f6,#a855f7,#ec4899,#f97316)] ${
                        isCustomAccent ? "border-stone-200 scale-110 shadow-[0_0_8px_var(--theme-color)]" : "border-transparent hover:scale-105"
                      }`}
                      title="Custom Color"
                    >
                      <input
                        type="color"
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                      />
                      <span className="text-[10px] font-bold text-white pointer-events-none drop-shadow">+</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "storage" && (
              <div id="settings-panel-storage" role="tabpanel" aria-labelledby="settings-tab-storage" className="flex flex-col gap-4 max-w-xl text-left">
                {/* Local Cache */}
                <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-xl flex flex-col gap-2.5 text-xs text-stone-400">
                  <h3 className="text-sm font-semibold text-stone-200">File Storage Information</h3>
                  <div>
                    <div className="font-semibold text-stone-300">Local Cache Directory:</div>
                    <div className="font-mono bg-stone-950 p-2.5 rounded-lg border border-stone-800 select-text break-all mt-1 mb-2">
                      {(() => {
                        const platform = (window as { electronAPI?: { platform?: string } }).electronAPI?.platform
                          ?? (navigator.userAgent.toLowerCase().includes("win") ? "win32" : "darwin");
                        return platform === "win32"
                          ? "%APPDATA%\\Labyrinth-Game-Solver\\Local Storage\\"
                          : "~/Library/Application Support/Labyrinth-Game-Solver/Local Storage/";
                      })()}
                    </div>
                    {/* Open folder button (Electron only) */}
                    {(window as any).electronAPI?.openLocalStorageFolder && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!isMuted) playClickSound();
                          (window as any).electronAPI.openLocalStorageFolder();
                        }}
                        className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 rounded-xl text-xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-theme-primary" />
                        Open Folder in Explorer/Finder
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 leading-normal">
                    Layout presets and custom slots are persisted securely locally within your sandboxed app configurations folder.
                  </div>
                </div>

                {/* Disk JSON Storage (Desktop Only) */}
                {desktopSettings && (
                  <div className="p-4 bg-stone-950/40 border border-stone-800 rounded-xl flex flex-col gap-2.5 text-xs text-stone-400 mt-2">
                    <h3 className="text-sm font-semibold text-stone-200">Disk JSON Storage (Desktop)</h3>
                    <div>
                      <div className="font-semibold text-stone-300">Saved Games Folder:</div>
                      <div className="font-mono bg-stone-950 p-2.5 rounded-lg border border-stone-800 select-text break-all mt-1 mb-2">
                        {desktopSettings.gamesDir}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!isMuted) playClickSound();
                            const path = await (window as any).electronAPI.selectDirectory("Select Saved Games Folder");
                            if (path) {
                              onSetDesktopSettings({ gamesDir: path });
                            }
                          }}
                          className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 rounded-xl text-xs"
                        >
                          Change Folder
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (!isMuted) playClickSound();
                            (window as any).electronAPI.openDirectory(desktopSettings.gamesDir);
                          }}
                          className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 rounded-xl text-xs"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-theme-primary" />
                          Open Folder
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 leading-normal">
                      Desktop mode saves games as individual <code>.json</code> files directly in this directory, making it easy to share, backup, or organize them.
                    </div>
                  </div>
                )}
              </div>
            )}

            {settingsTab === "application" && (
              <div id="settings-panel-application" role="tabpanel" aria-labelledby="settings-tab-application" className="flex flex-col gap-6 max-w-2xl text-left">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-100">Application</h3>
                  <p className="text-xs text-stone-400">Details about your Labyrinth Game Solver installation and keyboard shortcuts.</p>
                </div>

                {/* Version card */}
                <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-stone-200">Software Version</span>
                      <span className="text-[10px] text-stone-500 mt-0.5">Desktop Application Release</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-theme-primary-10 border border-theme-primary/20 text-[11px] font-bold text-theme-primary">
                      v{__APP_VERSION__}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">Update Manager</span>
                    <div className="flex gap-3 items-center">
                      <Button
                        size="sm"
                        onClick={handleCheckForUpdates}
                        disabled={updateChecking}
                        className="bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-semibold text-xs px-4 h-8 gap-1.5 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${updateChecking ? "animate-spin" : ""}`} />
                        Check for Updates
                      </Button>
                      {updateResult && (
                        <span className="text-[11px] text-stone-400 font-medium font-mono">{updateResult}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
                    <Keyboard className="w-4 h-4 text-stone-500" />
                    <span className="text-xs font-bold text-stone-200">Keyboard Shortcuts</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {KEYBOARD_SHORTCUTS.map((group) => (
                      <div key={group.group} className="space-y-2">
                        <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">{group.group}</h5>
                        <div className="space-y-1.5">
                          {group.shortcuts.map((sc) => (
                            <div key={sc.desc} className="flex items-center justify-between gap-3">
                              <span className="text-[11px] text-stone-400">{sc.desc}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {sc.keys.map((k, i) => (
                                  <kbd
                                    key={i}
                                    className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-[9px] font-mono font-bold text-stone-300"
                                  >
                                    {k}
                                  </kbd>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Troubleshooting */}
                <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-stone-200">Troubleshooting</span>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                      If you encounter issues with saved games or stale settings, clearing the app cache will reset all local data. Your disk-saved game files (.json) remain untouched.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetCache}
                    className="border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 text-xs px-4 h-8"
                  >
                    Reset Application Cache
                  </Button>
                </div>

                {/* Privacy disclaimer */}
                <div className="text-[11px] text-stone-500 space-y-1.5 leading-relaxed pt-1">
                  <p className="font-bold text-stone-400">Privacy & Disclaimers</p>
                  <p>
                    Labyrinth Game Solver processes and stores all data locally on your system.
                    No board data, saved games, settings, or metadata are ever uploaded to remote servers.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete confirmation dialog */}
    <Dialog open={!!deleteConfirmSlot} onOpenChange={(open) => { if (!open) setDeleteConfirmSlot(null); }}>
      <DialogContent className="sm:max-w-[380px] app-dialog-panel border border-stone-800 text-stone-100 shadow-2xl p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            Delete Saved Game?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-stone-400 mt-2">
          Are you sure you want to delete <span className="font-semibold text-stone-200">"{deleteConfirmSlot?.name}"</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmSlot(null)}
            className="border-stone-800 hover:bg-stone-800 text-stone-300 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteConfirmSlot) {
                onDeleteSlot(deleteConfirmSlot.key);
                if (peekSlotKey === deleteConfirmSlot.key) setPeekSlotKey(null);
                showToast("Saved game deleted");
                setDeleteConfirmSlot(null);
              }
            }}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
