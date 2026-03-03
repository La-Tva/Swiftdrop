"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, ArrowRight, Github } from "lucide-react";
import { toast } from "sonner";

import { DecorativeWave } from "@/components/Animations";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Compte créé avec succès !");
        router.push("/login");
      } else {
        toast.error(data.error || "Une erreur est survenue");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-white overflow-hidden">
      <DecorativeWave />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white p-10 rounded-[2.5rem] border border-[#F0F0F0] shadow-2xl shadow-black/5 relative overflow-hidden">
          <header className="text-center mb-12 relative">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-black text-white mb-8 shadow-2xl shadow-black/20"
            >
              <User className="w-10 h-10" />
            </motion.div>
            <h1 className="text-5xl font-serif italic tracking-tight text-black mb-4">
              SwiftDrop
            </h1>
            <p className="text-[#999999] font-bold uppercase tracking-widest text-[10px]">Créer votre compte premium</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <div className="group relative space-y-3">
                <label className="text-[10px] font-bold text-[#969696] uppercase tracking-[0.2em] ml-1 block group-focus-within:text-black transition-colors">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCCCCC] group-focus-within:text-black transition-colors" />
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full bg-[#F9F9F9] border border-[#F0F0F0] rounded-2xl py-5 pl-14 pr-6 text-black placeholder:text-[#CCCCCC] focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div className="group relative space-y-3">
                <label className="text-[10px] font-bold text-[#969696] uppercase tracking-[0.2em] ml-1 block group-focus-within:text-black transition-colors">Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCCCCC] group-focus-within:text-black transition-colors" />
                  <input 
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="nom@exemple.com"
                    className="w-full bg-[#F9F9F9] border border-[#F0F0F0] rounded-2xl py-5 pl-14 pr-6 text-black placeholder:text-[#CCCCCC] focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div className="group relative space-y-3">
                <label className="text-[10px] font-bold text-[#969696] uppercase tracking-[0.2em] ml-1 block group-focus-within:text-black transition-colors">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCCCCC] group-focus-within:text-black transition-colors" />
                  <input 
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-[#F9F9F9] border border-[#F0F0F0] rounded-2xl py-5 pl-14 pr-6 text-black placeholder:text-[#CCCCCC] focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white font-bold py-5 rounded-full hover:scale-[1.02] transition-all transform active:scale-[0.98] shadow-xl shadow-black/10 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? "Création..." : "S'inscrire"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#F5F5F5]">
            <p className="text-center text-[#999999] text-xs font-medium">
              Déjà un compte ? <Link href="/login" className="text-black font-bold hover:underline underline-offset-4 transition-all">Se connecter</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
