import { getUserSpaces, getRecentFiles, getDashboardStats } from "@/lib/services";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id as string;

    const [userSpaces, recentFiles, stats] = await Promise.all([
        getUserSpaces(userId),
        getRecentFiles(userId, 5),
        getDashboardStats(userId),
    ]);

    return NextResponse.json({
        userSpaces: JSON.parse(JSON.stringify(userSpaces)),
        recentFiles: JSON.parse(JSON.stringify(recentFiles)),
        stats,
    });
}
