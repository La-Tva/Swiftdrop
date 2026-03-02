import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCollections } from "@/lib/db";
import { ObjectId } from "mongodb";
import { triggerSpaceEvent } from "@/lib/pusher-server";
import { uploadToBlob } from "@/lib/blob";
import { serializeFile } from "@/types/models";
import { nanoid } from "nanoid";

// POST /api/upload
// Receives the file as multipart FormData, uploads to Vercel Blob, saves to DB, triggers Pusher
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const spaceId = formData.get("spaceId") as string | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file || !spaceId) {
        return NextResponse.json({ error: "Missing file or spaceId" }, { status: 400 });
    }

    const { spaces, files, users } = await getCollections();
    const spaceObjId = new ObjectId(spaceId);
    const userId = new ObjectId(session.user.id);

    const space = await spaces.findOne({ _id: spaceObjId });
    if (!space || !space.userIds.some((id) => id.equals(userId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upload to Vercel Blob
    const ext = file.name.split(".").pop();
    const key = `${spaceId}/${session.user.id}/${nanoid()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const url = await uploadToBlob(key, Buffer.from(arrayBuffer), file.type);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const fileDoc = {
        _id: new ObjectId(),
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        key,
        isEphemeral: true,
        expiresAt,
        ownerId: userId,
        spaceId: spaceObjId,
        folderId: folderId ? new ObjectId(folderId) : null,
        createdAt: new Date(),
    };

    await files.insertOne(fileDoc);

    const owner = await users.findOne({ _id: userId }, { projection: { name: 1, image: 1 } });
    const serialized = serializeFile(fileDoc, {
        id: session.user.id,
        name: owner?.name ?? null,
        image: owner?.image ?? null,
    });

    await triggerSpaceEvent(spaceId, "file:uploaded", serialized);
    return NextResponse.json(serialized, { status: 201 });
}
