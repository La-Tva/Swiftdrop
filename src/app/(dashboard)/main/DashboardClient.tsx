"use client";

import { useState } from "react";
import { 
  Folder, 
  FileText, 
  Clock, 
  Users, 
  Search,
  ChevronRight,
  Plus,
  Trash2,
  Star
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CreateModal } from "@/components/CreateModal";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL, RENDER_BACKEND_URL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";

import { AnimatedEmptyState, FileCorner, FolderTab, InteractiveIconWrapper } from "@/components/Animations";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function DashboardClient({ 
    userId, 
    userSpaces: initialSpaces, 
    recentFiles: initialRecents,
    stats: initialStats,
    userName,
    initialFilter 
}: { 
    userId: string, 
    userSpaces: any[], 
    recentFiles: any[],
    stats: { spacesTotal: number, sharedTotal: number, favoritesTotal: number },
    userName: string,
    initialFilter?: "all" | "shared" | "favorites" | "recents"
}) {
  const { data, mutate } = useSWR('/api/dashboard', fetcher, {
      fallbackData: { userSpaces: initialSpaces, recentFiles: initialRecents, stats: initialStats },
      revalidateOnFocus: false,
  });

  const userSpaces: any[] = data?.userSpaces ?? initialSpaces;
  const recentFiles: any[] = data?.recentFiles ?? initialRecents;
  const stats: { spacesTotal: number, sharedTotal: number, favoritesTotal: number } = data?.stats ?? initialStats;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "shared" | "favorites" | "recents">(initialFilter || "all");
  const router = useRouter();

  useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter);
    }
  }, [initialFilter]);


  const handleDeleteSpace = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm("Supprimer cet espace et TOUS ses fichiers ?")) return;
      
      // Optimistic mutate
      mutate({ userSpaces: userSpaces.filter(s => s._id !== id), recentFiles, stats }, false);

      try {
          const res = await fetch(`${RENDER_BACKEND_URL}/api/items`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, type: 'space' })
          });
          if (res.ok) {
              toast.success("Espace supprimé");
              mutate(); // revalidate
          } else {
              mutate(); // revert on failure
          }
      } catch (err) {
          toast.error("Erreur de suppression");
          mutate(); // revert on failure
      }
  };

  const filteredSpaces = userSpaces.filter(space => {
      const matchesSearch = space.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterType === "all") return matchesSearch;
      if (filterType === "shared") return matchesSearch && (space.sharedWith?.includes(userId) || space.isGlobal);
      // For spaces, we don't have isFavorite yet in the schema usually, but let's assume it might exist or just show all for now
      return matchesSearch;
  });

  const filteredRecent = recentFiles.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterType === "favorites") return matchesSearch && file.isFavorite;
      return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-10">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl sm:text-6xl font-serif italic tracking-tight mb-2 text-white">
            Bonjour, {userName.split(' ')[0]}
          </h1>
          <p className="text-[#A0A0A0] text-sm font-medium">L'explorateur de fichiers nouvelle génération.</p>
        </div>
        
        <div className="relative group max-w-md w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0] group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0503]/50 backdrop-blur-md border border-white/5 hover:border-white/20 rounded-full py-4 pl-12 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/10 focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.1)] text-white placeholder-[#A0A0A0] transition-all font-medium"
          />
        </div>
      </header>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit flex items-center gap-2 text-white">
              <InteractiveIconWrapper><Folder className="w-5 h-5 text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" /></InteractiveIconWrapper>
              {filterType === 'favorites' ? 'Fichiers Favoris' : 
               filterType === 'recents' ? 'Activité Récente' : 'Vos Espaces'}
            </h2>
            {filterType !== 'favorites' && filterType !== 'recents' && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-bold text-orange-500 hover:text-orange-400 hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-colors flex items-center gap-1 uppercase tracking-widest"
                >
                  <InteractiveIconWrapper><Plus className="w-4 h-4" /></InteractiveIconWrapper> Nouveau
                </button>
            )}
          </div>

          <motion.div 
            layout
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {filterType === 'favorites' ? (
                filteredRecent.filter(f => f.isFavorite).length > 0 ? filteredRecent.filter(f => f.isFavorite).map((file) => (
                    <motion.div 
                        key={file._id.toString()} 
                        variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { y: 0, opacity: 1 }
                        }}
                        whileHover={{ y: -4 }}
                        onClick={() => router.push(`/space/${file.spaceId}`)}
                        className="minimalist-card flex items-center gap-4 group relative overflow-hidden p-6 h-full"
                    >
                        <FileCorner />
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all relative z-10">
                            <InteractiveIconWrapper>
                                <Star className="w-4 h-4 fill-current" />
                            </InteractiveIconWrapper>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-bold truncate text-white group-hover:text-orange-500 transition-colors">{file.name}</p>
                            <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">Favori</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </motion.div>
                )) : (
                    <div className="col-span-2 py-20 text-center border border-white/5 bg-[#0A0503]/40 backdrop-blur-xl rounded-[2.5rem] flex flex-col items-center justify-center">
                        <AnimatedEmptyState type="file" />
                        <h3 className="text-xl font-serif italic text-white mt-4">Aucun favori</h3>
                        <p className="text-[#A0A0A0] text-xs">Marquez des fichiers pour les retrouver ici.</p>
                    </div>
                )
            ) : filterType === 'recents' ? (
                filteredRecent.length > 0 ? filteredRecent.map((file) => (
                    <motion.div 
                        key={file._id.toString()} 
                        variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { y: 0, opacity: 1 }
                        }}
                        whileHover={{ y: -4 }}
                        onClick={() => router.push(`/space/${file.spaceId}`)}
                        className="minimalist-card flex items-center gap-4 group relative overflow-hidden p-6 h-full"
                    >
                        <FileCorner />
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all relative z-10">
                            <InteractiveIconWrapper>
                                <Clock className="w-4 h-4" />
                            </InteractiveIconWrapper>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-bold truncate text-white group-hover:text-orange-500 transition-colors">{file.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">{Math.round(file.size / 1024)} KB</p>
                                {file.isFavorite && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-white/20" />
                                        <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    </>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </motion.div>
                )) : (
                    <div className="col-span-2 py-20 text-center border border-white/5 bg-[#0A0503]/40 backdrop-blur-xl rounded-[2.5rem] flex flex-col items-center justify-center">
                        <AnimatedEmptyState type="activity" />
                        <h3 className="text-xl font-serif italic text-white mt-4">Aucune activité</h3>
                        <p className="text-[#A0A0A0] text-xs">Vos modifications récentes apparaîtront ici.</p>
                    </div>
                )
            ) : (
                filteredSpaces.length > 0 ? filteredSpaces.map((space) => (
                  <motion.div
                    key={space._id.toString()}
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                    whileHover={{ y: -4 }}
                  >
                    <Link 
                      href={`/space/${space._id}`} 
                      className="minimalist-card group flex flex-col gap-8 relative overflow-hidden h-full p-8"
                    >
                      <FolderTab />
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-[100px] group-hover:bg-white/10 transition-colors -z-10" />
                      <div className="flex items-start justify-between relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-orange-500 group-hover:border-orange-500 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all">
                          <InteractiveIconWrapper><Folder className="w-6 h-6 fill-current opacity-80 group-hover:opacity-100" /></InteractiveIconWrapper>
                        </div>
                        {!space.isGlobal && (
                            <button 
                                onClick={(e) => handleDeleteSpace(e, space._id)}
                                className="p-2 text-white/20 hover:text-red-500 hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all"
                                title="Supprimer"
                            >
                                <InteractiveIconWrapper><Trash2 className="w-4 h-4" /></InteractiveIconWrapper>
                            </button>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-orange-500 group-hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all">{space.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest" suppressHydrationWarning>
                              {new Date(space.createdAt).toLocaleDateString()}
                          </p>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">ID: {space._id.substring(space._id.length - 4)}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )) : (
                  <div className="col-span-2 py-20 text-center border border-white/5 bg-[#0A0503]/40 backdrop-blur-xl rounded-[2.5rem] flex flex-col items-center justify-center">
                    <AnimatedEmptyState type="folder" />
                    <div className="mt-4">
                      <h3 className="text-xl font-serif italic text-white">Aucun espace</h3>
                      <p className="text-[#A0A0A0] text-xs">Créez votre premier espace pour commencer.</p>
                    </div>
                  </div>
                )
            )}
          </motion.div>
        </section>

        {/* Activity Sidebar */}
        <aside className="space-y-8 bg-[#0A0503]/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5">
          <h2 className="text-2xl font-serif italic tracking-tight text-white">Récents</h2>
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="space-y-6"
          >
            {filteredRecent.length > 0 ? filteredRecent.map((file) => (
              <motion.div 
                key={file._id.toString()} 
                variants={{
                  hidden: { x: 20, opacity: 0 },
                  visible: { x: 0, opacity: 1 }
                }}
                whileHover={{ x: 4 }}
                onClick={() => router.push(`/space/${file.spaceId}`)}
                className="flex items-center gap-4 group cursor-pointer p-4 rounded-2xl bg-[#0A0503]/50 backdrop-blur-md border border-white/5 hover:border-orange-500/50 hover:bg-white/5 hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white group-hover:text-orange-500 transition-colors">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">{Math.round(file.size / 1024)} KB</p>
                    {file.isFavorite && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <InteractiveIconWrapper><Star className="w-3 h-3 text-orange-500 fill-orange-500" /></InteractiveIconWrapper>
                      </>
                    )}
                  </div>
                </div>
                <InteractiveIconWrapper><ChevronRight className="w-4 h-4 text-[#A0A0A0] group-hover:text-white transition-colors" /></InteractiveIconWrapper>
              </motion.div>
            )) : (
              <div className="py-20 text-center space-y-4">
                <InteractiveIconWrapper><Clock className="w-8 h-8 text-[#A0A0A0] mx-auto" /></InteractiveIconWrapper>
                <p className="text-xs text-[#A0A0A0] font-bold">Aucun fichier récent</p>
              </div>
            )}
          </motion.div>
        </aside>
      </div>

      <CreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        type="space" 
        userId={userId} 
      />
    </div>
  );
}

