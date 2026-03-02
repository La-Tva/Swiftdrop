import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCollections } from "@/lib/db";
import { ObjectId } from "mongodb";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Folder, File, ArrowLeft, MoreVertical, Share2, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const { spaces, folders, files } = await getCollections();
  
  const space = await spaces.findOne({ _id: new ObjectId(id) });
  if (!space) redirect("/main");

  // Fetch children
  const spaceFolders = await folders.find({ spaceId: space._id, parentId: null }).toArray();
  const spaceFiles = await files.find({ spaceId: space._id, folderId: null }).toArray();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Breadcrumbs & Navigation */}
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/main" className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-outfit">{space.name}</h1>
              <p className="text-xs text-slate-500">Espace partagé • {spaceFolders.length + spaceFiles.length} éléments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 glass glass-hover rounded-xl text-sm font-semibold text-violet-400">
              <Share2 className="w-4 h-4" /> Partager
            </button>
            <button className="p-2 glass glass-hover rounded-xl text-slate-400 hover:text-white transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {/* Space Explorer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Folders First */}
          {spaceFolders.map((folder, i) => (
            <div key={i} className="glass glass-hover p-4 rounded-2xl flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                <Folder className="w-5 h-5 fill-violet-400/20" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{folder.name}</h3>
                <p className="text-[10px] text-slate-500">Dossier</p>
              </div>
            </div>
          ))}

          {/* Files */}
          {spaceFiles.map((file, i) => (
            <div key={i} className="glass glass-hover p-4 rounded-2xl flex flex-col gap-4 group relative">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-violet-400 transition-colors">
                  <File className="w-5 h-5" />
                </div>
                <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold truncate">{file.name}</h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.type.split('/')[1]}
                </p>
              </div>
            </div>
          ))}

          {/* New Item Placeholder Card */}
          <div className="border-2 border-dashed border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-violet-400 group-hover:bg-violet-500/20 transition-all">
                <Folder className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-widest">Nouveau Dossier</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
