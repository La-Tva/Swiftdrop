"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File as FileIcon } from "lucide-react";
import { toast } from "sonner";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setIsDragging(false);
    toast.success(`${acceptedFiles.length} fichiers ajoutés à la file d'attente`);
    // Here we will eventually trigger the upload to Render
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Omnipresent means it doesn't block other clicks unless dragging
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  return (
    <div {...getRootProps()} className="min-h-screen premium-gradient relative overflow-hidden">
      <input {...getInputProps()} />
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      {/* Main Content */}
      <main className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">
        {children}
      </main>

      {/* Omnipresent Dropzone Overlay */}
      <AnimatePresence>
        {(isDragging || isDragActive) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl aspect-video border-2 border-dashed border-violet-500/50 rounded-3xl glass flex flex-col items-center justify-center gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                <Upload className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h2 className="text-3xl font-bold gradient-text">Relâchez pour partager</h2>
                <p className="text-slate-400 mt-2">SwiftDrop envoie vos fichiers instantanément vers vos espaces.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress / Queue Toast (Simplified for now) */}
      {files.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-80 glass rounded-2xl p-4 shadow-2xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileIcon className="w-4 h-4 text-violet-400" />
              Envoi en cours ({files.length})
            </h4>
            <button onClick={() => setFiles([])} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/5">
                <span className="truncate pr-4">{f.name}</span>
                <span className="text-violet-400 font-medium">85%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
