const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { MongoClient, ObjectId, GridFSBucket } = require("mongodb");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const path = require("path");
const dotenv = require("dotenv");
const archiver = require("archiver");
const { getLinkPreview } = require("link-preview-js");

dotenv.config();

const app = express();

// Enhanced CORS for production
const allowedOrigins = [
  "https://swiftdrop-app.vercel.app",
  "https://swiftdrop.vercel.app",
  "http://localhost:3000",
  "http://localhost:4000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Still allow to unblock
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// Explicitly handle all preflight and socket.io requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".vercel.app"))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type, Authorization",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Permissions-Policy", "browsing-topics=()");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  if (req.url !== "/health") {
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin}`,
    );
  }
  next();
});

app.use(express.json());

// Health check and root
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.send("SwiftDrop Backend Engine Running"));

const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Global process error handlers to prevent crash
process.on("uncaughtException", (err) => {
  console.error("CRITICAL: Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "CRITICAL: Unhandled Rejection at:",
    promise,
    "reason:",
    reason,
  );
});

if (!MONGODB_URI) {
  console.error("FATAL: DATABASE_URL env var is not set!");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
let db, bucket;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("swiftdrop");
    bucket = new GridFSBucket(db, { bucketName: "uploads" });
    console.log("Connected to MongoDB & GridFS initialized");
    console.log("TARGET DATABASE:", db.databaseName);

    // Diagnostic: List collections
    const collections = await db.listCollections().toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name),
    );

    // Seed Global Space
    const spaces = db.collection("spaces");
    let globalSpace = await spaces.findOne({ isGlobal: true });
    if (!globalSpace) {
      const result = await spaces.insertOne({
        name: "Espace Commun",
        isGlobal: true,
        ownerId: null,
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      globalSpace = { _id: result.insertedId };
      console.log("Global Space seeded");
    }
    global.GLOBAL_SPACE_ID = globalSpace._id.toString();
    console.log("Global Space ID:", global.GLOBAL_SPACE_ID);
  } catch (error) {
    console.error("Connection/Seeding error:", error);
  }
}

connectDB().catch(console.error);

// Memory Storage - Much more stable for local/small deployments
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// API Endpoints
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      console.error("UPLOAD ERROR: No file attached. req.body:", req.body);
      return res.status(400).json({ error: "No file received" });
    }

    const { spaceId, ownerId, folderId } = req.body;
    console.log(`UPLOAD START: ${file.originalname} (${file.size} bytes)`);
    console.log(
      `METADATA: spaceId=${spaceId}, ownerId=${ownerId}, folderId=${folderId}`,
    );

    // Create a GridFS upload stream manually
    const filename = `${Date.now()}-${file.originalname}`;
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        spaceId: spaceId || null,
        ownerId: ownerId || null,
        folderId: folderId || null,
        originalName: file.originalname,
        contentType: file.mimetype,
      },
    });

    // Write buffer to GridFS
    uploadStream.end(file.buffer);

    // Wait for the upload to finish
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", (err) => {
        console.error("GRIDFS STREAM ERROR:", err);
        reject(err);
      });
    });

    console.log(
      `GRIDFS OK: File stored as ${filename} (ID: ${uploadStream.id})`,
    );

    const filesCollection = db.collection("files");
    const newFile = {
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      storageId: uploadStream.id,
      spaceId:
        spaceId && /^[0-9a-fA-F]{24}$/.test(spaceId)
          ? new ObjectId(spaceId)
          : null,
      folderId:
        folderId && folderId !== "null" && /^[0-9a-fA-F]{24}$/.test(folderId)
          ? new ObjectId(folderId)
          : null,
      ownerId:
        ownerId && /^[0-9a-fA-F]{24}$/.test(ownerId)
          ? new ObjectId(ownerId)
          : null,
      createdAt: new Date(),
    };

    const result = await filesCollection.insertOne(newFile);
    console.log(
      `DB OK: Record created with ID: ${result.insertedId} in 'files' collection`,
    );

    const user = ownerId ? await db.collection("users").findOne({ _id: new ObjectId(ownerId) }) : null;

    io.emit("file_uploaded", {
      spaceId,
      fileName: newFile.name,
      ownerId,
      senderName: user?.name || "Un utilisateur",
      isGlobal: spaceId === global.GLOBAL_SPACE_ID
    });

    res
      .status(200)
      .json({ success: true, file: { ...newFile, _id: result.insertedId } });
  } catch (error) {
    console.error("UPLOAD CRITICAL ERROR:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Upload process failed check server logs" });
    }
  }
});

app.get("/api/file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(fileId))
      return res.status(400).send("Invalid file ID");

    const filesCollection = db.collection("files");
    const fileRecord = await filesCollection.findOne({
      _id: new ObjectId(fileId),
    });

    if (!fileRecord) return res.status(404).send("File not found");

    const downloadStream = bucket.openDownloadStream(fileRecord.storageId);

    res.set({
      "Content-Type": fileRecord.type,
      "Content-Disposition": "inline",
      "Content-Length": fileRecord.size,
    });

    downloadStream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) res.status(500).send("Stream error");
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("View error:", error);
    res.status(500).send("View failed");
  }
});

app.get("/api/download/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(fileId))
      return res.status(400).send("Invalid file ID");

    const filesCollection = db.collection("files");
    const fileRecord = await filesCollection.findOne({
      _id: new ObjectId(fileId),
    });

    if (!fileRecord) return res.status(404).send("File not found");

    const downloadStream = bucket.openDownloadStream(fileRecord.storageId);

    res.set({
      "Content-Type": fileRecord.type,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileRecord.name)}"`,
      "Content-Length": fileRecord.size,
    });

    downloadStream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) res.status(500).send("Stream error");
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Download failed");
  }
});

// Space & Folder management
app.post("/api/spaces", async (req, res) => {
  try {
    const { name, ownerId } = req.body;
    const spaces = db.collection("spaces");
    const result = await spaces.insertOne({
      name,
      ownerId: ownerId ? new ObjectId(ownerId) : null,
      sharedWith: [],
      createdAt: new Date(),
    });
    io.emit("space_created", { ownerId, name });
    res.status(201).json({ id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/folders", async (req, res) => {
  try {
    const { name, spaceId, parentId, ownerId, isUploaded } = req.body;
    const folders = db.collection("folders");
    const result = await folders.insertOne({
      name,
      spaceId: spaceId ? new ObjectId(spaceId) : null,
      parentId: parentId && parentId !== "null" ? new ObjectId(parentId) : null,
      ownerId: ownerId ? new ObjectId(ownerId) : null,
      isUploaded: !!isUploaded,
      createdAt: new Date(),
    });
    const user = ownerId ? await db.collection("users").findOne({ _id: new ObjectId(ownerId) }) : null;
    io.emit("folder_created", { 
      spaceId, 
      name, 
      ownerId,
      senderName: user?.name || "Un utilisateur",
      isGlobal: spaceId === global.GLOBAL_SPACE_ID
    });
    res.status(201).json({ id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/items/rename", async (req, res) => {
  try {
    const { id, type, newName } = req.body;
    const collection =
      type === "folder" ? db.collection("folders") : db.collection("files");
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: newName } },
    );

    // Get spaceId to help frontend filtering if possible, but generic emit is safer
    const item = await collection.findOne({ _id: new ObjectId(id) });
    io.emit("item_renamed", { id, newName, spaceId: item?.spaceId });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/items", async (req, res) => {
  try {
    const { id, type, userId } = req.body;
    const user = userId ? await db.collection("users").findOne({ _id: new ObjectId(userId) }) : null;
    const senderName = user?.name || "Un utilisateur";

    if (type === "space") {
      const spaceId = new ObjectId(id);
      const filesCollection = db.collection("files");
      const filesInSpace = await filesCollection.find({ spaceId }).toArray();
      for (const file of filesInSpace) {
        try {
          await bucket.delete(file.storageId);
        } catch (e) {}
        await filesCollection.deleteOne({ _id: file._id });
      }
      const space = await db.collection("spaces").findOne({ _id: spaceId });
      const spaceName = space?.name || "Espace";
      const isGlobal = space?.isGlobal || false;

      await db.collection("folders").deleteMany({ spaceId });
      await db.collection("spaces").deleteOne({ _id: spaceId });
      
      io.emit("space_deleted", { 
        spaceId: id, 
        name: spaceName,
        senderName,
        isGlobal
      });
    } else if (type === "folder") {
      const folderData = await db
        .collection("folders")
        .findOne({ _id: new ObjectId(id) });
      const spaceId = folderData?.spaceId;
      const folderName = folderData?.name || "un dossier";
      const isGlobal = spaceId?.toString() === global.GLOBAL_SPACE_ID;

      // Recursively delete all nested files and sub-folders
      async function deleteFolderRecursive(fId) {
        const foldersCollection = db.collection("folders");
        const filesCollection = db.collection("files");

        // Delete all files inside this folder
        const filesInFolder = await filesCollection
          .find({ folderId: new ObjectId(fId) })
          .toArray();
        for (const file of filesInFolder) {
          try {
            await bucket.delete(file.storageId);
          } catch (e) {}
          await filesCollection.deleteOne({ _id: file._id });
        }

        // Recurse into sub-folders
        const subFolders = await foldersCollection
          .find({ parentId: new ObjectId(fId) })
          .toArray();
        for (const sub of subFolders) {
          await deleteFolderRecursive(sub._id.toString());
        }

        // Delete the folder itself
        await foldersCollection.deleteOne({ _id: new ObjectId(fId) });
      }

      await deleteFolderRecursive(id);
      io.emit("item_deleted", { 
        id, 
        type, 
        spaceId, 
        name: folderName,
        senderName,
        isGlobal
      });
    } else {
      const filesCollection = db.collection("files");
      const file = await filesCollection.findOne({ _id: new ObjectId(id) });
      if (file) {
        const spaceId = file.spaceId;
        const fileName = file.name;
        const isGlobal = spaceId?.toString() === global.GLOBAL_SPACE_ID;

        try {
          await bucket.delete(file.storageId);
        } catch (e) {}
        await filesCollection.deleteOne({ _id: new ObjectId(id) });
        io.emit("item_deleted", { 
          id, 
          type, 
          spaceId,
          name: fileName,
          senderName,
          isGlobal
        });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/storage/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.json({ totalBytes: 0 });
    }
    const result = await db
      .collection("files")
      .aggregate([
        { $match: { ownerId: new ObjectId(userId) } },
        { $group: { _id: null, totalBytes: { $sum: "$size" } } },
      ])
      .toArray();
    res.json({ totalBytes: result[0]?.totalBytes || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/favorites/toggle", async (req, res) => {
  try {
    const { id, type } = req.body;
    const collection =
      type === "folder" ? db.collection("folders") : db.collection("files");
    const item = await collection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).json({ error: "Not found" });
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isFavorite: !item.isFavorite } },
    );

    io.emit("item_updated", { id, type, spaceId: item.spaceId });

    res.json({ success: true, isFavorite: !item.isFavorite });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Recursive ZIP download for a folder
app.get("/api/folders/:folderId/download", async (req, res) => {
  try {
    const { folderId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(folderId)) {
      return res.status(400).json({ error: "Invalid folder ID" });
    }

    const foldersCollection = db.collection("folders");
    const filesCollection = db.collection("files");

    // Get root folder name
    const rootFolder = await foldersCollection.findOne({
      _id: new ObjectId(folderId),
    });
    if (!rootFolder) return res.status(404).json({ error: "Folder not found" });

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(rootFolder.name)}.zip"`,
    });

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Archive failed" });
    });
    archive.pipe(res);

    // Recursively collect and append files
    async function appendFolder(fId, zipPath) {
      const [subFolders, files] = await Promise.all([
        foldersCollection.find({ parentId: new ObjectId(fId) }).toArray(),
        filesCollection.find({ folderId: new ObjectId(fId) }).toArray(),
      ]);

      for (const file of files) {
        try {
          const stream = bucket.openDownloadStream(file.storageId);
          archive.append(stream, { name: zipPath + file.name });
        } catch (e) {
          console.error("Stream error for file", file._id, e);
        }
      }

      for (const sub of subFolders) {
        await appendFolder(sub._id.toString(), zipPath + sub.name + "/");
      }
    }

    // Also include files directly under the root folder
    await appendFolder(folderId, rootFolder.name + "/");

    await archive.finalize();
  } catch (e) {
    console.error("ZIP download error:", e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Notes API
app.get("/api/notes", async (req, res) => {
  try {
    const { userId } = req.query;
    const query = {
      $or: [
        { isPrivate: { $ne: true } },
        { ownerId: { $in: [userId ? new ObjectId(userId) : null, userId] } },
      ],
    };

    const notes = await db
      .collection("notes")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ notes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const { ownerId, type, label, content, isPrivate } = req.body;
    if (!ownerId || !type || !label)
      return res.status(400).json({ error: "Missing required fields" });

    let preview = null;
    if (type === "link") {
      try {
        preview = await getLinkPreview(content, {
          headers: { "user-agent": "googlebot" },
          timeout: 5000,
        });
      } catch (err) {
        console.warn("Could not generate link preview for:", content);
      }
    }

    const newNote = {
      ownerId: ownerId && /^[0-9a-fA-F]{24}$/.test(ownerId) ? new ObjectId(ownerId) : ownerId,
      type,
      label,
      content,
      isPrivate: !!isPrivate,
      preview,
      createdAt: new Date(),
    };

    const result = await db.collection("notes").insertOne(newNote);
    const user = await db.collection("users").findOne({ _id: new ObjectId(ownerId) });
    
    io.emit("note_created", {
      ...newNote,
      _id: result.insertedId,
      senderName: user?.name || "Un utilisateur",
      isGlobal: !isPrivate // Shared if not private
    });

    res.json({ note: { ...newNote, _id: result.insertedId } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { label, content, type, isPrivate } = req.body;

    if (!label || !content)
      return res.status(400).json({ error: "Missing required fields" });

    let preview = undefined;
    if (type === "link") {
      try {
        preview = await getLinkPreview(content, {
          headers: { "user-agent": "googlebot" },
          timeout: 5000,
        });
      } catch (err) {
        console.warn("Could not generate link preview for:", content);
        preview = null;
      }
    }

    const updateFields = { label, content };
    if (isPrivate !== undefined) updateFields.isPrivate = !!isPrivate;
    if (preview !== undefined) updateFields.preview = preview;

    const result = await db
      .collection("notes")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: "after" },
      );

    if (!result) return res.status(404).json({ error: "Note not found" });
    res.json({ note: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    const user = userId ? await db.collection("users").findOne({ _id: new ObjectId(userId) }) : null;
    const senderName = user?.name || "Un utilisateur";

    const note = await db.collection("notes").findOne({ _id: new ObjectId(id) });
    const label = note?.label || "une note";

    await db.collection("notes").deleteOne({ _id: new ObjectId(id) });
    
    io.emit("note_deleted", { 
      id, 
      label,
      senderName,
      isGlobal: !note?.isPrivate 
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/link-preview", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });
    const preview = await getLinkPreview(url, {
      headers: { "user-agent": "googlebot" },
      timeout: 5000,
    });
    res.json({ preview });
  } catch (e) {
    res.status(500).json({ error: "Preview failed", details: e.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("EXPRESS ERROR:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simple Socket.io implementation
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_space", (spaceId) => {
    socket.join(`space_${spaceId}`);
    console.log(`Socket ${socket.id} joined space_${spaceId}`);
  });

  socket.on("leave_space", (spaceId) => {
    socket.leave(`space_${spaceId}`);
  });

  socket.on("send_message", async (data) => {
    // data: { spaceId, ownerId, ownerName, text, attachments: [] }
    try {
      const { spaceId, ownerId, ownerName, text, attachments } = data;

      let preview = null;
      // Simple URL extraction for preview if no attachments, just first URL found
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text ? text.match(urlRegex) : null;

      if (urls && urls.length > 0) {
        try {
          preview = await getLinkPreview(urls[0], {
            headers: { "user-agent": "googlebot" },
            timeout: 3000,
          });
        } catch (e) {
          /* ignore preview error */
        }
      }

      const messageDoc = {
        spaceId: spaceId === "global" ? null : new ObjectId(spaceId),
        ownerId: ownerId ? new ObjectId(ownerId) : null,
        ownerName: ownerName || "Utilisateur",
        text: text || "",
        attachments: attachments || [],
        preview: preview || null,
        createdAt: new Date(),
      };

      const result = await db.collection("messages").insertOne(messageDoc);
      messageDoc._id = result.insertedId;

      // Broadcast to everyone in the room
      io.to(`space_${spaceId}`).emit("receive_message", messageDoc);
    } catch (err) {
      console.error("Socket send_message Error:", err);
    }
  });

  socket.on("disconnect", () => console.log("Client disconnected", socket.id));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend engine running on port ${PORT}`);
});
