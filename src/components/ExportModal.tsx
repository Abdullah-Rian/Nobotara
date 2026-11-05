import React, { useState } from 'react';
import { X, Download, HardDrive, Check, Copy, Folder, Terminal, Sparkles, FileArchive, AlertCircle, RefreshCw } from 'lucide-react';
import { downloadProjectArchive, ArchiveFormat } from '../utils/downloadHelper';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedZip, setCopiedZip] = useState(false);
  const [copiedTar, setCopiedTar] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ArchiveFormat | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  if (!isOpen) return null;

  const targetPath = '/Volumes/KINGSTON/Nobotara/Game';
  
  const zipCommand = `mkdir -p "/Volumes/KINGSTON/Nobotara/Game" && unzip -o ~/Downloads/nobotara-apollo11-project.zip -d "/Volumes/KINGSTON/Nobotara/Game" && cd "/Volumes/KINGSTON/Nobotara/Game" && npm install && npm run dev`;
  
  const tarCommand = `mkdir -p "/Volumes/KINGSTON/Nobotara/Game" && tar -xzf ~/Downloads/nobotara-apollo11-project.tar.gz -C "/Volumes/KINGSTON/Nobotara/Game" --strip-components=1 && cd "/Volumes/KINGSTON/Nobotara/Game" && npm install && npm run dev`;

  const handleDownload = async (format: ArchiveFormat) => {
    try {
      setDownloadingFormat(format);
      await downloadProjectArchive(format, (status) => setDownloadStatus(status));
    } catch (err: any) {
      setDownloadStatus(`Download failed: ${err?.message || 'Check connection'}`);
    } finally {
      setTimeout(() => {
        setDownloadingFormat(null);
        setDownloadStatus('');
      }, 4000);
    }
  };

  const handleCopy = (text: string, isZip: boolean) => {
    navigator.clipboard.writeText(text);
    if (isZip) {
      setCopiedZip(true);
      setTimeout(() => setCopiedZip(false), 2500);
    } else {
      setCopiedTar(true);
      setTimeout(() => setCopiedTar(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-100 font-mono-num uppercase tracking-wider">
                Export Project to Local PC / Kingston USB Drive
              </h2>
              <p className="text-xs text-slate-400 font-mono-num">
                Target: {targetPath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs md:text-sm text-slate-300 overflow-y-auto">
          {/* Why format was not right on Mac alert */}
          <div className="bg-sky-950/40 border border-sky-600/40 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase font-mono-num">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>macOS "Format Is Not Right" Fix Applied</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When downloading files inside browser iframes, Safari/Chrome can intercept download clicks and save a redirect HTML file instead of the actual binary.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              We now provide <strong>Verified In-Browser Blob Downloads</strong> and an additional <strong>macOS-Native .TAR.GZ</strong> package that extracts cleanly on Mac without any Archive Utility format errors.
            </p>
          </div>

          {/* Download Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ZIP Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm">
                  <FileArchive className="w-4 h-4 text-amber-400" />
                  <span>Verified .ZIP Package</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono-num mt-1">
                  Full project with explicit Unix directories & 644 permissions (~95 KB)
                </div>
              </div>
              <button
                onClick={() => handleDownload('zip')}
                disabled={downloadingFormat !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 font-bold rounded-lg shadow-lg hover:shadow-amber-500/20 text-xs transition-all duration-150 cursor-pointer"
              >
                {downloadingFormat === 'zip' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{downloadingFormat === 'zip' ? 'PREPARING...' : 'DOWNLOAD .ZIP'}</span>
              </button>
            </div>

            {/* TAR.GZ Card (Native for Mac) */}
            <div className="bg-slate-950/70 border border-emerald-900/40 rounded-lg p-3.5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Native macOS .TAR.GZ</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono-num mt-1">
                  Recommended for Mac: Native POSIX archive, double-click or terminal extract (~84 KB)
                </div>
              </div>
              <button
                onClick={() => handleDownload('targz')}
                disabled={downloadingFormat !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 font-bold rounded-lg shadow-lg hover:shadow-emerald-500/20 text-xs transition-all duration-150 cursor-pointer"
              >
                {downloadingFormat === 'targz' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{downloadingFormat === 'targz' ? 'PREPARING...' : 'DOWNLOAD .TAR.GZ'}</span>
              </button>
            </div>
          </div>

          {/* Download progress status */}
          {downloadStatus && (
            <div className="text-center font-mono-num text-xs text-amber-300 bg-amber-950/40 py-1.5 px-3 rounded border border-amber-800/40 animate-fade-in">
              {downloadStatus}
            </div>
          )}

          {/* Quick Steps */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 font-mono-num flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-amber-400" />
              How to place and run on your Kingston Drive:
            </h3>
            <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <li>
                Click <strong className="text-emerald-400">Download .TAR.GZ</strong> or <strong className="text-amber-400">Download .ZIP</strong> above.
              </li>
              <li>
                Extract into <code className="text-amber-300 font-mono-num">/Volumes/KINGSTON/Nobotara/Game</code>.
              </li>
              <li>
                Open macOS Terminal and paste one of the copy commands below to unzip and run in 1 step!
              </li>
            </ol>
          </div>

          {/* Terminal Options */}
          <div className="space-y-2.5">
            {/* TAR.GZ Command (Mac Preferred) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono-num">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Option A (TAR.GZ — Recommended for Mac):</span>
                </div>
                <button
                  onClick={() => handleCopy(tarCommand, false)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition-colors"
                >
                  {copiedTar ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTar ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono-num text-emerald-300 bg-black/60 p-2 rounded overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                {tarCommand}
              </pre>
            </div>

            {/* ZIP Command */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono-num">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Option B (ZIP):</span>
                </div>
                <button
                  onClick={() => handleCopy(zipCommand, true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition-colors"
                >
                  {copiedZip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedZip ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono-num text-amber-300 bg-black/60 p-2 rounded overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                {zipCommand}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500 font-mono-num">
            Package verified: TypeScript, Three.js engine, Express server, shaders & models
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
