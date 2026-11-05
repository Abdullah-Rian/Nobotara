import React, { useState, useRef } from 'react';
import { X, Upload, RotateCcw, CheckCircle, Box, AlertCircle, FileCode, Download } from 'lucide-react';
import { ReplaceableModelType, customModelManager } from '../game/modelLoader';
import { ApolloThreeEngine } from '../game/threeEngine';
import { downloadProjectArchive } from '../utils/downloadHelper';

interface ModelReplacementModalProps {
  engine: ApolloThreeEngine | null;
  onClose: () => void;
}

interface ModelSlotInfo {
  type: ReplaceableModelType;
  label: string;
  defaultFilename: string;
  description: string;
}

const MODEL_SLOTS: ModelSlotInfo[] = [
  {
    type: 'rover',
    label: 'Lunar Explorer Rover',
    defaultFilename: 'public/models/rover.glb',
    description: 'Player vehicle. Name wheel meshes with "wheel" or "tire" (e.g. Wheel_FL, Wheel_FR) for auto-rolling.'
  },
  {
    type: 'descent_stage',
    label: "Eagle Descent Stage",
    defaultFilename: 'public/models/descent_stage.glb',
    description: 'Apollo 11 lunar module base with 4 landing legs, ladder, and descent engine bell.'
  },
  {
    type: 'retroreflector',
    label: 'Laser Retroreflector (LRRR)',
    defaultFilename: 'public/models/retroreflector.glb',
    description: '100-prism corner cube pallet tilted towards Earth in the lunar sky.'
  },
  {
    type: 'voyager',
    label: 'Voyager 1 Interstellar Probe',
    defaultFilename: 'public/models/voyager.glb',
    description: 'Phase 4 outro subject featuring the Golden Record, dish antenna, and magnetometer boom.'
  }
];

export const ModelReplacementModal: React.FC<ModelReplacementModalProps> = ({ engine, onClose }) => {
  const [loadingType, setLoadingType] = useState<ReplaceableModelType | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCustom, setActiveCustom] = useState<Partial<Record<ReplaceableModelType, boolean>>>(
    engine?.getCustomActiveModels() ?? {}
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSlotRef = useRef<ReplaceableModelType | null>(null);

  const handlePickFile = (type: ReplaceableModelType) => {
    currentSlotRef.current = type;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slot = currentSlotRef.current;
    if (!file || !slot || !engine) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setStatusMessage({ type: 'error', text: 'Please select a glTF 2.0 binary file (.glb or .gltf)' });
      return;
    }

    setLoadingType(slot);
    setStatusMessage(null);

    try {
      const result = await customModelManager.loadFromFile(file, slot);
      engine.replaceModel(slot, result.scene, result.wheels);

      setActiveCustom(prev => ({ ...prev, [slot]: true }));
      const wheelMsg = result.wheels ? ` (${result.wheels.length} animated wheels detected)` : '';
      setStatusMessage({
        type: 'success',
        text: `Successfully loaded Blender model for ${slot.replace('_', ' ')}${wheelMsg}!`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown load error';
      setStatusMessage({ type: 'error', text: `Failed to load ${file.name}: ${msg}` });
    } finally {
      setLoadingType(null);
    }
  };

  const handleReset = (type: ReplaceableModelType) => {
    if (!engine) return;
    engine.resetModel(type);
    setActiveCustom(prev => ({ ...prev, [type]: false }));
    setStatusMessage({
      type: 'success',
      text: `Reset ${type.replace('_', ' ')} back to procedural default.`
    });
  };

  return (
    <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4 md:p-8 z-40 pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 z-10">
          <div className="flex items-center gap-3">
            <Box className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-100">
                Custom 3D Models (Blender Integration)
              </h2>
              <p className="text-xs text-slate-400 font-mono-num">
                IMPORT .GLB / .GLTF ASSETS DIRECTLY INTO THE 3D GAME
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-700/60 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Model Replacement Slots */}
          <div className="space-y-3">
            <div className="text-xs font-mono-num text-slate-400 font-semibold uppercase">
              REPLACEABLE GAME 3D ASSETS
            </div>
            {MODEL_SLOTS.map(slot => {
              const isCustom = activeCustom[slot.type];
              const isLoading = loadingType === slot.type;

              return (
                <div
                  key={slot.type}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-200">{slot.label}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono-num ${
                          isCustom
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCustom ? 'CUSTOM BLENDER MODEL ACTIVE' : 'PROCEDURAL DEFAULT'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                      {slot.description}
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono-num">
                      Permanent path: <span className="text-slate-300">{slot.defaultFilename}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePickFile(slot.type)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'LOADING...' : 'UPLOAD .GLB'}</span>
                    </button>
                    {isCustom && (
                      <button
                        onClick={() => handleReset(slot.type)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                        title="Reset to default procedural 3D model"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RESET</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blender Export Guidelines */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono-num">
              <FileCode className="w-4 h-4" />
              <span>HOW TO EXPORT FROM BLENDER</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-300">Format:</strong> File &gt; Export &gt; <strong className="text-slate-200">glTF 2.0 (.glb)</strong> with embedded textures.
              </li>
              <li>
                <strong className="text-slate-300">Orientation:</strong> Use standard Blender export transform (<strong className="text-slate-200">+Y Up</strong>).
              </li>
              <li>
                <strong className="text-slate-300">Origin / Pivot:</strong> Place the object origin at the bottom-center of the model so it sits flush on lunar regolith.
              </li>
              <li>
                <strong className="text-slate-300">Rover Wheels:</strong> Name your wheel meshes with the word <strong className="text-amber-300 font-mono-num">wheel</strong> or <strong className="text-amber-300 font-mono-num">tire</strong> (e.g. <code className="text-slate-200">Wheel_FL</code>, <code className="text-slate-200">Wheel_FR</code>, <code className="text-slate-200">Wheel_RL</code>, <code className="text-slate-200">Wheel_RR</code>). The game engine automatically binds them and rolls them in sync with rover driving speed!
              </li>
              <li>
                <strong className="text-slate-300">Permanent Replacement:</strong> Place your exported files in the repository under <code className="text-amber-300">public/models/rover.glb</code>, <code className="text-amber-300">public/models/descent_stage.glb</code>, etc. The game will automatically load them on startup!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => downloadProjectArchive('zip')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            title="Download full project zip for offline editing & Blender models"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD PROJECT (.ZIP)</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
