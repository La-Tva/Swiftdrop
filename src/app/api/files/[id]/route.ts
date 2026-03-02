import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCollections } from "@/lib/db";
import { ObjectId } from "mongodb";
import { triggerSpaceEvent } from "@/lib/pusher-server";
import { deleteFromBlob } from "@/lib/blob";
import { serializeFile } from "@/types/models";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { files, spaces } = await getCollections();
    const fileId = new ObjectId(id);
    const file = await files.findOne({ _id: fileId });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const space = await spaces.findOne({ _id: file.spaceId });
    if (!space || !space.userIds.some((uid) => uid.equals(new ObjectId(session.user!.id!)))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.folderId !== undefined) update.folderId = body.folderId ? new ObjectId(body.folderId) : null;

    await files.updateOne({ _id: fileId }, { $set: update });
    const updated = await files.findOne({ _id: fileId });

    const serialized = serializeFile(updated!);
    await triggerSpaceEvent(file.spaceId.toString(), "file:updated", serialized);
    return NextResponse.json(serialized);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { files, spaces } = await getCollections();
    const fileId = new ObjectId(id);
    const file = await files.findOne({ _id: fileId });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const space = await spaces.findOne({ _id: file.spaceId });
    if (!space || !space.userIds.some((uid) => uid.equals(new ObjectId(session.user!.id!)))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from Vercel Blob using the URL
    await Promise.all([deleteFromBlob(file.url), files.deleteOne({ _id: fileId })]);
    await triggerSpaceEvent(file.spaceId.toString(), "file:deleted", { id });
    return NextResponse.json({ success: true });
}
