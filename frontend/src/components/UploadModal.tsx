import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ added: number; duplicates: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf')));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setResult(null);

    try {
      const res = await api.uploadStatements(selectedFiles);
      setResult({
        added: res.added,
        duplicates: res.duplicates,
        errors: res.errors || [],
      });
      if (res.success) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setResult({
        added: 0,
        duplicates: 0,
        errors: [err.message || 'Failed to process statement.'],
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Statement PDF</h3>
              <p className="text-xs text-slate-400">Google Pay statements are extracted locally</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-8 text-center hover:border-blue-500/50 hover:bg-slate-900/50 transition-all cursor-pointer relative"
        >
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">
            Click to browse or drag & drop PDF statements
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Google Pay transaction statements (multi-page supported)
          </p>
        </div>

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
            {selectedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Result message */}
        {result && (
          <div className="mt-4">
            {result.added > 0 || result.duplicates > 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Import Complete!</p>
                  <p className="text-emerald-400/80 mt-0.5">
                    Added <strong>{result.added}</strong> new transactions ({result.duplicates} duplicates ignored).
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No Transactions Extracted</p>
                  <p className="text-rose-400/80 mt-0.5">
                    {result.errors.length > 0
                      ? result.errors.join(' ')
                      : 'Please ensure this is a valid Google Pay statement PDF.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-all"
          >
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all disabled:opacity-40"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing PDF...</span>
              </>
            ) : (
              <span>Process & Save</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

