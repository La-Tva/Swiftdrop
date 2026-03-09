"use client";

import { useState, useEffect, useRef } from "react";
import {
  Link as LinkIcon,
  FileText,
  Plus,
  Loader2,
  Search,
  Trash2,
  Download,
  MoreVertical,
  Edit2,
  X,
} from "lucide-react";
import { RENDER_BACKEND_URL } from "@/lib/constants";
import useSWR from "swr";
import {
  InteractiveIconWrapper,
  AnimatedEmptyState,
  AnimatedSearchLoupe,
} from "@/components/Animations";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { preload } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
preload(`${RENDER_BACKEND_URL}/api/notes`, fetcher);

interface Note {
  _id: string;
  ownerId: string;
  type: "link" | "doc";
  label: string;
  content: string;
  createdAt: string;
  preview?: {
    title?: string;
    description?: string;
    images?: string[];
    url?: string;
    siteName?: string;
  } | null;
}

export function NotesClient({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const { data, isLoading, mutate } = useSWR(
    `${RENDER_BACKEND_URL}/api/notes`,
    fetcher,
    { revalidateOnFocus: true, revalidateOnMount: true },
  );
  const notes = data?.notes || [];
  const [activeTab, setActiveTab] = useState<"link" | "doc">("link");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal & Fullscreen Editor state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Action Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside the action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet élément ?")) return;

    // Optimistic Update
    const newNotes = notes.filter((n: Note) => n._id !== id);
    mutate({ notes: newNotes }, false);

    try {
      const res = await fetch(`${RENDER_BACKEND_URL}/api/notes/${id}?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Élément supprimé");
        mutate();
      } else {
        toast.error("Erreur lors de la suppression");
        mutate();
      }
    } catch (e) {
      toast.error("Erreur réseau");
      mutate();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newContent) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${RENDER_BACKEND_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: userId,
          type: activeTab,
          label: newLabel,
          content: newContent,
        }),
      });

      if (res.ok) {
        toast.success(activeTab === "link" ? "Lien ajouté" : "Document créé");
        setIsModalOpen(false);
        setNewLabel("");
        setNewContent("");
        await mutate(); // Wait for actual data
      } else {
        toast.error("Erreur lors de la création");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditor = (note: Note) => {
    setEditingNote(note);
    setEditLabel(note.label);
    setEditContent(note.content);
    setOpenMenuId(null);
  };

  const handleUpdate = async () => {
    if (!editingNote || !editLabel || !editContent) return;
    setIsUpdating(true);

    // Optimistic Update
    const updatedNote = {
      ...editingNote,
      label: editLabel,
      content: editContent,
    };
    const newNotes = notes.map((n: Note) =>
      n._id === editingNote._id ? updatedNote : n,
    );
    mutate({ notes: newNotes }, false);

    try {
      const res = await fetch(
        `${RENDER_BACKEND_URL}/api/notes/${editingNote._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: editLabel,
            content: editContent,
            type: editingNote.type,
          }),
        },
      );

      if (res.ok) {
        toast.success("Modifications sauvegardées");
        setEditingNote(null);
        await mutate();
      } else {
        toast.error("Erreur lors de la sauvegarde");
        mutate();
      }
    } catch (err) {
      toast.error("Erreur réseau");
      mutate();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownload = (note: Note) => {
    const blob = new Blob([note.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.label}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(
    (n: Note) =>
      n.type === activeTab &&
      (n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="flex flex-col h-full bg-[#0A0503]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] md:rounded-3xl overflow-hidden text-white p-4 md:p-6 relative">
      {/* 🔴 Header and Search - Optimized for Mobile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif italic mb-1 md:mb-2 text-white">
            Notes & Liens
          </h1>
          <p className="text-[#A0A0A0] text-xs md:text-sm hidden md:block">
            Votre espace de travail pour sauvegarder vos liens et rédiger des
            documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group w-full md:w-64">
            <AnimatedSearchLoupe className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0503]/50 backdrop-blur-md border border-white/5 rounded-2xl py-2.5 md:py-3 pl-12 pr-4 text-xs text-white placeholder-[#A0A0A0] focus:outline-none focus:border-orange-500 transition-all hover:border-white/20"
            />
          </div>
          <button
            onClick={() => {
              setNewLabel("");
              setNewContent("");
              setIsModalOpen(true);
            }}
            className="flex flex-shrink-0 items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-xs font-bold hover:scale-105 transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-4 shrink-0">
        <button
          onClick={() => setActiveTab("link")}
          className={`px-4 sm:px-6 py-2 md:py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "link" ? "border-orange-500 text-orange-500" : "border-transparent text-[#A0A0A0] hover:text-white"}`}
        >
          <LinkIcon className="w-4 h-4" /> Liens
        </button>
        <button
          onClick={() => setActiveTab("doc")}
          className={`px-4 sm:px-6 py-2 md:py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "doc" ? "border-orange-500 text-orange-500" : "border-transparent text-[#A0A0A0] hover:text-white"}`}
        >
          <FileText className="w-4 h-4" /> Documents
        </button>
      </div>

      {/* 🔴 Content Grid - Maximized height */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-4 px-4 md:-mx-0 md:px-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-10">
            <AnimatedEmptyState
              type={activeTab === "link" ? "folder" : "activity"}
            />
            <p className="text-sm font-bold mt-4 text-[#A0A0A0]">
              Aucun élément trouvé.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-24 md:pb-6">
            {filteredNotes.map((note: Note) => (
              <div
                key={note._id}
                className={`group relative bg-[#0A0503]/50 border border-white/10 rounded-2xl p-4 md:p-5 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all flex flex-col ${note.type === "link" ? "min-h-[220px] md:min-h-[260px]" : "h-40 md:h-48"}`}
              >
                {/* Header of Card */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-orange-500 transition-colors">
                      {note.type === "link" ? (
                        <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        <FileText className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        onClick={() => openEditor(note)}
                        className="font-bold text-white truncate text-sm md:text-base cursor-pointer hover:text-orange-400 transition-colors"
                      >
                        {note.label}
                      </h3>
                      <p className="text-[10px] md:text-xs text-[#A0A0A0] truncate">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === note._id ? null : note._id)
                      }
                      className="p-1.5 md:p-2 text-[#A0A0A0] hover:text-white transition-colors bg-black/40 rounded-lg"
                    >
                      <MoreVertical className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                    {openMenuId === note._id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full mt-1 w-40 bg-[#0A0503] border border-white/10 rounded-xl shadow-2xl z-20 py-1 flex flex-col overflow-hidden"
                      >
                        <button
                          onClick={() => openEditor(note)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors text-left"
                        >
                          <Edit2 className="w-3 h-3 text-[#A0A0A0]" />{" "}
                          {note.type === "doc"
                            ? "Ouvrir (Éditeur)"
                            : "Modifier"}
                        </button>
                        {note.type === "doc" && (
                          <button
                            onClick={() => {
                              handleDownload(note);
                              setOpenMenuId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition-colors text-left hidden md:flex"
                          >
                            <Download className="w-3 h-3" /> Télécharger .txt
                          </button>
                        )}
                        <div className="h-px bg-white/10 w-full my-1" />
                        <button
                          onClick={() => {
                            handleDelete(note._id);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors text-left"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body of Card */}
                {note.type === "link" ? (
                  <div className="flex-1 mt-2 flex flex-col min-h-0">
                    <a
                      href={note.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-orange-500 font-medium line-clamp-1 hover:underline mb-2"
                    >
                      {note.content}
                    </a>

                    {/* Permanent Link Preview */}
                    {note.preview && Object.keys(note.preview).length > 0 && (
                      <div className="flex-1 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-xl">
                        {note.preview.images &&
                          note.preview.images.length > 0 && (
                            <div className="h-20 w-full bg-white/5 shrink-0">
                              <img
                                src={note.preview.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        <div className="p-2 flex-1 min-h-0">
                          <p className="text-[10px] md:text-xs font-bold text-white line-clamp-1">
                            {note.preview.title}
                          </p>
                          <p className="text-[8px] md:text-[10px] text-[#A0A0A0] line-clamp-2 mt-0.5">
                            {note.preview.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex-1 mt-2 flex flex-col min-h-0 cursor-pointer"
                    onClick={() => openEditor(note)}
                  >
                    <div className="flex-1 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0503]/80 pointer-events-none z-10" />
                      <p className="text-xs md:text-sm text-[#A0A0A0] whitespace-pre-wrap break-words text-left leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0A0503] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(249,115,22,0.3)] relative"
            >
              <h2 className="text-lg md:text-xl font-bold text-white mb-6">
                {activeTab === "link" ? "Ajouter un lien" : "Nouveau Document"}
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
                    Libellé
                  </label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Ex: Ressources UI..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
                    {activeTab === "link" ? "URL du lien" : "Contenu"}
                  </label>
                  {activeTab === "link" ? (
                    <input
                      type="url"
                      required
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  ) : (
                    <textarea
                      required
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Commencez à rédiger..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors min-h-[150px] resize-y custom-scrollbar"
                    />
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#A0A0A0] hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newLabel || !newContent}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}{" "}
                    Créer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Fullscreen Document Editor & Link Edit Modal */}
      <AnimatePresence>
        {editingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[120] flex overflow-hidden ${editingNote.type === "doc" ? "items-stretch justify-stretch" : "items-center justify-center p-4"} bg-black/80 backdrop-blur-md`}
          >
            <motion.div
              initial={{ scale: 0.98, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`bg-[#0A0503] flex flex-col border border-white/10 shadow-[0_20px_80px_rgba(249,115,22,0.15)] relative overflow-hidden max-h-full
                ${editingNote.type === "doc" ? "w-full h-full rounded-none md:rounded-3xl md:m-6 md:h-[calc(100vh-3rem)]" : "w-full max-w-lg rounded-3xl p-6"}
              `}
            >
              {editingNote.type === "link" ? (
                // ─── LINK EDIT MODAL ───
                <>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
                    Modifier le lien
                    <button
                      onClick={() => setEditingNote(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#A0A0A0]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
                        Libellé
                      </label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
                        URL
                      </label>
                      <input
                        type="url"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                      <button
                        onClick={() => setEditingNote(null)}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#A0A0A0] hover:text-white transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 border border-orange-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-[0_0_15px_#ea580c]"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}{" "}
                        Sauvegarder
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // ─── FULLSCREEN DOCUMENT EDITOR (Google Docs Vibe) ───
                <>
                  {/* Editor Header */}
                  <div className="flex items-center justify-between shrink-0 p-4 border-b border-white/10 bg-[#0A0503]">
                    <div className="flex items-center gap-3 w-full max-w-2xl">
                      <button
                        onClick={() => setEditingNote(null)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-[#A0A0A0] hover:text-white shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="bg-transparent text-lg md:text-xl font-bold text-white placeholder-[#A0A0A0] focus:outline-none w-full border-b border-transparent focus:border-orange-500/50 transition-colors px-2 py-1"
                        placeholder="Titre du document..."
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownload(editingNote)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-[#A0A0A0] hover:text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        <Download className="w-4 h-4" /> Exporter
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={
                          isUpdating ||
                          (editLabel === editingNote.label &&
                            editContent === editingNote.content)
                        }
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Sauvegarder"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Editor Body */}
                  <div className="flex-1 w-full bg-[#110A07] overflow-y-auto custom-scrollbar flex justify-center p-4 md:p-8">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Identifiez vos idées ici..."
                      className="w-full max-w-4xl bg-transparent text-[#E0E0E0] text-sm md:text-base leading-relaxed tracking-wide resize-none focus:outline-none min-h-full placeholder-[#808080]"
                      spellCheck="false"
                    />
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
