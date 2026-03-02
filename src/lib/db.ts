import { MongoClient, Db } from "mongodb";

const uri = process.env.DATABASE_URL!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db("swiftdrop");
}

export async function getCollections() {
    const db = await getDb();
    return {
        users: db.collection("users"),
        spaces: db.collection("spaces"),
        files: db.collection("files"),
        folders: db.collection("folders"),
    };
}
