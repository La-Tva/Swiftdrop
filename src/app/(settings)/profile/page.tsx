import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { User, Shield, HardDrive, Smartphone, LogOut, ChevronRight } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-violet-500/20">
            {session.user?.name?.[0].toUpperCase() || "S"}
          </div>
          <div>
            <h1 className="text-3xl font-bold font-outfit">{session.user?.name || "Utilisateur SwiftDrop"}</h1>
            <p className="text-slate-500">{session.user?.email}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {[
            { label: "Informations Personnelles", description: "Nom, email et photo de profil", icon: User },
            { label: "Sécurité & Mot de Passe", description: "Authentification à deux facteurs", icon: Shield },
            { label: "Stockage Appareils", description: "Gérer vos terminaux connectés (PC/Mobile)", icon: Smartphone },
            { label: "Abonnement SwiftDrop", description: "Version Premium • Cloud 2TB", icon: HardDrive },
          ].map((item, i) => (
            <div key={i} className="glass glass-hover p-6 rounded-3xl flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-violet-400 transition-colors">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-white/90">{item.label}</h3>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all">
          <LogOut className="w-5 h-5" /> Déconnexion de la session
        </button>
      </div>
    </DashboardLayout>
  );
}
