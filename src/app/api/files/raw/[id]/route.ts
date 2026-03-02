import { NextRequest, NextResponse } from "next/server";
import { getGridFSBucket } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const bucket = await getGridFSBucket();

        // Check if file exists
        const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
        if (!files.length) {
            return new NextResponse("File not found", { status: 404 });
        }

        const file = files[0];

        // Create a stream from GridFS
        const downloadStream = bucket.openDownloadStream(new ObjectId(id));

        // Convert Node.js stream to Web Stream for Next.js response
        const webStream = new ReadableStream({
            start(controller) {
                downloadStream.on("data", (chunk) => controller.enqueue(chunk));
                downloadStream.on("end", () => controller.close());
                downloadStream.on("error", (err) => controller.error(err));
            },
            cancel() {
                downloadStream.destroy();
            }
        });

        return new NextResponse(webStream, {
            headers: {
                "Content-Type": file.contentType || "application/octet-stream",
                "Content-Length": file.length.toString(),
                "Content-Disposition": `inline; filename="${file.filename}"`,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (err) {
        console.error("Download error:", err);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
