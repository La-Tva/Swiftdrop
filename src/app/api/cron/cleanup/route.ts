import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db";
import { deleteFileFromR2 } from "@/lib/r2";

export async function GET(req: NextRequest) {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { files } = await getCollections();
    const expired = await files.find({
        isEphemeral: true,
        expiresAt: { $lt: new Date() },
    }).toArray();

    if (expired.length === 0) return NextResponse.json({ deleted: 0 });

    // Delete from Cloudflare R2 using the stored key
    await Promise.allSettled(expired.map((f) => deleteFileFromR2(f.key)));
    await files.deleteMany({ _id: { $in: expired.map((f) => f._id) } });

    console.log(`[CRON] Deleted ${expired.length} expired files from R2`);
    return NextResponse.json({ deleted: expired.length });
}
