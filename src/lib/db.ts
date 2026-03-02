import { MongoClient, Db, GridFSBucket } from "mongodb";
import type { User, Account, SessionDoc, VerificationToken, Space, Folder, FileDoc } from "@/types/models";

const uri = process.env.DATABASE_URL ?? "mongodb://placeholder";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export { clientPromise };

export async function getDb(): Promise<Db> {
    const c = await clientPromise;
    return c.db("swiftdrop");
}

export async function getGridFSBucket() {
    const db = await getDb();
    return new GridFSBucket(db, { bucketName: "files" });
}

export async function getCollections() {
    const db = await getDb();
    return {
        users: db.collection<User>("users"),
        accounts: db.collection<Account>("accounts"),
        sessions: db.collection<SessionDoc>("sessions"),
        verificationTokens: db.collection<VerificationToken>("verification_tokens"),
        spaces: db.collection<Space>("spaces"),
        folders: db.collection<Folder>("folders"),
        files: db.collection<FileDoc>("files"),
    };
}
