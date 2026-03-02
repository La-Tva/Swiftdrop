"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Github } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Identifiants invalides");
      } else {
        router.push("/main");
        toast.success("Bienvenue sur SwiftDrop");
      }
    } catch (err) {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 premium-gradient relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 glass"
          >
            <ArrowRight className="w-8 h-8 text-violet-400 -rotate-45" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-outfit">SwiftDrop</h1>
          <p className="text-slate-400">Accédez à votre espace Cloud Premium</p>
        </div>

        <div className="glass rounded-[2rem] p-8 md:p-10 border border-white/10 shadow-2xl relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-violet-400 hover:text-white transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Se connecter"}
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
             <button className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm">
                <Github className="w-5 h-5" /> Continuer avec GitHub
             </button>
             <p className="text-center text-xs text-slate-500">
               Pas encore de compte ? <button className="text-violet-400 font-semibold hover:underline">S'inscrire</button>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
