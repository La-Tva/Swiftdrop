import { getCollections } from "./db";
import { ObjectId } from "mongodb";

function isValidObjectId(id: string | null | undefined): boolean {
    if (!id) return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
}

async function ensureGlobalSpace() {
    const { spaces } = await getCollections();
    let globalSpace = await spaces.findOne({ isGlobal: true });
    if (!globalSpace) {
        const result = await spaces.insertOne({
            name: "Espace Commun",
            isGlobal: true,
            ownerId: null,
            sharedWith: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        globalSpace = { _id: result.insertedId, name: "Espace Commun", isGlobal: true } as any;
    }
    return globalSpace;
}

export async function getUserSpaces(userId: string) {
    const { spaces } = await getCollections();
    await ensureGlobalSpace();

    if (!isValidObjectId(userId)) return await spaces.find({ isGlobal: true }).toArray();

    return await spaces.find({
        $or: [
            { isGlobal: true },
            { ownerId: new ObjectId(userId) },
            { sharedWith: userId }
        ]
    }).toArray();
}

export async function getRecentFiles(userId: string, limit = 10) {
    const { files, spaces } = await getCollections();

    const query = !isValidObjectId(userId)
        ? { isGlobal: true }
        : {
            $or: [
                { isGlobal: true },
                { ownerId: new ObjectId(userId) },
                { sharedWith: userId }
            ]
        };

    // Find all spaces the user has access to
    const userSpaces = await spaces.find(query).project({ _id: 1 }).toArray();

    const spaceIds = userSpaces.map(s => s._id);

    const recentFiles = await files.find({
        spaceId: { $in: spaceIds }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    return JSON.parse(JSON.stringify(recentFiles));
}

export async function getSpaceContents(spaceId: string, folderId: string | null = null) {
    const { folders, files } = await getCollections();

    if (!isValidObjectId(spaceId)) return { folders: [], files: [] };

    const parentId = isValidObjectId(folderId) ? new ObjectId(folderId!) : null;

    const [spaceFolders, spaceFiles] = await Promise.all([
        folders.find({ spaceId: new ObjectId(spaceId), parentId }).toArray(),
        files.find({ spaceId: new ObjectId(spaceId), folderId: parentId }).toArray()
    ]);

    return {
        folders: JSON.parse(JSON.stringify(spaceFolders)),
        files: JSON.parse(JSON.stringify(spaceFiles))
    };
}

export async function getDashboardStats(userId: string) {
    const { spaces, files, folders } = await getCollections();
    await ensureGlobalSpace();

    if (!isValidObjectId(userId)) {
        return {
            spacesTotal: await spaces.countDocuments({ isGlobal: true }),
            sharedTotal: 0,
            favoritesTotal: 0
        };
    }

    const [userSpacesCount, sharedSpacesCount, favoriteFilesCount, favoriteFoldersCount, totalSizeResult] = await Promise.all([
        spaces.countDocuments({ ownerId: new ObjectId(userId) }),
        spaces.countDocuments({ sharedWith: userId }),
        files.countDocuments({ ownerId: new ObjectId(userId), isFavorite: true }),
        folders.countDocuments({ ownerId: new ObjectId(userId), isFavorite: true }),
        files.aggregate([
            { $match: { ownerId: new ObjectId(userId) } },
            { $group: { _id: null, totalSize: { $sum: "$size" } } }
        ]).toArray()
    ]);

    const storageUsed = totalSizeResult[0]?.totalSize || 0;
    const globalSpacesCount = await spaces.countDocuments({ isGlobal: true });

    return {
        spacesTotal: userSpacesCount + globalSpacesCount,
        sharedTotal: sharedSpacesCount,
        favoritesTotal: favoriteFilesCount + favoriteFoldersCount,
        storageUsed
    };
}

export async function createSpace(userId: string, name: string) {
    const { spaces, users } = await getCollections();

    const result = await spaces.insertOne({
        name,
        ownerId: new ObjectId(userId),
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // Link space to user
    await users.updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { spaceIds: result.insertedId } }
    );

    return result.insertedId;
}

/** Returns the breadcrumb trail from root to the given folderId: [{id, name}, ...] */
export async function getFolderPath(folderId: string | null): Promise<{ id: string; name: string }[]> {
    if (!folderId || !isValidObjectId(folderId)) return [];
    const { folders } = await getCollections();

    const trail: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;

    // Walk up the parentId chain (max 20 depth to avoid infinite loops)
    for (let i = 0; i < 20 && currentId; i++) {
        const folder: { _id: any; name: string; parentId?: any } | null = await folders.findOne({ _id: new ObjectId(currentId) }) as any;
        if (!folder) break;
        trail.unshift({ id: folder._id.toString(), name: folder.name });
        currentId = folder.parentId ? folder.parentId.toString() : null;
    }

    return trail;
}

