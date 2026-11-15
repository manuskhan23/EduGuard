import React, { useRef, useState } from 'react';
import { Sun, Moon, Monitor, Upload, FileText, Eye, X } from 'lucide-react';
import { ThemeMode, useTheme } from '../../context/ThemeContext';

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();
  const options: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'LIGHT', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'DARK', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'SYSTEM', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      role="group"
      aria-label="Theme mode"
      className="inline-flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setMode(opt.value)}
          title={`${opt.label} Mode`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
            mode === opt.value
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {opt.icon}
          {!compact && <span>{opt.label}</span>}
        </button>
      ))}
    </div>
  );
}

export interface UploadedDocItem {
  documentType?: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  fileUrl: string;
  previewText?: string;
}

export function FileUploadField({
  label,
  documentType,
  onUploaded,
}: {
  label: string;
  documentType?: string;
  onUploaded: (doc: UploadedDocItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      let previewText = '';
      if (file.type === 'text/plain' || file.type === 'text/csv') {
        previewText = (await file.text()).slice(0, 3000);
      }
      onUploaded({
        documentType: documentType || label,
        title: `${label} (${file.name})`,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        fileUrl: data.fileUrl,
        previewText,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? 'Uploading...' : `Upload ${label}`}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: UploadedDocItem | null;
  onClose: () => void;
}) {
  if (!doc) return null;
  const isImage = doc.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(doc.fileUrl);
  const isPdf = doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.fileUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {doc.documentType || 'Document'} · {doc.fileName} · {doc.mimeType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-auto bg-slate-50 dark:bg-slate-950">
          {doc.previewText ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800">
              {doc.previewText}
            </pre>
          ) : isImage ? (
            <img
              src={doc.fileUrl}
              alt={doc.title}
              referrerPolicy="no-referrer"
              className="max-h-[65vh] mx-auto rounded border border-slate-200 dark:border-slate-800 object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={doc.fileUrl}
              title={doc.title}
              className="w-full h-[65vh] rounded border border-slate-200 dark:border-slate-800 bg-white"
            />
          ) : (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Inline preview not available for this binary format.</p>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-md bg-blue-700 text-white hover:bg-blue-800"
              >
                <Eye className="w-3.5 h-3.5" />
                Open File in Viewer
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
