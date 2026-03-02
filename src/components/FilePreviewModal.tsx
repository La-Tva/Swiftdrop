"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { FileJSON } from "@/types/models";
import { Download, X, FileText, Film, Image as ImageIcon } from "lucide-react";

interface FilePreviewModalProps {
  file: FileJSON | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isPdf = file.type === "application/pdf";

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-full glass border-white/10 p-0 overflow-hidden rounded-[2.5rem]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              {isImage ? <ImageIcon className="w-4 h-4" /> : isVideo ? <Film className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <p className="text-sm font-semibold text-white truncate max-w-md">{file.name}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={file.url}
              download={file.name}
              className="px-4 py-2 glass glass-hover rounded-xl text-xs font-bold text-slate-300 flex items-center gap-2 transition-all"
            >
              <Download className="w-3 h-3" /> Download
            </a>
            <button
              onClick={onClose}
              className="p-2 glass glass-hover rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex items-center justify-center bg-black/60 min-h-[50vh] max-h-[75vh] p-8">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={file.url} 
              alt={file.name} 
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-white/5" 
            />
          )}
          {isVideo && (
            <video src={file.url} controls className="max-w-full max-h-[70vh] rounded-xl shadow-2xl border border-white/5" />
          )}
          {isPdf && (
            <iframe src={file.url} className="w-full h-[70vh] rounded-xl" title={file.name} />
          )}
          {!isImage && !isVideo && !isPdf && (
            <div className="flex flex-col items-center gap-6 text-slate-500 py-12">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
                <FileText className="w-10 h-10 opacity-20" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white mb-2">No preview available</p>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">This file type cannot be previewed directly in the browser. Please download it to view the content.</p>
              </div>
              <a
                href={file.url}
                download={file.name}
                className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-violet-600/20 flex items-center gap-2"
              >
                <Download className="w-5 h-5" /> Download File
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
