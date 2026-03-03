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

import { AnimatedEmptyState } from "@/components/Animations";

export function DashboardClient({ 
    userId, 
    userSpaces, 
    recentFiles,
    stats,
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
      try {
          const res = await fetch(`${RENDER_BACKEND_URL}/api/items`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, type: 'space' })
          });
          if (res.ok) {
              toast.success("Espace supprimé");
              router.refresh();
          }
      } catch (err) {
          toast.error("Erreur de suppression");
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
          <h1 className="text-4xl sm:text-6xl font-serif italic tracking-tight mb-2">
            Bonjour, {userName.split(' ')[0]}
          </h1>
          <p className="text-[#666666] text-sm font-medium">L'explorateur de fichiers nouvelle génération.</p>
        </div>
        
        <div className="relative group max-w-md w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] group-focus-within:text-black transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F9F9F9] border border-[#E5E5E5] rounded-full py-4 pl-12 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-black/10 focus:border-black transition-all font-medium"
          />
        </div>
      </header>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit flex items-center gap-2">
              <Folder className="w-5 h-5 text-violet-400" /> 
              {filterType === 'favorites' ? 'Fichiers Favoris' : 
               filterType === 'recents' ? 'Activité Récente' : 'Vos Espaces'}
            </h2>
            {filterType !== 'favorites' && filterType !== 'recents' && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" /> Nouveau
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
                        className="p-6 rounded-[2.5rem] border border-[#E5E5E5] bg-white hover:border-black transition-all cursor-pointer flex items-center gap-4 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all">
                            <Star className="w-4 h-4 fill-current" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate group-hover:text-black transition-colors">{file.name}</p>
                            <p className="text-[10px] text-[#999999] font-bold uppercase tracking-widest">Favori</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#E5E5E5] group-hover:text-black group-hover:translate-x-1 transition-all" />
                    </motion.div>
                )) : (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[2.5rem] flex flex-col items-center justify-center">
                        <AnimatedEmptyState type="file" />
                        <h3 className="text-xl font-serif italic text-black mt-4">Aucun favori</h3>
                        <p className="text-[#999999] text-xs">Marquez des fichiers pour les retrouver ici.</p>
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
                        className="p-6 rounded-[2.5rem] border border-[#E5E5E5] bg-white hover:border-black transition-all cursor-pointer flex items-center gap-4 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate group-hover:text-black transition-colors">{file.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-[#999999] font-bold uppercase tracking-widest">{Math.round(file.size / 1024)} KB</p>
                                {file.isFavorite && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-[#E5E5E5]" />
                                        <Star className="w-3 h-3 text-black fill-current" />
                                    </>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#E5E5E5] group-hover:text-black group-hover:translate-x-1 transition-all" />
                    </motion.div>
                )) : (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[2.5rem] flex flex-col items-center justify-center">
                        <AnimatedEmptyState type="activity" />
                        <h3 className="text-xl font-serif italic text-black mt-4">Aucune activité</h3>
                        <p className="text-[#999999] text-xs">Vos modifications récentes apparaîtront ici.</p>
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
                      className="p-8 rounded-[2.5rem] border border-[#E5E5E5] bg-white hover:border-black transition-all group flex flex-col gap-8 relative overflow-hidden h-full"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-[#F9F9F9] rounded-bl-full group-hover:bg-black/5 transition-colors -z-10" />
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#666666] group-hover:bg-black group-hover:border-black group-hover:text-white transition-all">
                          <Folder className="w-6 h-6 fill-current opacity-40 group-hover:opacity-100" />
                        </div>
                        {!space.isGlobal && (
                            <button 
                                onClick={(e) => handleDeleteSpace(e, space._id)}
                                className="p-2 text-[#E5E5E5] hover:text-red-500 transition-colors"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold group-hover:text-black transition-colors">{space.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-[#999999] font-bold uppercase tracking-widest" suppressHydrationWarning>
                              {new Date(space.createdAt).toLocaleDateString()}
                          </p>
                          <div className="w-1 h-1 rounded-full bg-[#E5E5E5]" />
                          <p className="text-[10px] text-[#999999] font-bold uppercase tracking-widest">ID: {space._id.substring(space._id.length - 4)}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )) : (
                  <div className="col-span-2 py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[2.5rem] flex flex-col items-center justify-center">
                    <AnimatedEmptyState type="folder" />
                    <div className="mt-4">
                      <h3 className="text-xl font-serif italic text-black">Aucun espace</h3>
                      <p className="text-[#999999] text-xs">Créez votre premier espace pour commencer.</p>
                    </div>
                  </div>
                )
            )}
          </motion.div>
        </section>

        {/* Activity Sidebar */}
        <aside className="space-y-8 bg-[#FDFDFD] p-8 rounded-[2.5rem] border border-[#F5F5F5]">
          <h2 className="text-2xl font-serif italic tracking-tight">Récents</h2>
          
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
                className="flex items-center gap-4 group cursor-pointer p-4 rounded-2xl bg-white border border-[#F0F0F0] hover:border-black hover:shadow-xl hover:shadow-black/5 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-black transition-colors">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-[#999999] font-bold uppercase tracking-widest">{Math.round(file.size / 1024)} KB</p>
                    {file.isFavorite && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-[#E5E5E5]" />
                        <Star className="w-3 h-3 text-black fill-current" />
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#E5E5E5] group-hover:text-black transition-colors" />
              </motion.div>
            )) : (
              <div className="py-20 text-center space-y-4">
                <Clock className="w-8 h-8 text-[#E5E5E5] mx-auto" />
                <p className="text-xs text-[#999999] font-bold">Aucun fichier récent</p>
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

