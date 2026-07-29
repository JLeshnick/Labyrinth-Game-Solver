import fs from 'fs';

let content = fs.readFileSync('src/components/panels/SolverPanel.tsx', 'utf-8');

// Update SolverPanelProps
content = content.replace(
  /customTargetCoords: \{\s+r: number;\s+c: number;\s+\} \| null;/,
  `customTargetCoords: {\n    r: number;\n    c: number;\n  } | null;\n  showEmptyTiles?: boolean;\n  setShowEmptyTiles?: (val: boolean) => void;`
);

// Add to props destructuring
content = content.replace(
  /grid = \[\],\s+}\: SolverPanelProps\) \{/,
  `grid = [],\n  showEmptyTiles = false,\n  setShowEmptyTiles,\n}: SolverPanelProps) {`
);

// Add the button
content = content.replace(
  /\{showAllSuggestions \? "Show Top 5" \: \`Show All \(\$\{filteredSolutions\.length\}\)\`\}/,
  `{showAllSuggestions ? "Show Top 5" : \`Show All (\${filteredSolutions.length})\`}`
);

// Insert the button before the "Ranked by:" text
content = content.replace(
  /<div className="text-\[10px\] text-stone-550 px-1 mb-1 italic flex items-center justify-between flex-wrap gap-2">/,
  `<div className="text-[10px] text-stone-550 px-1 mb-1 italic flex items-center justify-between flex-wrap gap-2">
                  {setShowEmptyTiles && (
                    <button
                      onClick={() => setShowEmptyTiles(!showEmptyTiles)}
                      className={\`px-2.5 py-1 rounded-lg border-2 border-stone-950 font-black shadow-[1.5px_1.5px_0_0_#000000] cursor-pointer text-[9px] uppercase tracking-wide leading-none transition-transform hover:-translate-y-0.5 \${showEmptyTiles ? "bg-emerald-400 text-stone-950" : "bg-card text-stone-400 hover:text-stone-200"}\`}
                    >
                      {showEmptyTiles ? "Hide Empty Tiles" : "Show Empty Tiles"}
                    </button>
                  )}`
);


fs.writeFileSync('src/components/panels/SolverPanel.tsx', content);
