"use client";

import { useState } from "react";
import { Plus, X, Folder, LayoutGrid, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { RENDER_BACKEND_URL } from "@/lib/constants";
import { useRouter } from "next/navigation";

export function CreateModal({ 
    type, 
    userId, 
    spaceId, 
    folderId,
    isOpen, 
    onClose 
}: { 
    type: "space" | "folder", 
    userId: string,
    spaceId?: string,
    folderId?: string | null,
    isOpen: boolean, 
    onClose: () => void 
}) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = type === "space" ? `${RENDER_BACKEND_URL}/api/spaces` : `${RENDER_BACKEND_URL}/api/folders`;
        const body = type === "space" 
            ? { name, ownerId: userId } 
            : { name, spaceId, parentId: folderId, ownerId: userId };

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                toast.success(`${type === 'space' ? 'Espace' : 'Dossier'} créé avec succès !`);
                onClose();
                setName("");
                router.refresh();
            } else {
                toast.error("Une erreur est survenue");
            }
        } catch (error) {
            toast.error("Impossible de joindre le serveur");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pb-20 md:pb-6">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-white/60 backdrop-blur-xl"
                />
                
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="w-full max-w-md bg-white border border-[#E5E5E5] rounded-[2.5rem] p-10 relative z-10 shadow-2xl shadow-black/5"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] flex items-center justify-center text-black">
                                {type === "space" ? <LayoutGrid className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                            </div>
                            <h2 className="text-2xl font-serif italic tracking-tight">Nouveau {type === "space" ? "Espace" : "Dossier"}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors">
                            <X className="w-5 h-5 text-[#999999]" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[#999999] uppercase tracking-widest ml-1">Nom du {type === "space" ? "Projet" : "Dossier"}</label>
                            <input 
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={type === "space" ? "Mon Espace Perso" : "Mes Documents"}
                                className="w-full bg-[#F9F9F9] border border-[#F0F0F0] rounded-2xl py-5 px-6 text-black placeholder:text-[#CCCCCC] focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                                required
                            />
                        </div>

                        <button 
                            disabled={loading}
                            className="w-full bg-black text-white font-bold py-5 rounded-full hover:scale-[1.02] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 shadow-lg shadow-black/10"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer l'élément"}
                            {!loading && <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
