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
import { CreateModal } from "@/components/CreateModal";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL, RENDER_BACKEND_URL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DashboardClient({ 
    userId, 
    userSpaces, 
    recentFiles,
    stats,
    userName 
}: { 
    userId: string, 
    userSpaces: any[], 
    recentFiles: any[],
    stats: { spacesTotal: number, sharedTotal: number, favoritesTotal: number },
    userName: string 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "shared" | "favorites">("all");
  const router = useRouter();

  useEffect(() => {
      const socket = io(SOCKET_URL);
      socket.on('space_created', (data) => {
          if (data.ownerId === userId) router.refresh();
      });
      socket.on('space_deleted', () => {
          router.refresh();
      });
      return () => { socket.disconnect(); };
  }, [userId, router]);

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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-outfit tracking-tight">
            Bonjour, <span className="text-violet-400">{userName.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Gérez vos fichiers avec élégance.</p>
        </div>
        
        <div className="relative group max-w-md w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher un document..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all font-medium"
          />
        </div>
      </header>

      {/* Quick Access Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: "all", label: "Mes Espaces", count: stats.spacesTotal, icon: Folder, color: "text-violet-400", bg: "bg-violet-500/10" },
          { id: "shared", label: "Partagés", count: stats.sharedTotal, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { id: "favorites", label: "Favoris", count: stats.favoritesTotal, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((item, i) => (
          <div 
            key={i} 
            onClick={() => setFilterType(item.id as any)}
            className={`glass glass-hover p-4 sm:p-6 rounded-3xl flex items-center justify-between group cursor-pointer border ${filterType === item.id ? 'border-violet-500/50' : 'border-white/5'} hover:border-white/10 transition-all`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white/90">{item.label}</h3>
                <p className="text-xs text-slate-500 font-bold">{item.count} éléments</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit flex items-center gap-2">
              <Folder className="w-5 h-5 text-violet-400" /> {filterType === 'favorites' ? 'Fichiers Favoris' : 'Vos Espaces'}
            </h2>
            {filterType !== 'favorites' && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" /> Nouveau
                </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterType === 'favorites' ? (
                filteredRecent.filter(f => f.isFavorite).length > 0 ? filteredRecent.filter(f => f.isFavorite).map((file) => (
                    <div key={file._id.toString()} className="glass glass-hover p-5 rounded-3xl flex items-center gap-4 group border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center text-violet-400">
                            <Star className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Favori</p>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-2 py-10 text-center">
                        <Star className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                        <p className="text-slate-400 font-bold">Aucun favori</p>
                    </div>
                )
            ) : (
                filteredSpaces.length > 0 ? filteredSpaces.map((space) => (
                  <Link 
                    href={`/space/${space._id}`} 
                    key={space._id.toString()}
                    className="glass glass-hover p-5 rounded-3xl flex flex-col gap-4 group border border-white/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-violet-400 group-hover:scale-105 transition-all">
                        <Folder className="w-6 h-6 fill-current opacity-20" />
                      </div>
                      {!space.isGlobal && (
                          <button 
                              onClick={(e) => handleDeleteSpace(e, space._id)}
                              className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                              title="Supprimer l'espace"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold group-hover:text-violet-400 transition-colors">{space.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1" suppressHydrationWarning>
                        Créé le {new Date(space.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                )) : (
                  <div className="col-span-2 glass border-dashed border-2 border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 text-center">
                    <Folder className="w-10 h-10 text-slate-700" />
                    <div>
                      <p className="text-slate-400 font-bold">Aucun espace trouvé</p>
                      <p className="text-xs text-slate-600">Initialisez un espace ou changez vos filtres.</p>
                    </div>
                  </div>
                )
            )}
          </div>
        </section>

        {/* Activity Sidebar */}
        <aside className="space-y-6">
          <h2 className="text-xl font-bold font-outfit flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" /> Récents
          </h2>
          
          <div className="glass rounded-3xl p-6 space-y-5 border border-white/5">
            {filteredRecent.length > 0 ? filteredRecent.map((file) => (
              <div key={file._id.toString()} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-white transition-colors">{file.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{Math.round(file.size / 1024)} KB</p>
                </div>
                {file.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-current" />}
              </div>
            )) : (
              <div className="py-10 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-600 font-bold">Pas d'activité récente</p>
              </div>
            )}
          </div>
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

