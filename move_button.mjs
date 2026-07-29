import fs from 'fs';

let content = fs.readFileSync('src/components/panels/SolverPanel.tsx', 'utf-8');

// Remove the button from its current location
content = content.replace(
  /\{setShowEmptyTiles && \(\s+<button\s+onClick=\{\(\) => setShowEmptyTiles\(!showEmptyTiles\)\}\s+className=\{\`px-2\.5 py-1 rounded-lg border-2 border-stone-950 font-black shadow-\[1\.5px_1\.5px_0_0_#000000\] cursor-pointer text-\[9px\] uppercase tracking-wide leading-none transition-transform hover:-translate-y-0\.5 \$\{showEmptyTiles \? "bg-emerald-400 text-stone-950" : "bg-card text-stone-400 hover:text-stone-200"\}\`\}\s+>\s+\{showEmptyTiles \? "Hide Empty Tiles" : "Show Empty Tiles"\}\s+<\/button>\s+\)\}/,
  ''
);

// Add it next to the 1-move targets button
content = content.replace(
  /<button\s+onClick=\{onToggleOneMoveTargets\}\s+className=\{\`text-\[10px\] md:text-xs px-2 py-1 min-h-9 neo-brutalism-button rounded-lg cursor-pointer font-semibold \$\{/,
  `{setShowEmptyTiles && (
            <button
              onClick={() => setShowEmptyTiles(!showEmptyTiles)}
              className={\`text-[10px] md:text-xs px-2 py-1 min-h-9 neo-brutalism-button rounded-lg cursor-pointer font-semibold \${
                showEmptyTiles
                  ? "bg-emerald-400 border-stone-950 text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                  : "border-stone-950 bg-card text-stone-400 hover:text-stone-200"
              }\`}
              title="Show all navigable tiles in 1 turn (even empty ones)"
            >
              Empty Tiles
            </button>
          )}
          <button
            onClick={onToggleOneMoveTargets}
            className={\`text-[10px] md:text-xs px-2 py-1 min-h-9 neo-brutalism-button rounded-lg cursor-pointer font-semibold \${`
);

fs.writeFileSync('src/components/panels/SolverPanel.tsx', content);
