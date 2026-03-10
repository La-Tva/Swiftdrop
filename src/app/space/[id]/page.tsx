import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCollections } from "@/lib/db";
import { ObjectId } from "mongodb";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getSpaceContents, getFolderPath } from "@/lib/services";
import { SpaceClient } from "./SpaceClient";

export default async function SpacePage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ folderId?: string }>
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [{ id }, { folderId }] = await Promise.all([params, searchParams]);
  
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    redirect("/main");
  }

  const { spaces } = await getCollections();
  
  const space = await spaces.findOne({ _id: new ObjectId(id) });
  if (!space) redirect("/main");

  const userId = session.user?.id as string;
  const [contents, folderPath] = await Promise.all([
    getSpaceContents(id, folderId || null),
    getFolderPath(folderId || null),
  ]);

  return (
    <DashboardLayout 
      userId={userId} 
      spaceId={id} 
      folderId={folderId}
      userName={session.user?.name || ""}
      userEmail={session.user?.email || ""}
    >
      <SpaceClient 
        userId={userId} 
        spaceId={id} 
        folderId={folderId || null}
        name={space.name} 
        isGlobal={!!space.isGlobal}
        folders={contents.folders}
        files={contents.files}
        folderPath={folderPath}
      />
    </DashboardLayout>
  );
}

