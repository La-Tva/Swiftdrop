"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { 
    Upload, 
    X, 
    Loader2, 
    CheckCircle2, 
    LayoutGrid, 
    Star, 
    Clock, 
    Users,
    ChevronRight, 
    LogOut,
    ChevronDown,
    HardDrive,
    FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { RENDER_BACKEND_URL, SOCKET_URL } from "@/lib/constants";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSWRConfig } from "swr";
import { io } from "socket.io-client";
import { LivingLogo, PulseIndicator, InteractiveIconWrapper } from "@/components/Animations";

interface UploadingFile {
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Recursively collect all File entries from a FileSystemDirectoryEntry */
async function collectFilesFromEntry(
    entry: FileSystemEntry,
    pathPrefix = ""
): Promise<{ file: File; relativePath: string }[]> {
    if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
        );
        return [{ file, relativePath: pathPrefix + entry.name }];
    }

    if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const allEntries: FileSystemEntry[] = [];

        // createReader may paginate — read until done
        await new Promise<void>((resolve) => {
            const readBatch = () =>
                reader.readEntries((batch) => {
                    if (batch.length === 0) return resolve();
                    allEntries.push(...batch);
                    readBatch();
                });
            readBatch();
        });

        const results: { file: File; relativePath: string }[] = [];
        for (const child of allEntries) {
            const childResults = await collectFilesFromEntry(
                child,
                pathPrefix + entry.name + "/"
            );
            results.push(...childResults);
        }
        return results;
    }

    return [];
}

/** Ensure all intermediate folders exist on the server, return leaf folderId */
async function ensureFolderPath(
    pathSegments: string[],   // e.g. ["MyFolder", "SubFolder"]
    spaceId: string,
    userId: string,
    rootFolderId: string | null
): Promise<string | null> {
    let parentId = rootFolderId;
    for (const segment of pathSegments) {
        const res = await fetch(`${RENDER_BACKEND_URL}/api/folders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: segment,
                spaceId,
                parentId: parentId || "null",
                ownerId: userId,
                isUploaded: true
            }),
        });
        const data = await res.json();
        parentId = data.id;
    }
    return parentId;
}

// ─────────────────────────────────────────────────────────────────────────────

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
    const [isDragActive, setIsDragActive] = useState(false);
    const [storageUsed, setStorageUsed] = useState(0);
    const dropRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { mutate } = useSWRConfig();
    const currentFilter = searchParams.get('filter') || 'all';

    // ── Storage fetch ─────────────────────────────────────────────────────────
    const fetchStorage = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${RENDER_BACKEND_URL}/api/storage/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setStorageUsed(data.totalBytes || 0);
            }
        } catch (_) {}
    }, [userId]);

    useEffect(() => { fetchStorage(); }, [fetchStorage]);

    // ── Socket.io refresh ─────────────────────────────────────────────────────
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        
        const handleRefresh = (data?: any) => {
            if (!data || !data.spaceId || data.spaceId === spaceId || spaceId === 'all') {
                router.refresh();
                mutate(
                    (key: any) => typeof key === 'string' && (key.startsWith('/api/dashboard') || key.startsWith('/api/spaces')),
                    undefined,
                    { revalidate: true }
                );
            }
        };

        socket.on('file_uploaded', (data) => { handleRefresh(data); fetchStorage(); });
        socket.on('folder_created', handleRefresh);
        socket.on('item_deleted', (data) => { handleRefresh(data); fetchStorage(); });
        socket.on('item_renamed', handleRefresh);
        socket.on('item_updated', handleRefresh);
        socket.on('space_created', handleRefresh);
        socket.on('space_deleted', handleRefresh);

        return () => { socket.disconnect(); };
    }, [spaceId, router, fetchStorage]);

    // ── Core upload function ──────────────────────────────────────────────────
    const uploadFileWithPath = useCallback(async (
        file: File,
        targetFolderId: string | null,
        uploadId: string
    ) => {
        const formData = new FormData();
        formData.append('spaceId', spaceId!);
        formData.append('ownerId', userId);
        formData.append('folderId', targetFolderId || 'null');
        formData.append('file', file);

        try {
            const res = await fetch(`${RENDER_BACKEND_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'completed', progress: 100 } : u));
                toast.success(`${file.name} uploadé !`);
            } else {
                throw new Error();
            }
        } catch (_) {
            setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error' } : u));
            toast.error(`Erreur pour ${file.name}`);
        }
    }, [spaceId, userId]);

    // ── Process dropped items (files + folders) ───────────────────────────────
    const processDroppedItems = useCallback(async (dataTransfer: DataTransfer) => {
        if (!spaceId) {
            toast.error("Veuillez entrer dans un espace pour uploader des fichiers.");
            return;
        }

        const items = Array.from(dataTransfer.items);
        const allFileEntries: { file: File; relativePath: string }[] = [];

        for (const item of items) {
            if (item.kind !== 'file') continue;
            const entry = item.webkitGetAsEntry?.();
            if (!entry) continue;
            const collected = await collectFilesFromEntry(entry);
            allFileEntries.push(...collected);
        }

        if (allFileEntries.length === 0) return;

        // Register all in the upload queue first
        const newUploads = allFileEntries.map(({ file, relativePath }) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: relativePath,
            progress: 0,
            status: 'uploading' as const,
        }));
        setUploads(prev => [...prev, ...newUploads]);

        // Cache for folder path → serverId to avoid duplicate folder creation
        const folderCache = new Map<string, string | null>();

        for (let i = 0; i < allFileEntries.length; i++) {
            const { file, relativePath } = allFileEntries[i];
            const uploadId = newUploads[i].id;

            // relativePath: "MyFolder/Sub/file.txt" → segments ["MyFolder", "Sub"]
            const parts = relativePath.split('/');
            const dirSegments = parts.slice(0, -1); // all except filename

            let targetFolderId = folderId;

            if (dirSegments.length > 0) {
                const cacheKey = dirSegments.join('/');
                if (folderCache.has(cacheKey)) {
                    targetFolderId = folderCache.get(cacheKey)!;
                } else {
                    const newId = await ensureFolderPath(dirSegments, spaceId, userId, folderId);
                    folderCache.set(cacheKey, newId);
                    targetFolderId = newId;
                }
            }

            await uploadFileWithPath(file, targetFolderId, uploadId);
        }

        await fetchStorage();
    }, [spaceId, folderId, userId, uploadFileWithPath, fetchStorage]);

    // ── Native drag handlers ──────────────────────────────────────────────────
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        // Only deactivate if leaving the whole container
        if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        await processDroppedItems(e.dataTransfer);
    }, [processDroppedItems]);

    const handleLogout = async () => {
        toast.success("Déconnexion réussie");
        await signOut({ callbackUrl: "/login" });
    };

    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    // Storage bar: soft cap at 1 GB for visual
    const SOFT_CAP = 1024 * 1024 * 1024;
    const storagePercent = Math.min((storageUsed / SOFT_CAP) * 100, 100);

    return (
        <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="h-[100dvh] w-full bg-transparent text-foreground selection:bg-orange-500/20 selection:text-white font-sans relative flex overflow-hidden lg:h-screen lg:min-h-screen"
        >
            {/* Ambient Glowing Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#F97316] rounded-bl-[100px] opacity-10 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[#EA580C] rounded-tr-[100px] opacity-10 blur-[100px]" />
            </div>

            {/* Sidebar */}
            <aside className="w-72 bg-[#0A0503]/40 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-20 hidden xl:flex">
                <div className="p-8">
                    <Link href="/main" className="flex items-center gap-3 group">
                        <LivingLogo />
                        <span className="text-xl font-serif italic tracking-tight lowercase text-white">swiftdrop <span className="text-orange-500 font-sans not-italic text-xs ml-1">v2</span></span>
                    </Link>
                </div>

                <nav className="flex-1 px-6 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                    {[
                        { icon: LayoutGrid, label: 'Mes Espaces', href: '/main', filter: 'all' },
                        { icon: Star, label: 'Favoris', href: '/main?filter=favorites', filter: 'favorites' },
                        { icon: Clock, label: 'Récents', href: '/main?filter=recents', filter: 'recents' },
                    ].map((item, i) => {
                        const isActive = currentFilter === item.filter;
                        return (
                            <Link 
                                key={i} 
                                href={item.href}
                                className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${isActive ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(249,115,22,0.1)] border border-white/10' : 'text-[#A0A0A0] hover:text-white hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <InteractiveIconWrapper>
                                        <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#666666] group-hover:text-white'}`} />
                                    </InteractiveIconWrapper>
                                    <span className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                                </div>
                                {isActive && <PulseIndicator />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Storage Indicator */}
                <div className="px-6 pb-2">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-orange-500 shrink-0" />
                            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest">Stockage</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-white">{formatBytes(storageUsed)}</span>
                                <span className="text-[10px] text-[#666666] font-bold">/{formatBytes(SOFT_CAP)}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${storagePercent}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 p-2 rounded-2xl group transition-all">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-serif italic text-sm border border-orange-500/30">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{userName}</p>
                            <p className="text-[10px] text-[#A0A0A0] font-medium truncate">{userEmail || 'Membre Premium'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0A0503]/80 backdrop-blur-2xl border-t border-white/5 z-[100] h-20 flex items-center justify-around xl:hidden px-6 pb-2">
                {[
                    { icon: LayoutGrid, href: '/main', filter: 'all' },
                    { icon: Star, href: '/main?filter=favorites', filter: 'favorites' },
                    { icon: Clock, href: '/main?filter=recents', filter: 'recents' },
                ].map((item, i) => {
                    const isActive = currentFilter === item.filter;
                    return (
                        <Link 
                            key={i} 
                            href={item.href}
                            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all relative ${isActive ? 'bg-orange-500/20 text-orange-500 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'text-[#666666]'}`}
                        >
                            <InteractiveIconWrapper>
                                <item.icon className={`w-5 h-5`} />
                            </InteractiveIconWrapper>
                            {isActive && (
                                <div className="absolute -top-1 right-0">
                                    <PulseIndicator />
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Global Header */}
                <header className="h-20 xl:h-24 px-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-[#0A0503]/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4 xl:hidden">
                         <Link href="/main">
                            <LivingLogo />
                         </Link>
                    </div>

                    <div className="hidden xl:flex items-center gap-2 ml-4 xl:ml-0">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-[#999999]">Applications</p>
                         <InteractiveIconWrapper><ChevronRight className="w-3 h-3 text-white/20" /></InteractiveIconWrapper>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-white">Explorateur</p>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <div className="relative">
                            <button 
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/10 hover:border-orange-500/50 hover:bg-white/5 transition-all group bg-transparent"
                            >
                                 <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center font-serif italic text-[10px] text-white">
                                    {initials.substring(0, 1)}
                                 </div>
                                 <span className="text-xs font-bold text-[#A0A0A0] group-hover:text-white transition-colors">{userName}</span>
                                 <InteractiveIconWrapper><ChevronDown className={`w-3 h-3 text-[#A0A0A0] group-hover:text-white transition-all ${showUserMenu ? 'rotate-180' : ''}`} /></InteractiveIconWrapper>
                            </button>

                            {/* User Dropdown */}
                            <AnimatePresence>
                                {showUserMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute right-0 top-12 w-56 bg-[#0A0503]/90 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)] overflow-hidden z-50 p-2"
                                    >
                                        <div className="px-4 py-3 border-b border-white/5 mb-2">
                                            <p className="text-xs font-bold text-white">{userName}</p>
                                            <p className="text-[10px] text-[#A0A0A0] truncate">{userEmail}</p>
                                        </div>
                                        <button 
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-[#A0A0A0] hover:text-red-400 transition-all text-xs font-bold w-full"
                                        >
                                            <InteractiveIconWrapper><LogOut className="w-4 h-4" /></InteractiveIconWrapper> Se déconnecter
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 xl:p-8">
                    <motion.div 
                        key={currentFilter}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="max-w-7xl mx-auto space-y-12 pb-20"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Drag Overlay */}
            <AnimatePresence>
                {isDragActive && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-orange-600/10 backdrop-blur-md flex items-center justify-center p-12 border-4 border-dashed border-orange-500/40 m-6 rounded-[3rem] pointer-events-none"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 animate-bounce">
                                <FolderOpen className="w-12 h-12" />
                            </div>
                            <h2 className="text-4xl font-black font-outfit uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]">Lâchez ici</h2>
                            <p className="text-orange-300/70 text-sm font-bold tracking-widest uppercase">Fichiers ou dossiers acceptés</p>
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
                                'bg-orange-500/10 text-orange-400'
                            }`}>
                                {upload.status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                                 upload.status === 'completed' ? <InteractiveIconWrapper><CheckCircle2 className="w-5 h-5" /></InteractiveIconWrapper> :
                                 <InteractiveIconWrapper><X className="w-5 h-5" /></InteractiveIconWrapper>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate pr-4">{upload.name}</p>
                                <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                    <motion.div 
                                        className={`h-full ${upload.status === 'error' ? 'bg-red-500' : 'bg-orange-500 shadow-[0_0_10px_#ea580c]'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${upload.progress}%` }}
                                    />
                                </div>
                            </div>
                            {upload.status !== 'uploading' && (
                                <button 
                                    onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                                >
                                    <InteractiveIconWrapper><X className="w-3 h-3 text-[#A0A0A0]" /></InteractiveIconWrapper>
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
