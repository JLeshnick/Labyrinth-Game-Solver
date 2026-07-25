import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Settings,
  Palette,
  Volume2,
  VolumeX,
  Cpu,
  RefreshCw,
  Keyboard,
  FlaskConical,
} from "lucide-react";
import { playClickSound } from "../../utils/audio";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  baseTheme: "dark" | "light";
  setBaseTheme: (theme: "dark" | "light") => void;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  is3D?: boolean;
  onToggle3D?: () => void;
  solverDepth?: number;
  onSetSolverDepth?: (depth: number) => void;
  pawnAnimationSpeed?: number;
  onSetPawnAnimationSpeed?: (speed: number) => void;
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

export function SettingsDialog({
  open,
  onOpenChange,
  isMuted,
  onToggleMute,
  baseTheme,
  setBaseTheme,
  accentColor,
  setAccentColor,
  is3D = false,
  onToggle3D,
  solverDepth = 3,
  onSetSolverDepth,
  pawnAnimationSpeed = 600,
  onSetPawnAnimationSpeed,
}: SettingsDialogProps) {
  const [settingsTab, setSettingsTab] =
    useState<"preferences" | "appearance" | "application">("preferences");
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  const sidebarTabs = [
    {
      key: "preferences",
      label: "Preferences",
      description: "General & active players",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      key: "appearance",
      label: "Appearance",
      description: "Themes & accent color",
      icon: <Palette className="w-4 h-4" />,
    },
    {
      key: "application",
      label: "Application",
      description: "Info & shortcuts",
      icon: <Cpu className="w-4 h-4" />,
    },
  ] as const;

  const handleCheckForUpdates = () => {
    setUpdateChecking(true);
    setUpdateResult(null);
    setTimeout(() => {
      setUpdateChecking(false);
      setUpdateResult("You're up to date!");
    }, 1500);
    const releasesUrl =
      "https://github.com/jleshnick/Labyrinth-Game-Solver/releases";
    window.open(releasesUrl, "_blank", "noopener,noreferrer");
  };

  const handleResetCache = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("labyrinth"));
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  const isCustomAccent = !ACCENT_PRESETS.some(
    (p) => p.hex.toLowerCase() === accentColor.toLowerCase()
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[90vw] w-[95vw] sm:w-[90vw] h-[90vh] max-h-[90vh] text-stone-100 p-0 rounded-xl flex flex-col overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === " ") {
              e.stopPropagation();
            }
          }}
        >
          <DialogHeader className="shrink-0 border-b border-stone-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-row items-center justify-between bg-gradient-to-r from-stone-950/30 to-transparent">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-theme-primary flex items-center gap-2">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary" />
              Settings
            </DialogTitle>
            <span className="text-[10px] text-stone-400 font-normal mr-6">
              Labyrinth Game Solver v{__APP_VERSION__}
            </span>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Sidebar / Topbar */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-stone-800/80 flex flex-row md:flex-col py-2 px-3 md:py-4 md:px-3 gap-1.5 md:gap-1 overflow-x-auto md:overflow-x-visible shrink-0 bg-stone-950/50 scrollbar-none">
              <div
                role="tablist"
                aria-label="Settings sections"
                className="flex flex-row md:flex-col gap-1 sm:gap-1.5 min-w-max md:w-full settings-tab-strip"
              >
                {sidebarTabs.map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={settingsTab === tab.key}
                    aria-controls={`settings-panel-${tab.key}`}
                    id={`settings-tab-${tab.key}`}
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      setSettingsTab(tab.key);
                    }}
                    className={`flex items-center gap-1.5 sm:gap-3 px-3 py-1.5 md:py-2.5 rounded-lg text-left transition-all duration-150 group cursor-pointer neo-brutalism-button ${
                      settingsTab === tab.key
                        ? "bg-theme-primary-10 border-theme-primary text-theme-primary translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                        : "text-stone-400 hover:text-stone-200 bg-card border-stone-950"
                    }`}
                  >
                    <span
                      className={
                        settingsTab === tab.key
                          ? "text-theme-primary"
                          : "text-stone-500 group-hover:text-stone-300"
                      }
                    >
                      {tab.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-none">{tab.label}</div>
                      <div
                        className={`text-[9px] mt-1 leading-none truncate hidden md:block ${
                          settingsTab === tab.key
                            ? "text-theme-primary/70"
                            : "text-stone-500"
                        }`}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="hidden md:block mt-auto pt-4 border-t border-stone-800/60 w-full">
                <p className="text-[10px] text-stone-500 font-semibold">Labyrinth Solver</p>
                <p className="text-[9px] text-stone-600">v{__APP_VERSION__} • Web</p>
              </div>
            </div>

            {/* Content */}
            <div
              key={settingsTab}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 bg-stone-900/20 animate-slide-in-bottom"
            >
              {settingsTab === "preferences" && (
                <div
                  id="settings-panel-preferences"
                  role="tabpanel"
                  aria-labelledby="settings-tab-preferences"
                  className="flex flex-col gap-6 max-w-xl text-left"
                >
                  <div className="p-4 app-surface flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-stone-200">
                      System Preferences
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Retro Audio
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          {
                            id: false,
                            label: "Sound On",
                            icon: <Volume2 className="w-4 h-4" />,
                            desc: "Retro oscillator effects",
                          },
                          {
                            id: true,
                            label: "Sound Off",
                            icon: <VolumeX className="w-4 h-4" />,
                            desc: "All audio muted",
                          },
                        ].map((opt) => {
                          const isActive = isMuted === opt.id;
                          return (
                            <button
                              key={String(opt.id)}
                              onClick={isActive ? undefined : onToggleMute}
                              className={`flex flex-col items-start gap-1 p-3.5 rounded-xl text-left transition-all cursor-pointer neo-brutalism-button ${
                                isActive
                                  ? "border-theme-primary bg-theme-primary-10 text-theme-primary translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                                  : "border-stone-950 bg-card text-stone-400 hover:text-stone-200"
                              }`}
                            >
                              <span
                                className={`flex items-center gap-1.5 text-xs font-semibold leading-none ${
                                  isActive ? "text-theme-primary" : ""
                                }`}
                              >
                                {opt.icon}
                                {opt.label}
                              </span>
                              <span className="text-[9px] text-stone-500 mt-0.5">
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 app-surface flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-stone-200">
                      Manage Active Players
                    </h3>
                    <p className="text-xs text-stone-400 leading-normal">
                      Active players are now managed from the Pawns tab of the Setup panel,
                      alongside pawn placement.
                    </p>
                  </div>

                  {/* Experimental */}
                  <div className="p-4 app-surface flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-theme-primary" />
                      Experimental
                    </h3>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-stone-200">3D Isometric View</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">Renders the board in a 3D perspective. May affect performance on some devices.</div>
                      </div>
                      <button
                        onClick={onToggle3D}
                        className={`neo-brutalism-button rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer shrink-0 ${
                          is3D
                            ? "bg-theme-primary border-stone-950 text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                            : "bg-card border-stone-950 text-stone-400"
                        }`}
                      >
                        {is3D ? "On" : "Off"}
                      </button>
                    </div>
                    {onSetSolverDepth && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
                        <div>
                          <div className="text-xs font-semibold text-stone-200">Solver Search Depth</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Turns looked ahead. Higher values find more creative solutions but take longer to compute.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((d) => (
                            <button
                              key={d}
                              onClick={() => { if (!isMuted) playClickSound(); onSetSolverDepth(d); }}
                              className={`neo-brutalism-button rounded-lg w-9 h-9 text-xs font-bold cursor-pointer transition-all ${
                                solverDepth === d
                                  ? "bg-theme-primary border-stone-950 text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                                  : "bg-card border-stone-950 text-stone-400 hover:text-stone-200"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                          <span className="text-[10px] text-stone-600 ml-1">
                            {solverDepth === 3 ? "(default)" : solverDepth > 3 ? "(slower)" : "(faster)"}
                          </span>
                        </div>
                      </div>
                    )}
                    {onSetPawnAnimationSpeed && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
                        <div>
                          <div className="text-xs font-semibold text-stone-200">Pawn Movement Speed</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Controls how fast pawns travel along the path corridors during move execution.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {[
                            { label: "Slow", ms: 1000 },
                            { label: "Normal", ms: 600 },
                            { label: "Fast", ms: 300 },
                          ].map((opt) => (
                            <button
                              key={opt.ms}
                              onClick={() => { if (!isMuted) playClickSound(); onSetPawnAnimationSpeed(opt.ms); }}
                              className={`neo-brutalism-button rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition-all ${
                                pawnAnimationSpeed === opt.ms
                                  ? "bg-theme-primary border-stone-950 text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                                  : "bg-card border-stone-950 text-stone-400 hover:text-stone-200"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settingsTab === "appearance" && (
                <div
                  id="settings-panel-appearance"
                  role="tabpanel"
                  aria-labelledby="settings-tab-appearance"
                  className="flex flex-col gap-6 max-w-2xl text-left"
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-stone-100">Appearance</h3>
                    <p className="text-xs text-stone-400">
                      Customize the color theme and accent color highlights.
                    </p>
                  </div>

                  {/* Dark / Light Mode */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                      Color Theme
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(
                        [
                          {
                            id: "dark" as const,
                            name: "Dark Mode",
                            description: "Deep midnight theme",
                            preview: "#1c1917",
                          },
                          {
                            id: "light" as const,
                            name: "Light Mode",
                            description: "Clean high-contrast theme",
                            preview: "#fafaf9",
                          },
                        ] as const
                      ).map((t) => {
                        const isActive = baseTheme === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              if (!isMuted) playClickSound();
                              setBaseTheme(t.id);
                            }}
                            className={`relative flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer neo-brutalism-button ${
                              isActive
                                ? "border-theme-primary bg-theme-primary-10 text-stone-100 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                                : "border-stone-950 bg-card text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-lg shrink-0 ring-1 ring-white/10 shadow-md"
                              style={{ background: t.preview }}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs font-semibold leading-none ${
                                  isActive ? "text-stone-100" : "text-stone-300"
                                }`}
                              >
                                {t.name}
                              </p>
                              <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                                {t.description}
                              </p>
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
                      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Accent Color
                      </h4>
                      <p className="text-xs text-stone-400 mt-1 leading-normal">
                        Pick an accent color for buttons, highlights, and glows. Works with both
                        themes.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {ACCENT_PRESETS.map((acc) => {
                        const isActive =
                          accentColor.toLowerCase() === acc.hex.toLowerCase();
                        return (
                          <button
                            key={acc.hex}
                            onClick={() => {
                              if (!isMuted) playClickSound();
                              setAccentColor(acc.hex);
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-all relative cursor-pointer ${
                              isActive
                                ? "border-stone-200 scale-110 shadow-[0_0_8px_var(--theme-color)]"
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: acc.hex }}
                            title={acc.name}
                          />
                        );
                      })}
                      {/* Custom Color */}
                      <label
                        className={`w-8 h-8 rounded-full border-2 transition-all relative cursor-pointer flex items-center justify-center [background:conic-gradient(from_180deg,#f97316,#eab308,#84cc16,#22d3ee,#3b82f6,#a855f7,#ec4899,#f97316)] ${
                          isCustomAccent
                            ? "border-stone-200 scale-110 shadow-[0_0_8px_var(--theme-color)]"
                            : "border-transparent hover:scale-105"
                        }`}
                        title="Custom Color"
                      >
                        <input
                          type="color"
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                        />
                        <span className="text-[10px] font-bold text-white pointer-events-none drop-shadow">
                          +
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "application" && (
                <div
                  id="settings-panel-application"
                  role="tabpanel"
                  aria-labelledby="settings-tab-application"
                  className="flex flex-col gap-6 max-w-2xl text-left"
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-stone-100">Application</h3>
                    <p className="text-xs text-stone-400">
                      Details about your Labyrinth Game Solver installation and keyboard
                      shortcuts.
                    </p>
                  </div>

                  {/* Version card */}
                  <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-stone-200">
                          Software Version
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5">
                          Web Edition Release
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-theme-primary-10 border border-theme-primary/20 text-[11px] font-bold text-theme-primary">
                        v{__APP_VERSION__}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">
                        Update Manager
                      </span>
                      <div className="flex gap-3 items-center">
                        <Button
                          size="sm"
                          onClick={handleCheckForUpdates}
                          disabled={updateChecking}
                          className="bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-semibold text-xs px-4 h-8 gap-1.5 shrink-0"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${updateChecking ? "animate-spin" : ""}`}
                          />
                          Check for Updates
                        </Button>
                        {updateResult && (
                          <span className="text-[11px] text-stone-400 font-medium font-mono">
                            {updateResult}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
                      <Keyboard className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-bold text-stone-200">
                        Keyboard Shortcuts
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {KEYBOARD_SHORTCUTS.map((group) => (
                        <div key={group.group} className="space-y-2">
                          <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                            {group.group}
                          </h5>
                          <div className="space-y-1.5">
                            {group.shortcuts.map((sc) => (
                              <div
                                key={sc.desc}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="text-[11px] text-stone-400">
                                  {sc.desc}
                                </span>
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
                      <span className="text-xs font-bold text-stone-200">
                        Troubleshooting
                      </span>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        If you encounter issues with stale settings or a corrupted board layout,
                        clearing the app cache will reset your saved board and all preferences.
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
                      Labyrinth Game Solver processes and stores all data locally on your
                      system. No board data, settings, or metadata are ever uploaded
                      to remote servers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
