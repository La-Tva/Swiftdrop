"use client";

import { useState, useEffect } from "react";
import {
  Link as LinkIcon,
  FileText,
  Plus,
  Loader2,
  Search,
  Trash2,
  Download,
} from "lucide-react";
import { RENDER_BACKEND_URL } from "@/lib/constants";
import useSWR from "swr";
import {
  InteractiveIconWrapper,
  AnimatedEmptyState,
  AnimatedSearchLoupe,
} from "@/components/Animations";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
    `${RENDER_BACKEND_URL}/api/notes?userId=${userId}`,
    fetcher,
    { revalidateOnFocus: true },
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<"link" | "doc">("link");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (data?.notes) {
      setNotes(data.notes);
    }
  }, [data]);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet élément ?")) return;
    try {
      const res = await fetch(`${RENDER_BACKEND_URL}/api/notes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: userId }),
      });
      if (res.ok) {
        toast.success("Élément supprimé");
        mutate();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (e) {
      toast.error("Erreur réseau");
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
        mutate();
        setIsModalOpen(false);
        setNewLabel("");
        setNewContent("");
      } else {
        toast.error("Erreur lors de la création");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.type === activeTab &&
      (n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="flex flex-col h-full bg-[#0A0503]/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden text-white p-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif italic mb-2">Notes & Liens</h1>
          <p className="text-[#A0A0A0] text-sm">
            Votre espace de travail personnel pour sauvegarder vos liens et
            documents textuels.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-64">
            <AnimatedSearchLoupe className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0503]/50 backdrop-blur-md border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white placeholder-[#A0A0A0] focus:outline-none focus:border-orange-500 focus:bg-[#0A0503] focus:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all hover:border-white/20"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-shrink-0 items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-xs font-bold hover:scale-105 transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-6">
        <button
          onClick={() => setActiveTab("link")}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "link" ? "border-orange-500 text-orange-500" : "border-transparent text-[#A0A0A0] hover:text-white"}`}
        >
          <LinkIcon className="w-4 h-4" /> Liens
        </button>
        <button
          onClick={() => setActiveTab("doc")}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "doc" ? "border-orange-500 text-orange-500" : "border-transparent text-[#A0A0A0] hover:text-white"}`}
        >
          <FileText className="w-4 h-4" /> Documents
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div
                key={note._id}
                className="group relative bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all flex flex-col h-48"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-orange-500 group-hover:bg-orange-500/20 transition-colors">
                      {note.type === "link" ? (
                        <LinkIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate text-base group-hover:text-orange-400 transition-colors">
                        {note.label}
                      </h3>
                      <p className="text-xs text-[#A0A0A0] truncate">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="p-2 text-[#A0A0A0] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {note.type === "link" ? (
                  <div className="flex-1 mt-2 relative">
                    <a
                      href={note.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#A0A0A0] line-clamp-2 hover:underline"
                    >
                      {note.content}
                    </a>

                    {/* Hover Preview Tooltip (Very basic implementation, can be styled better if absolute) */}
                    {note.preview && Object.keys(note.preview).length > 0 && (
                      <div className="absolute inset-x-0 bottom-0 top-0 mt-8 bg-black border border-white/10 rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden group-hover:flex flex-col shadow-2xl">
                        {note.preview.images &&
                          note.preview.images.length > 0 && (
                            <div className="h-16 w-full bg-white/5">
                              <img
                                src={note.preview.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        <div className="p-2 flex-1 min-h-0 bg-black">
                          <p className="text-xs font-bold text-white line-clamp-1">
                            {note.preview.title}
                          </p>
                          <p className="text-[10px] text-[#A0A0A0] line-clamp-1 mt-0.5">
                            {note.preview.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 mt-2 flex flex-col min-h-0">
                    <div className="flex-1 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black pointer-events-none z-10" />
                      <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap break-words text-left leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                    <div className="flex justify-end mt-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleDownload(note)}
                        className="flex items-center gap-2 text-xs font-bold text-orange-500 hover:text-orange-400"
                      >
                        <Download className="w-3 h-3" /> Télécharger .txt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0503] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-6">
              {activeTab === "link" ? "Ajouter un lien" : "Nouveau Document"}
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
                  Libellé
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={
                    activeTab === "link"
                      ? "Ex: Inspiration Design, Portfolio..."
                      : "Ex: Notes de réunion..."
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
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
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#A0A0A0] hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newLabel || !newContent}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
