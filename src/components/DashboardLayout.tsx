"use client";

import { useDropzone } from "react-dropzone";
import { useCallback, useState, useEffect } from "react";
import { 
    Upload, 
    X, 
    File as FileIcon, 
    Loader2, 
    CheckCircle2, 
    LayoutGrid, 
    Star, 
    Clock, 
    Settings, 
    ChevronRight, 
    LogOut,
    ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { RENDER_BACKEND_URL, SOCKET_URL } from "@/lib/constants";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { io } from "socket.io-client";

interface UploadingFile {
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
}

export function DashboardLayout({ 
    children, 
    spaceId = null,
    folderId = null,
    userId,
    userName = "User",
    userEmail = ""
}: { 
    children: React.ReactNode, 
    spaceId?: string | null,
    folderId?: string | null,
    userId: string,
    userName?: string,
    userEmail?: string
}) {
    const [uploads, setUploads] = useState<UploadingFile[]>([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFilter = searchParams.get('filter') || 'all';

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        
        const handleRefresh = (data?: any) => {
            // If we have a spaceId in data, only refresh if we are in that space
            // Otherwise refresh anyway (like for dashboard updates)
            if (!data || !data.spaceId || data.spaceId === spaceId || spaceId === 'all') {
                router.refresh();
            }
        };

        socket.on('file_uploaded', handleRefresh);
        socket.on('folder_created', handleRefresh);
        socket.on('item_deleted', handleRefresh);
        socket.on('item_renamed', handleRefresh);
        socket.on('item_updated', handleRefresh);
        socket.on('space_created', handleRefresh);
        socket.on('space_deleted', handleRefresh);

        return () => { socket.disconnect(); };
    }, [spaceId, router]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!spaceId) {
            toast.error("Veuillez entrer dans un espace pour uploader des fichiers.");
            return;
        }

        const newUploads = acceptedFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            progress: 0,
            status: 'uploading' as const
        }));

        setUploads(prev => [...prev, ...newUploads]);

        for (let i = 0; i < acceptedFiles.length; i++) {
            const file = acceptedFiles[i];
            const currentUpload = newUploads[i];

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
                    setUploads(prev => prev.map(u => u.id === currentUpload.id ? { ...u, status: 'completed', progress: 100 } : u));
                    toast.success(`${file.name} uploadé !`);
                } else {
                    throw new Error();
                }
            } catch (err) {
                setUploads(prev => prev.map(u => u.id === currentUpload.id ? { ...u, status: 'error' } : u));
                toast.error(`Erreur pour ${file.name}`);
            }
        }
    }, [spaceId, userId, folderId]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop,
        noClick: true,
        noKeyboard: true
    });

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    return (
        <div {...getRootProps()} className="min-h-screen bg-[#0A0A0B] text-white selection:bg-violet-500/30 selection:text-white font-sans relative flex overflow-hidden">
            <input {...getInputProps()} />
            
            {/* Background Animations */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Sidebar */}
            <aside className="w-72 bg-[#0D0D0F]/80 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-20 hidden lg:flex">
                <div className="p-8">
                    <Link href="/main" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black font-outfit tracking-tighter uppercase whitespace-nowrap">SwiftDrop <span className="text-violet-400">v2</span></span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-4 mb-4">Menu Principal</p>
                    
                    {[
                        { icon: LayoutGrid, label: 'Dashboard', href: '/main' },
                        { icon: Star, label: 'Favoris', href: '/main?filter=favorites' },
                        { icon: Clock, label: 'Récents', href: '/main?filter=recents' },
                    ].map((item, i) => {
                        const isActive = (item.label === 'Dashboard' && currentFilter === 'all') || 
                                         (item.label === 'Favoris' && currentFilter === 'favorites') || 
                                         (item.label === 'Récents' && currentFilter === 'recents');
                        return (
                            <Link 
                                key={i} 
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${isActive ? 'bg-white/5 text-violet-400 border border-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:text-violet-400 transition-colors'}`} />
                                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 group">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 font-black text-xs uppercase border border-violet-500/20 group-hover:scale-110 transition-transform">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate uppercase tracking-tighter">{userName}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{userEmail || 'Premium User'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Global Header */}
                <header className="h-20 lg:h-24 px-4 lg:px-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-[#0A0A0B]/50 backdrop-blur-md">
                    <div className="flex items-center gap-4 lg:hidden">
                         <Link href="/main" className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Upload className="w-4 h-4 text-white" />
                         </Link>
                    </div>

                    <div className="hidden md:flex items-center gap-1 overflow-hidden ml-4 lg:ml-0">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-50">SwiftDrop</p>
                         <ChevronRight className="w-3 h-3 text-slate-800" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Dashboard</p>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <div className="relative">
                            <button 
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all group"
                            >
                                 <div className="w-8 h-8 rounded-xl bg-violet-400 flex items-center justify-center font-black text-[10px] text-black">
                                    {initials.substring(0, 1)}
                                 </div>
                                 <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{userName}</span>
                                 <ChevronDown className={`w-4 h-4 text-slate-600 group-hover:text-white transition-all ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* User Dropdown */}
                            <AnimatePresence>
                                {showUserMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute right-0 top-14 w-56 bg-[#111113] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <div className="p-4 border-b border-white/5">
                                            <p className="text-xs font-bold text-white">{userName}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
                                        </div>
                                        <div className="p-2">
                                            <button 
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all text-xs font-bold w-full"
                                            >
                                                <LogOut className="w-4 h-4" /> Se déconnecter
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-12 pb-20">
                        {children}
                    </div>
                </main>
            </div>

            {/* Drag Overlay */}
            <AnimatePresence>
                {isDragActive && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-violet-600/10 backdrop-blur-md flex items-center justify-center p-12 border-4 border-dashed border-violet-500/40 m-6 rounded-[3rem] pointer-events-none"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 animate-bounce">
                                <Upload className="w-12 h-12" />
                            </div>
                            <h2 className="text-4xl font-black font-outfit uppercase tracking-tighter text-white drop-shadow-2xl">Lâchez pour uploader</h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Queue */}
            <div className="fixed bottom-8 right-8 z-[90] flex flex-col gap-3 w-80">
                <AnimatePresence>
                    {uploads.map((upload) => (
                        <motion.div 
                            key={upload.id}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                upload.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                upload.status === 'error' ? 'bg-red-500/10 text-red-400' :
                                'bg-violet-500/10 text-violet-400'
                            }`}>
                                {upload.status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                                 upload.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                                 <X className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate pr-4">{upload.name}</p>
                                <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                    <motion.div 
                                        className={`h-full ${upload.status === 'error' ? 'bg-red-500' : 'bg-violet-500'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${upload.progress}%` }}
                                    />
                                </div>
                            </div>
                            {upload.status !== 'uploading' && (
                                <button 
                                    onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))}
                                    className="p-1 hover:bg-white/5 rounded-md"
                                >
                                    <X className="w-3 h-3 text-slate-500" />
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Click outside to close user menu */}
            {showUserMenu && (
                <div 
                    className="fixed inset-0 z-[9]" 
                    onClick={() => setShowUserMenu(false)} 
                />
            )}
        </div>
    );
}
