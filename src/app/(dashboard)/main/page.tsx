import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Folder, 
  FileText, 
  Search, 
  Grid, 
  List, 
  Settings, 
  User, 
  Plus, 
  Star,
  Clock,
  LayoutDashboard
} from "lucide-react";

export default async function DashboardMainPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-white font-outfit">Dashboard</h1>
            <p className="text-slate-500 text-sm">Bienvenue, {session.user?.name || "Utility"}. Gérez vos fichiers en toute simplicité.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <button className="p-2.5 glass rounded-xl text-slate-400 hover:text-white transition-all">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white font-bold text-sm">
              {session.user?.name?.[0].toUpperCase() || "S"}
            </div>
          </div>
        </header>

        {/* Quick Navigation Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Mes Espaces", icon: LayoutDashboard, count: 12, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Récents", icon: Clock, count: 48, color: "text-violet-400", bg: "bg-violet-400/10" },
            { label: "Favoris", icon: Star, count: 15, color: "text-amber-400", bg: "bg-amber-400/10" },
            { label: "Profil", icon: User, count: null, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          ].map((item, i) => (
            <div key={i} className="glass glass-hover p-5 rounded-2xl flex items-center gap-4 cursor-pointer group">
              <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-sm">{item.label}</h3>
                {item.count && <p className="text-xs text-slate-500">{item.count} éléments</p>}
              </div>
            </div>
          ))}
        </section>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-outfit">Espaces récents</h2>
              <div className="flex items-center gap-2 glass px-2 py-1 rounded-lg">
                <button className="p-1 text-violet-400"><Grid className="w-4 h-4" /></button>
                <button className="p-1 text-slate-500"><List className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className="glass glass-hover p-6 rounded-3xl flex flex-col gap-6 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-5 h-5 text-slate-400 hover:text-white" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-all">
                    <Folder className="w-8 h-8 fill-violet-400/20" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Projet Marketing {i + 1}</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">4.2 GB • 12 dossiers</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Activity / Sidebar Sidebar */}
          <aside className="space-y-6">
            <h2 className="text-xl font-bold font-outfit">Derniers fichiers</h2>
            <div className="glass rounded-3xl p-6 divide-y divide-white/5">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-violet-400 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">presentation_v{i}.pdf</h4>
                    <p className="text-[10px] text-slate-500">Modifié il y a {i+1}h</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full py-4 glass glass-hover rounded-2xl text-violet-400 font-bold text-sm flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Créer un nouvel espace
            </button>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
