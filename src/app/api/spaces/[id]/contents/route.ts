import { getSpaceContents, getFolderPath } from "@/lib/services";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const folderId = req.nextUrl.searchParams.get("folderId") || null;

    const [contents, folderPath] = await Promise.all([
        getSpaceContents(id, folderId),
        getFolderPath(folderId),
    ]);

    return NextResponse.json({ ...contents, folderPath });
}
