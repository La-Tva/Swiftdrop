"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Shield, Zap, ArrowRight, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (activeTab === "register") {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Registration failed");
        }
        toast.success("Account created! Please sign in.");
        setActiveTab("login");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        toast.error("Invalid credentials");
        setLoading(false);
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white selection:bg-violet-500/30 overflow-hidden premium-gradient">
      <Toaster theme="dark" position="top-center" richColors />
      
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-[150px]" />
      </div>

      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SwiftDrop</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
          <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Enterprise</a>
        </div>
        <button className="px-5 py-2.5 glass glass-hover rounded-full text-sm font-semibold transition-all">
          Contact Sales
        </button>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Hero Content */}
        <div className="flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest"
          >
            <Zap className="w-3 h-3 fill-violet-400" />
            Now supporting 5GB files
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            <span className="gradient-text">File Sharing</span> <br />
            <span className="text-slate-400 opacity-50">Redefined.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-lg"
          >
            Experience the next generation of cloud storage. 
            Blazing fast uploads, secure end-to-end encryption, and a 
            glassmorphism interface designed for professionals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-violet-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-300">End-to-end Encrypted</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-violet-400">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-300">Global CDN Delivery</span>
            </div>
          </motion.div>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex gap-2 p-1.5 glass bg-white/5 rounded-2xl mb-10 w-fit">
              <button 
                onClick={() => setActiveTab("login")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "login" ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-500 hover:text-white'}`}
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              <button 
                onClick={() => setActiveTab("register")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "register" ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-500 hover:text-white'}`}
              >
                <UserPlus className="w-4 h-4" /> Join Now
              </button>
            </div>

            <h2 className="text-3xl font-bold mb-2">
              {activeTab === "login" ? "Welcome back" : "Create Account"}
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              {activeTab === "login" ? "Enter your credentials to access your spaces" : "Get started with 10GB of free premium storage today"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {activeTab === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input 
                        required={activeTab === "register"}
                        type="text" 
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full glass bg-white/5 border-white/10 px-12 py-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input 
                    required
                    type="email" 
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full glass bg-white/5 border-white/10 px-12 py-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 pb-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input 
                    required
                    type="password" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full glass bg-white/5 border-white/10 px-12 py-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-xl shadow-violet-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? "Processing..." : activeTab === "login" ? "Sign In" : "Get Started"}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>

          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px]" />
        </motion.div>
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-sm">
        <p>© 2026 SwiftDrop Premium storage. No compromises.</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
        </div>
      </footer>
    </div>
  );
}
