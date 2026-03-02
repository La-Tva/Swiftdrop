import { NextRequest, NextResponse } from "next/server";
import { getCollections, getGridFSBucket } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { files } = await getCollections();
    const bucket = await getGridFSBucket();

    const expired = await files.find({
        isEphemeral: true,
        expiresAt: { $lt: new Date() },
    }).toArray();

    if (expired.length === 0) return NextResponse.json({ deleted: 0 });

    // Delete from MongoDB GridFS using the stored key
    for (const file of expired) {
        if (file.key) {
            try {
                await bucket.delete(new ObjectId(file.key));
            } catch (err) {
                console.error("GridFS cleanup error:", err);
            }
        }
    }

    await files.deleteMany({ _id: { $in: expired.map((f) => f._id) } });

    console.log(`[CRON] Deleted ${expired.length} expired files from GridFS`);
    return NextResponse.json({ deleted: expired.length });
}
