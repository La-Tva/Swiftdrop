"use client";

import { motion } from "framer-motion";

export function AnimatedEmptyState({ type = "folder" }: { type?: "folder" | "file" | "activity" | "search" }) {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Floating geometric shapes */}
      <motion.div
        animate={{
          y: [-10, 10, -10],
          rotate: [0, 5, -5, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-2 right-2 w-4 h-4 rounded-full bg-black/5"
      />
      <motion.div
        animate={{
          y: [10, -10, 10],
          scale: [0.8, 1.2, 0.8],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-4 left-4 w-3 h-3 rounded-sm bg-black/5 rotate-45"
      />

      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-black/20"
        >
          {type === "folder" && (
            <motion.path
              d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          )}
          {type === "file" && (
            <motion.path
              d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          )}
          {type === "activity" && (
            <motion.circle
              cx="12" cy="12" r="10"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          )}
          {type === "search" && (
            <motion.circle
              cx="11" cy="11" r="8"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          )}
          {type === "activity" && <motion.path d="M12 6v6l4 2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 }} />}
          {type === "search" && <motion.path d="m21 21-4.3-4.3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 }} />}
        </svg>
      </motion.div>

      {/* Pulsing rings */}
      <motion.div
        animate={{ scale: [0.8, 1.5], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 border border-black/5 rounded-full"
      />
    </div>
  );
}

export function PulseIndicator() {
  return (
    <div className="relative w-2 h-2">
      <motion.div
        animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 bg-black rounded-full"
      />
      <div className="relative w-full h-full bg-black rounded-full" />
    </div>
  );
}

export function LivingLogo() {
  return (
    <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-xl bg-black flex items-center justify-center overflow-hidden group">
      <motion.div
        animate={{
          y: [0, -2, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <motion.polyline
            points="17 8 12 3 7 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <motion.line
            x1="12" y1="3" x2="12" y2="15"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          />
        </svg>
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={false}
        whileHover={{ x: ["-100%", "100%"] }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

export function FolderTab() {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[2rem]">
      <svg className="absolute -top-[1px] -left-[1px]" width="60" height="20" viewBox="0 0 60 20" fill="none">
        <path d="M0 0H40C45 0 45 12 50 12H60" stroke="#EEEEEE" strokeWidth="1" fill="none" />
        <path d="M0 0V12H50" stroke="#EEEEEE" strokeWidth="1" fill="none" />
        <motion.path
          d="M5 6H25"
          stroke="black"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.1"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

export function FileCorner() {
  return (
    <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden rounded-[2rem]">
      <svg className="absolute top-0 right-0" width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path d="M0 0H30V30L0 0Z" fill="#F9F9F9" opacity="0.5" />
        <path d="M0 0H30V30" stroke="#E5E5E5" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function DecorativeWave() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
      <svg
        viewBox="0 0 1440 320"
        className="absolute bottom-0 w-full h-auto translate-y-20"
        preserveAspectRatio="none"
      >
        <motion.path
          animate={{
            d: [
              "M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,160L48,181.3C96,203,192,245,288,234.7C384,224,480,160,576,144C672,128,768,160,864,181.3C960,203,1056,213,1152,192C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          fill="#F5F5F5"
        />
      </svg>
    </div>
  );
}
