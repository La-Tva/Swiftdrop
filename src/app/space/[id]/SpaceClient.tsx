"use client";
 
import { useState, useRef } from "react";
import { Folder, File, ArrowLeft, Trash2, Plus, Download, Star, Upload, Edit3, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateModal } from "@/components/CreateModal";
import { RENDER_BACKEND_URL } from "@/lib/constants";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function SpaceClient({ 
    userId, 
    spaceId, 
    folderId,
    name, 
    folders, 
    files 
}: { 
    userId: string, 
    spaceId: string, 
    folderId: string | null,
    name: string, 
    folders: any[], 
    files: any[] 
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFolderClick = (id: string) => {
        router.push(`/space/${spaceId}?folderId=${id}`);
    };

    const handleFileClick = (file: any) => {
        setSelectedFile(file);
    };

    const handleToggleFavorite = async (id: string, type: 'file' | 'folder') => {
        try {
            await fetch(`${RENDER_BACKEND_URL}/api/favorites/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type })
            });
            router.refresh();
        } catch (err) {
            toast.error("Erreur lors de la mise en favori");
        }
    };

    const handleDelete = async (id: string, type: 'file' | 'folder') => {
        if (!confirm("Supprimer cet élément ?")) return;
        try {
            await fetch(`${RENDER_BACKEND_URL}/api/items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type })
            });
            router.refresh();
            toast.success("Supprimé");
        } catch (err) {
            toast.error("Erreur de suppression");
        }
    };

    const handleRename = async (id: string, type: 'file' | 'folder', oldName: string) => {
        const newName = prompt("Nouveau nom :", oldName);
        if (!newName || newName === oldName) return;
        try {
            await fetch(`${RENDER_BACKEND_URL}/api/items/rename`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type, newName })
            });
            router.refresh();
        } catch (err) {
            toast.error("Erreur de renommage");
        }
    };

    const handleDownload = (fileId: string) => {
        // Use full URL to ensure it works across domains/ports
        const url = `${RENDER_BACKEND_URL}/api/download/${fileId}`;
        window.open(url, '_blank');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        let successCount = 0;
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const formData = new FormData();
            formData.append('spaceId', spaceId);
            formData.append('ownerId', userId);
            formData.append('folderId', folderId || 'null');
            formData.append('file', file);

            try {
                const res = await fetch(`${RENDER_BACKEND_URL}/api/upload`, {
                    method: 'POST',
                    body: formData,
                });
                if (res.ok) {
                    toast.success(`${file.name} uploadé !`);
                    successCount++;
                } else {
                    toast.error(`Erreur pour ${file.name}`);
                }
            } catch (err) {
                toast.error(`Erreur pour ${file.name}`);
            }
        }
        setUploading(false);
        if (successCount > 0) {
            router.refresh();
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Hidden file input */}
            <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleFileUpload}
            />

            {/* Header Navigation */}
            <nav className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link href="/main" className="p-2 shrink-0 glass rounded-xl text-slate-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold font-outfit uppercase tracking-tight truncate">{name}</h1>
                        <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest mt-0.5">
                            {folders.length + files.length} éléments
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-1 max-w-md mx-8 hidden md:flex">
                    <div className="relative w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Rechercher dans cet espace..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-violet-500 hover:bg-violet-400 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? "..." : "Uploader"}
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 glass glass-hover rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-violet-400 border border-white/5"
                    >
                        <Plus className="w-4 h-4" /> Dossier
                    </button>
                </div>
            </nav>

            {/* Space Explorer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Folders */}
                {folders
                  .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((folder) => (
                    <div 
                        key={folder._id.toString()} 
                        onClick={() => handleFolderClick(folder._id)}
                        className="glass glass-hover p-4 rounded-2xl flex items-center gap-4 group cursor-pointer border border-white/5 relative"
                    >
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                            <Folder className={`w-5 h-5 ${folder.isFavorite ? 'fill-violet-400' : 'fill-violet-400/20'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold truncate group-hover:text-white transition-colors">{folder.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Dossier</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(folder._id, 'folder'); }}
                                className={`p-1 ${folder.isFavorite ? 'text-amber-400' : 'text-slate-500'} hover:text-amber-400 transition-colors`}
                            >
                                <Star className={`w-3.5 h-3.5 ${folder.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleRename(folder._id, 'folder', folder.name); }}
                                className="p-1 text-slate-500 hover:text-white transition-colors"
                                title="Renommer"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(folder._id, 'folder'); }}
                                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                title="Supprimer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Files */}
                {files
                  .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((file) => (
                    <div 
                        key={file._id.toString()} 
                        onClick={() => handleFileClick(file)}
                        className="glass glass-hover p-4 rounded-2xl flex flex-col gap-4 group relative border border-white/5 cursor-pointer"
                    >
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-violet-400 transition-colors">
                                <File className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(file._id, 'file'); }}
                                    className={`p-1.5 ${file.isFavorite ? 'text-amber-400' : 'text-slate-500'} hover:text-amber-400 transition-colors`}
                                    title="Favori"
                                >
                                    <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-current' : ''}`} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDownload(file._id); }}
                                    className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors"
                                    title="Télécharger"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRename(file._id, 'file', file.name); }}
                                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                                    title="Renommer"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(file._id, 'file'); }}
                                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold truncate group-hover:text-white transition-colors">{file.name}</h3>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black opacity-60">
                                {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.type?.split('/')[1] || 'FILE'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {folders.length === 0 && files.length === 0 && (
                <div className="glass rounded-[2.5rem] p-20 flex flex-col items-center justify-center gap-4 text-center border border-white/5">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-800">
                        <Folder className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white/90">Cet espace est vide</h2>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                            Utilisez le bouton &quot;Uploader&quot; pour ajouter des fichiers ou créez un dossier.
                        </p>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-5 py-3 bg-violet-500 hover:bg-violet-400 rounded-2xl text-sm font-bold text-white transition-all"
                        >
                            <Upload className="w-4 h-4" /> Uploader un fichier
                        </button>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 glass glass-hover rounded-2xl text-sm font-bold text-violet-400 border border-white/10"
                        >
                            <Plus className="w-4 h-4" /> Nouveau Dossier
                        </button>
                    </div>
                </div>
            )}

            <CreateModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                type="folder" 
                userId={userId} 
                spaceId={spaceId} 
                folderId={folderId}
            />

            {/* Preview Modal */}
            <AnimatePresence>
                {selectedFile && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0A0B]/90 backdrop-blur-xl"
                        onClick={() => setSelectedFile(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111113] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                                        <File className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white tracking-tight">{selectedFile.name}</h3>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => handleDownload(selectedFile._id)}
                                        className="p-3 text-slate-400 hover:text-white transition-colors glass rounded-xl"
                                        title="Télécharger"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedFile(null)}
                                        className="p-3 text-slate-400 hover:text-red-400 transition-colors glass rounded-xl"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden">
                                {selectedFile.type.startsWith('image/') ? (
                                    <img 
                                        src={`${RENDER_BACKEND_URL}/api/file/${selectedFile._id}`} 
                                        alt={selectedFile.name}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : selectedFile.type === 'application/pdf' ? (
                                    <iframe 
                                        src={`${RENDER_BACKEND_URL}/api/file/${selectedFile._id}`} 
                                        className="w-full h-full border-none"
                                    />
                                ) : selectedFile.type.startsWith('video/') ? (
                                    <video 
                                        src={`${RENDER_BACKEND_URL}/api/file/${selectedFile._id}`} 
                                        controls 
                                        className="max-w-full max-h-full"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-4 py-20 px-10 text-center">
                                        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-700">
                                            <File className="w-12 h-12" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg">Aperçu non disponible</p>
                                            <p className="text-slate-500 text-sm mt-1 mb-8">Ce type de fichier ne peut pas être lu directement ici.</p>
                                            <button 
                                                onClick={() => handleDownload(selectedFile._id)}
                                                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold flex items-center gap-3 transition-all"
                                            >
                                                <Download className="w-5 h-5" /> Télécharger pour voir
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
