import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCollections, getGridFSBucket } from "@/lib/db";
import { ObjectId } from "mongodb";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const spaceId = formData.get("spaceId") as string;
        const folderId = formData.get("folderId") as string;
        const isEphemeral = formData.get("isEphemeral") === "true";
        const expiresAtStr = formData.get("expiresAt") as string;

        if (!file || !spaceId) {
            return NextResponse.json({ error: "Missing file or spaceId" }, { status: 400 });
        }

        const { files, folders } = await getCollections();
        const bucket = await getGridFSBucket();

        // Convert file to Buffer/Stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a unique filename for GridFS
        const fileId = new ObjectId();

        // Upload to GridFS
        const uploadStream = bucket.openUploadStreamWithId(fileId, file.name, {
            contentType: file.type,
            metadata: {
                userId: session.user.id,
                spaceId
            }
        });

        await new Promise((resolve, reject) => {
            uploadStream.on("error", reject);
            uploadStream.on("finish", () => resolve(true));
            uploadStream.end(buffer);
        });

        // Create file record in our files collection for tracking
        const newFile: any = {
            _id: new ObjectId(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: `/api/files/raw/${fileId.toString()}`,
            key: fileId.toString(), // We use the GridFS ID as the key
            spaceId: new ObjectId(spaceId),
            folderId: folderId ? new ObjectId(folderId) : null,
            ownerId: new ObjectId(session.user.id),
            isEphemeral,
            expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
            createdAt: new Date(),
        };

        await files.insertOne(newFile);

        // If in a folder, increment file count
        if (folderId) {
            await folders.updateOne(
                { _id: new ObjectId(folderId) },
                { $inc: { fileCount: 1 } }
            );
        }

        // Broadcast update via Pusher
        const pusherFile = {
            id: newFile._id.toString(),
            name: newFile.name,
            type: newFile.type,
            size: newFile.size,
            url: newFile.url,
            spaceId: newFile.spaceId.toString(),
            folderId: newFile.folderId?.toString() ?? null,
            createdAt: newFile.createdAt,
            expiresAt: newFile.expiresAt,
        };

        await pusherServer.trigger(`space-${spaceId}`, "file:uploaded", pusherFile);

        return NextResponse.json(pusherFile);
    } catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
