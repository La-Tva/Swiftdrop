"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import {
  Folder,
  File,
  ArrowLeft,
  Trash2,
  Plus,
  Download,
  Star,
  Upload,
  Edit3,
  Loader2,
  X,
  MoreHorizontal,
  FolderOpen,
  ChevronRight,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateModal } from "@/components/CreateModal";
import { RENDER_BACKEND_URL } from "@/lib/constants";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  AnimatedEmptyState,
  FolderTab,
  FileCorner,
  AnimatedSearchLoupe,
  InteractiveIconWrapper,
} from "@/components/Animations";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Ensure all intermediate folders exist on the server, return leaf folderId */
async function ensureFolderPath(
  pathSegments: string[],
  spaceId: string,
  userId: string,
  rootFolderId: string | null,
): Promise<string | null> {
  let parentId = rootFolderId;
  for (const segment of pathSegments) {
    const res = await fetch(`${RENDER_BACKEND_URL}/api/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: segment,
        spaceId,
        parentId: parentId || "null",
        ownerId: userId,
        isUploaded: true,
      }),
    });
    const data = await res.json();
    parentId = data.id;
  }
  return parentId;
}

export function SpaceClient({
  userId,
  spaceId,
  folderId,
  name,
  folders: initialFolders,
  files: initialFiles,
  folderPath: initialFolderPath = [],
}: {
  userId: string;
  spaceId: string;
  folderId: string | null;
  name: string;
  folders: any[];
  files: any[];
  folderPath?: { id: string; name: string }[];
}) {
  // SWR key — changes when navigating into sub-folders
  const swrKey = `/api/spaces/${spaceId}/contents${folderId ? `?folderId=${folderId}` : ""}`;
  const { data, mutate } = useSWR(swrKey, fetcher, {
    fallbackData: {
      folders: initialFolders,
      files: initialFiles,
      folderPath: initialFolderPath,
    },
    revalidateOnFocus: false,
  });

  const folders: any[] = data?.folders ?? initialFolders;
  const files: any[] = data?.files ?? initialFiles;
  const folderPath: { id: string; name: string }[] =
    data?.folderPath ?? initialFolderPath;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const refresh = () => mutate();

  const handleFolderClick = (id: string) => {
    router.push(`/space/${spaceId}?folderId=${id}`);
  };

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
  };

  const handleToggleFavorite = async (id: string, type: "file" | "folder") => {
    try {
      await fetch(`${RENDER_BACKEND_URL}/api/favorites/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      refresh();
      toast.success("Favoris mis à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise en favori");
    }
  };

  const handleDelete = async (id: string, type: "file" | "folder") => {
    if (!confirm("Supprimer cet élément ?")) return;
    // Optimistic update
    if (type === "folder") {
      mutate(
        { folders: folders.filter((f) => f._id !== id), files, folderPath },
        false,
      );
    } else {
      mutate(
        { folders, files: files.filter((f) => f._id !== id), folderPath },
        false,
      );
    }
    try {
      await fetch(`${RENDER_BACKEND_URL}/api/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      toast.success("Supprimé");
      refresh();
    } catch (err) {
      toast.error("Erreur de suppression");
      refresh(); // revert
    }
  };

  const handleRename = async (
    id: string,
    type: "file" | "folder",
    oldName: string,
  ) => {
    let newName = prompt("Nouveau nom :", oldName);
    if (!newName || newName === oldName) return;

    if (type === "file") {
      const lastDotIndex = oldName.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        const extension = oldName.substring(lastDotIndex);
        if (!newName.toLowerCase().endsWith(extension.toLowerCase())) {
          newName += extension;
        }
      }
    }

    try {
      await fetch(`${RENDER_BACKEND_URL}/api/items/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, newName }),
      });
      refresh();
      toast.success("Renommé avec succès");
    } catch (err) {
      toast.error("Erreur de renommage");
    }
  };

  const handleDownload = (fileId: string) => {
    const url = `${RENDER_BACKEND_URL}/api/download/${fileId}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadFolder = (folderId: string) => {
    const url = `${RENDER_BACKEND_URL}/api/folders/${folderId}/download`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("spaceId", spaceId);
      formData.append("ownerId", userId);
      formData.append("folderId", folderId || "null");
      formData.append("file", file);

      try {
        const res = await fetch(`${RENDER_BACKEND_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          toast.success(`${file.name} uploadé !`);
          successCount++;
        } else {
          toast.error(`Erreur pour ${file.name}`);
        }
      } catch (err) {
        toast.error(`Erreur pour ${file.name}`);
      }
    }
    setUploading(false);
    if (successCount > 0) {
      refresh();
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const folderCache = new Map<string, string | null>();

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      // webkitRelativePath = "FolderName/sub/file.txt"
      const relativePath = (file as any).webkitRelativePath || file.name;
      const parts = relativePath.split("/");
      const dirSegments = parts.slice(0, -1); // strip filename

      let targetFolderId: string | null = folderId;

      if (dirSegments.length > 0) {
        const cacheKey = dirSegments.join("/");
        if (folderCache.has(cacheKey)) {
          targetFolderId = folderCache.get(cacheKey)!;
        } else {
          const newId = await ensureFolderPath(
            dirSegments,
            spaceId,
            userId,
            folderId,
          );
          folderCache.set(cacheKey, newId);
          targetFolderId = newId;
        }
      }

      const formData = new FormData();
      formData.append("spaceId", spaceId);
      formData.append("ownerId", userId);
      formData.append("folderId", targetFolderId || "null");
      formData.append("file", file);

      try {
        const res = await fetch(`${RENDER_BACKEND_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          successCount++;
          toast.success(`${file.name} uploadé !`);
        } else toast.error(`Erreur pour ${file.name}`);
      } catch {
        toast.error(`Erreur pour ${file.name}`);
      }
    }

    setUploading(false);
    if (successCount > 0) refresh();
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFolderUpload}
        {...({
          webkitdirectory: "",
        } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
          <Link
            href="/main"
            className="p-3 shrink-0 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 hover:border-orange-500/50 transition-all"
          >
            <InteractiveIconWrapper>
              <ArrowLeft className="w-5 h-5" />
            </InteractiveIconWrapper>
          </Link>

          {/* Breadcrumb trail */}
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            {/* Space root */}
            <Link
              href={`/space/${spaceId}`}
              className={`text-sm font-serif italic truncate transition-colors ${
                folderPath.length === 0
                  ? "text-white pointer-events-none"
                  : "text-[#A0A0A0] hover:text-orange-400"
              }`}
            >
              {name}
            </Link>

            {/* Intermediate folders */}
            {folderPath.map((crumb, i) => {
              const isLast = i === folderPath.length - 1;
              // Build URL: each ancestor is the folderId to navigate to
              const href = `/space/${spaceId}?folderId=${crumb.id}`;
              return (
                <span
                  key={crumb.id}
                  className="flex items-center gap-1 min-w-0"
                >
                  <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                  {isLast ? (
                    <span className="text-sm font-bold text-white truncate max-w-[180px]">
                      {crumb.name}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="text-sm font-medium text-[#A0A0A0] hover:text-orange-400 transition-colors truncate max-w-[120px]"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-md hidden xl:block">
          <div className="relative group">
            <AnimatedSearchLoupe className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0503]/50 backdrop-blur-md border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white placeholder-[#A0A0A0] focus:outline-none focus:border-orange-500 focus:bg-[#0A0503] focus:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all hover:border-white/20"
            />
          </div>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden xl:flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-xs font-bold hover:scale-105 transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <InteractiveIconWrapper>
                <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-1" />
              </InteractiveIconWrapper>
            )}
            {uploading ? "..." : "Fichiers"}
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading}
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-[#0A0503]/50 backdrop-blur-md border border-orange-500/20 text-orange-400 rounded-full text-xs font-bold hover:border-orange-500/60 hover:bg-orange-500/10 transition-all disabled:opacity-50"
          >
            <InteractiveIconWrapper>
              <FolderOpen className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            </InteractiveIconWrapper>
            Dossier entier
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0A0503]/50 backdrop-blur-md border border-white/10 text-white rounded-full text-xs font-bold hover:border-orange-500/50 hover:bg-white/5 transition-all"
          >
            <InteractiveIconWrapper>
              <Plus className="w-4 h-4" />
            </InteractiveIconWrapper>{" "}
            Dossier
          </button>
        </div>

        {/* Mobile Dropdown Button */}
        <div className="xl:hidden relative">
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-xs font-bold hover:scale-105 transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus
                className={`w-4 h-4 transition-transform ${isAddMenuOpen ? "rotate-45" : ""}`}
              />
            )}
            Ajouter
          </button>
          <AnimatePresence>
            {isAddMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[#0A0503]/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)] border border-white/5 flex flex-col overflow-hidden py-1 z-50 text-left"
              >
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsAddMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                >
                  <Upload className="w-4 h-4" /> Fichiers
                </button>
                <button
                  onClick={() => {
                    folderInputRef.current?.click();
                    setIsAddMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                >
                  <FolderOpen className="w-4 h-4" /> Dossier entier
                </button>
                <div className="h-px w-full bg-white/5 my-1" />
                <button
                  onClick={() => {
                    setIsModalOpen(true);
                    setIsAddMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                >
                  <Plus className="w-4 h-4" /> Nouveau Dossier
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Space Explorer Grid */}
      <motion.div
        layout
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Folders */}
        {folders
          .filter((f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((folder) => (
            <motion.div
              key={folder._id.toString()}
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
              whileHover={{ y: -4 }}
              onClick={() => handleFolderClick(folder._id)}
              className="minimalist-card flex flex-col justify-center group relative p-5 md:col-span-2 lg:col-span-2 h-auto"
            >
              <FolderTab />
              <div className="flex-1 min-w-0 relative z-10 w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-orange-500 group-hover:border-orange-500 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all">
                    <InteractiveIconWrapper>
                      {folder.isUploaded ? (
                        <UploadCloud className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100" />
                      ) : (
                        <Folder className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100" />
                      )}
                    </InteractiveIconWrapper>
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-lg font-bold text-white group-hover:text-orange-500 group-hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all truncate pb-0.5">
                      {folder.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {folder.isUploaded && (
                        <>
                          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest bg-orange-500/10 px-1.5 rounded-sm">
                            Uploadé
                          </span>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                        </>
                      )}
                      <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </p>
                      {folder.isFavorite && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <InteractiveIconWrapper>
                            <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                          </InteractiveIconWrapper>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={`absolute top-1/2 -translate-y-1/2 right-4 ${openDropdownId === folder._id ? "z-50" : "z-20"}`}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenDropdownId(
                      openDropdownId === folder._id ? null : folder._id,
                    );
                  }}
                  className={`p-2.5 rounded-full hover:bg-white/10 transition-colors bg-[#0A0503]/50 backdrop-blur-xl border border-white/5 ${openDropdownId === folder._id ? "opacity-100 bg-white/20 text-white" : "opacity-100 text-[#A0A0A0] hover:text-white"}`}
                >
                  <InteractiveIconWrapper>
                    <MoreHorizontal className="w-5 h-5" />
                  </InteractiveIconWrapper>
                </button>

                <AnimatePresence>
                  {openDropdownId === folder._id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-[#0A0503]/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)] border border-white/5 flex flex-col overflow-hidden py-1 z-50 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(folder._id, "folder");
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                      >
                        <InteractiveIconWrapper>
                          <Star
                            className={`w-4 h-4 ${folder.isFavorite ? "fill-orange-500 text-orange-500" : ""}`}
                          />
                        </InteractiveIconWrapper>{" "}
                        {folder.isFavorite ? "Retirer" : "Favori"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFolder(folder._id);
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                      >
                        <InteractiveIconWrapper>
                          <Download className="w-4 h-4" />
                        </InteractiveIconWrapper>{" "}
                        Télécharger (.zip)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(folder._id, "folder", folder.name);
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                      >
                        <InteractiveIconWrapper>
                          <Edit3 className="w-4 h-4" />
                        </InteractiveIconWrapper>{" "}
                        Renommer
                      </button>
                      <div className="h-px w-full bg-white/5 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(folder._id, "folder");
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm text-[#A0A0A0]"
                      >
                        <InteractiveIconWrapper>
                          <Trash2 className="w-4 h-4" />
                        </InteractiveIconWrapper>{" "}
                        Supprimer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

        {/* Files */}
        {files
          .filter((f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((file) => (
            <motion.div
              key={file._id.toString()}
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
              whileHover={{ y: -4 }}
              onClick={() => handleFileClick(file)}
              className="minimalist-card flex flex-col gap-2 group relative h-full p-8"
            >
              <FileCorner />
              <div className="min-w-0 pr-8 relative z-10">
                <h3 className="text-base font-sans font-bold truncate text-white group-hover:text-orange-500 group-hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all">
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <p className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-widest">
                    {file.type?.split("/")[1] || "FILE"}
                  </p>
                  {file.isFavorite && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <Star className="w-3 h-3 text-orange-500 fill-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                    </>
                  )}
                </div>
              </div>
              <div
                className={`absolute top-3 right-3 ${openDropdownId === file._id ? "z-50" : "z-20"}`}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenDropdownId(
                      openDropdownId === file._id ? null : file._id,
                    );
                  }}
                  className={`p-2.5 rounded-full hover:bg-white/10 transition-colors bg-[#0A0503]/50 backdrop-blur-xl border border-white/5 ${openDropdownId === file._id ? "opacity-100 bg-white/20 text-white" : "opacity-100 text-[#A0A0A0] hover:text-white"}`}
                >
                  <InteractiveIconWrapper>
                    <MoreHorizontal className="w-5 h-5" />
                  </InteractiveIconWrapper>
                </button>

                <AnimatePresence>
                  {openDropdownId === file._id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-[#0A0503]/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)] border border-white/5 flex flex-col overflow-hidden py-1 z-50 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(file._id, "file");
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                      >
                        <InteractiveIconWrapper>
                          <Star
                            className={`w-4 h-4 ${file.isFavorite ? "fill-orange-500 text-orange-500" : ""}`}
                          />
                        </InteractiveIconWrapper>{" "}
                        {file.isFavorite ? "Retirer" : "Favori"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file._id);
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                      >
                        <InteractiveIconWrapper>
                          <Download className="w-4 h-4" />
                        </InteractiveIconWrapper>{" "}
                        Télécharger
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(file._id, "file", file.name);
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[#A0A0A0] hover:text-white"
                      >
                        <InteractiveIconWrapper>
                          <Edit3 className="w-4 h-4" />
                        </InteractiveIconWrapper>{" "}
                        Renommer
                      </button>
                      <div className="h-px w-full bg-white/5 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file._id, "file");
                          setOpenDropdownId(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm text-[#A0A0A0]"
                      >
                        <InteractiveIconWrapper>
                          <Trash2 className="w-4 h-4" />
                        </InteractiveIconWrapper>{" "}
                        Supprimer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
      </motion.div>

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center gap-8 text-center bg-[#0A0503]/40 backdrop-blur-xl rounded-[3rem] border border-white/5">
          <AnimatedEmptyState type="folder" />
          <div>
            <h2 className="text-2xl font-serif italic text-white">
              Cet espace est vide
            </h2>
            <p className="text-[#A0A0A0] text-sm mt-2 max-w-sm mx-auto">
              Commencez par créer un dossier ou uploader des fichiers.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_20px_rgba(249,115,22,0.3)] text-white rounded-full font-bold hover:scale-105 transition-all outline-none"
            >
              <InteractiveIconWrapper>
                <Upload className="w-4 h-4" />
              </InteractiveIconWrapper>{" "}
              Fichiers
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="flex items-center gap-2 px-8 py-4 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-full font-bold hover:scale-105 hover:bg-orange-500/20 transition-all outline-none"
            >
              <InteractiveIconWrapper>
                <FolderOpen className="w-4 h-4" />
              </InteractiveIconWrapper>{" "}
              Dossier entier
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-8 py-3 bg-white border border-[#E5E5E5] text-black rounded-full text-xs font-bold hover:border-black transition-all"
            >
              <InteractiveIconWrapper>
                <Plus className="w-4 h-4" />
              </InteractiveIconWrapper>{" "}
              Nouveau Dossier
            </button>
          </div>
        </div>
      )}

      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="folder"
        userId={userId}
        spaceId={spaceId}
        folderId={folderId}
      />

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A0A0B]/90 backdrop-blur-xl"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                    <File className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white tracking-tight">
                      {selectedFile.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                      {selectedFile.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(selectedFile._id)}
                    className="p-3 text-slate-400 hover:text-white transition-colors glass rounded-xl"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-3 text-slate-400 hover:text-red-400 transition-colors glass rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden">
                {selectedFile.type.startsWith("image/") ? (
                  <img
                    src={`${RENDER_BACKEND_URL}/api/file/${selectedFile._id}`}
                    alt={selectedFile.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : selectedFile.type === "application/pdf" ? (
                  <iframe
                    src={`${RENDER_BACKEND_URL}/api/file/${selectedFile._id}`}
                    className="w-full h-full border-none"
                  />
                ) : selectedFile.type.startsWith("video/") ? (
                  <video
                    src={`${RENDER_BACKEND_URL}/api/file/${selectedFile._id}`}
                    controls
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-20 px-10 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-700">
                      <File className="w-12 h-12" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">
                        Aperçu non disponible
                      </p>
                      <p className="text-slate-500 text-sm mt-1 mb-8">
                        Ce type de fichier ne peut pas être lu directement ici.
                      </p>
                      <button
                        onClick={() => handleDownload(selectedFile._id)}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold flex items-center gap-3 transition-all"
                      >
                        <Download className="w-5 h-5" /> Télécharger pour voir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
