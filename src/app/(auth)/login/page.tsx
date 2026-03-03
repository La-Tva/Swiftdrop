"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Github } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-white relative overflow-hidden">
      {/* Subtle Background Detail */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#F9F9F9] rounded-bl-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-black text-white mb-8 shadow-2xl shadow-black/20"
          >
            <ArrowRight className="w-10 h-10 -rotate-45" />
          </motion.div>
          <h1 className="text-5xl font-serif italic tracking-tight text-black mb-4">SwiftDrop</h1>
          <p className="text-[#999999] font-bold uppercase tracking-widest text-[10px]">Espace de stockage premium</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 border border-[#F0F0F0] shadow-2xl shadow-black/5 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#969696] uppercase tracking-[0.2em] ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCCCCC] group-focus-within:text-black transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F9F9F9] border border-[#F0F0F0] rounded-2xl py-5 pl-14 pr-6 text-black placeholder:text-[#CCCCCC] focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#969696] uppercase tracking-[0.2em] ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCCCCC] group-focus-within:text-black transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F9F9F9] border border-[#F0F0F0] rounded-2xl py-5 pl-14 pr-6 text-black placeholder:text-[#CCCCCC] focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-bold py-5 rounded-full hover:scale-[1.02] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 shadow-xl shadow-black/10"
            >
              {loading ? "Connexion..." : "Se connecter"}
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#F5F5F5]">
              <p className="text-center text-xs text-[#999999] font-medium">
                Pas encore de compte ? <Link href="/register" className="text-black font-bold hover:underline underline-offset-4">S'inscrire gratuitement</Link>
              </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
