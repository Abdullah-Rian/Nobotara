# Graph Report - NobotaraGame  (2026-11-09)

## Corpus Check
- 47 files · ~40,371 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .glb 7, (none) 5, .zip 2)

## Summary
- 506 nodes · 1071 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `529742b7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ApolloThreeEngine
- voyager/data.ts
- App
- VoyagerEngine
- MarsEngine
- package.json
- render-voiceovers.mjs
- App.tsx
- ApolloAudioSystem
- graphify
- compilerOptions
- VoyagerHUD.tsx
- apolloModels.ts
- server.ts
- dependencies
- GameInputManager
- vite
- scripts
- manifest.json

## God Nodes (most connected - your core abstractions)
1. `ApolloThreeEngine` - 68 edges
2. `VoyagerEngine` - 50 edges
3. `MarsEngine` - 35 edges
4. `App()` - 33 edges
5. `react` - 26 edges
6. `ApolloAudioSystem` - 22 edges
7. `DisplayControls()` - 17 edges
8. `compilerOptions` - 16 edges
9. `lucide-react` - 15 edges
10. `DialogueMessage` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `ArchivePuzzle()`  [EXTRACTED]
  src/App.tsx → src/components/ArchivePuzzle.tsx
- `App()` --calls--> `HUD()`  [EXTRACTED]
  src/App.tsx → src/components/HUD.tsx
- `App()` --calls--> `InspectionModal()`  [EXTRACTED]
  src/App.tsx → src/components/InspectionModal.tsx
- `App()` --calls--> `MarsHUD()`  [EXTRACTED]
  src/App.tsx → src/components/MarsHUD.tsx
- `App()` --calls--> `OutroScreen()`  [EXTRACTED]
  src/App.tsx → src/components/OutroScreen.tsx

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "ApolloThreeEngine"
Cohesion: 0.06
Nodes (4): RoverRig, ReplaceableModelType, ApolloThreeEngine, createMarkerBeamTexture()

### Community 1 - "voyager/data.ts"
Cohesion: 0.05
Nodes (44): ArchivePuzzle(), ArchivePuzzleProps, AxisPad(), AxisPadProps, blip(), OBJECTIVES, VoyagerHUD(), VoyagerHUDProps (+36 more)

### Community 2 - "App"
Cohesion: 0.11
Nodes (35): apolloAudio, DialoguePanel(), HUD(), HUDProps, InspectionModal(), InspectionModalProps, PlaqueCallout(), PlaqueScreenPoint (+27 more)

### Community 4 - "MarsEngine"
Cohesion: 0.12
Nodes (3): MarsEngine, marsHeight(), MarsSiteId

### Community 5 - "package.json"
Cohesion: 0.11
Nodes (25): devDependencies, autoprefixer@^10.4.21, esbuild@^0.25.0, tailwindcss@^4.3.3, tsx@^4.21.0, @types/express@^4.17.21, @types/node@^22.14.0, @types/react@^19.3.0 (+17 more)

### Community 6 - "render-voiceovers.mjs"
Cohesion: 0.10
Nodes (17): ai, audioToWav(), clips, ensureFfmpeg(), ffmpeg, ffmpegPath(), manifest, manifestPath (+9 more)

### Community 7 - "App.tsx"
Cohesion: 0.06
Nodes (51): App(), EMPTY_MARS_TELEMETRY, EMPTY_VOYAGER_TELEMETRY, CuriousCard(), CuriousCardProps, EvidenceBoard(), EvidenceBoardProps, LegacyChoice() (+43 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 11 - "VoyagerHUD.tsx"
Cohesion: 0.11
Nodes (30): lucide-react, react, DisplayControls(), DisplayControlsProps, MarsHUD(), MarsHUDProps, MarsMap(), MarsTarget (+22 more)

### Community 12 - "apolloModels.ts"
Cohesion: 0.27
Nodes (5): three@^0.187.0, three, buildApolloSceneModels(), SceneModels, createGoldFoilTexture()

### Community 13 - "server.ts"
Cohesion: 0.17
Nodes (8): express@^4.21.2, express, app, audioCache, __dirname, __filename, hostArgIndex, portArgIndex

### Community 14 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, dotenv@^17.2.3, @google/genai@^2.32.0, lucide-react@^0.546.0, motion@^12.23.24, react@^19.0.1, react-dom@^19.0.1, dotenv (+3 more)

### Community 17 - "vite"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 18 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, start

### Community 19 - "manifest.json"
Cohesion: 0.33
Nodes (5): clips, description, name, targetPath, version

## Knowledge Gaps
- **1 isolated node(s):** `/Users/ferdouse/.local/bin/graphify-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 133 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApolloThreeEngine` connect `ApolloThreeEngine` to `App`, `apolloModels.ts`, `App.tsx`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `.beginIntro()` and `.setLive()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `/Users/ferdouse/.local/bin/graphify-mcp` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `ApolloThreeEngine` be split into smaller, more focused modules?**
  _Cohesion score 0.06448412698412699 - nodes in this community are weakly interconnected._
- **Why does `VoyagerEngine` connect `VoyagerEngine` to `voyager/data.ts`, `App.tsx`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Should `voyager/data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Why does `react` connect `VoyagerHUD.tsx` to `voyager/data.ts`, `App`, `package.json`, `App.tsx`, `dependencies`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._