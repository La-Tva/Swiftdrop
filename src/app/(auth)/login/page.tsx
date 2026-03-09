"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Github, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { DecorativeWave } from "@/components/Animations";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0503] text-white relative overflow-hidden">
      {/* Subtle Background Detail */}
      <DecorativeWave />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-400 to-orange-600 text-white mb-8 shadow-[0_0_30px_rgba(249,115,22,0.4)]"
          >
            <ArrowRight className="w-10 h-10 -rotate-45" />
          </motion.div>
          <h1 className="text-5xl font-serif italic tracking-tight text-white mb-4">
            SwiftDrop
          </h1>
          <p className="text-[#A0A0A0] font-bold uppercase tracking-widest text-[10px]">
            Espace de stockage premium
          </p>
        </div>

        <div className="bg-[#0A0503]/50 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/5 shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)] relative z-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-[0.2em] ml-1 group-focus-within:text-orange-500 transition-colors">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-orange-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-[#666666] focus:outline-none focus:border-orange-500 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all font-medium"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-[0.2em] ml-1 group-focus-within:text-orange-500 transition-colors">
                Mot de passe
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-orange-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-14 text-white placeholder:text-[#666666] focus:outline-none focus:border-orange-500 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-white transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-5 rounded-full hover:scale-[1.02] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 shadow-[0_4px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_25px_rgba(249,115,22,0.4)]"
            >
              {loading ? "Connexion..." : "Se connecter"}
              {!loading && (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-center text-xs text-[#A0A0A0] font-medium">
              Accès réservé - SwiftDrop Premium
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
