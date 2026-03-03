const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enhanced CORS for production
const allowedOrigins = [
  'https://swiftdrop-app.vercel.app',
  'https://swiftdrop.vercel.app',
  'http://localhost:3000',
  'http://localhost:4000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Still allow to unblock
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Explicitly handle all preflight and socket.io requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Permissions-Policy', 'browsing-topics=()');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  if (req.url !== '/health') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  }
  next();
});

app.use(express.json());

// Health check and root
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.send('SwiftDrop Backend Engine Running'));

const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io/',
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Global process error handlers to prevent crash
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

if (!MONGODB_URI) {
  console.error('FATAL: DATABASE_URL env var is not set!');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
let db, bucket;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('swiftdrop');
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    console.log("Connected to MongoDB & GridFS initialized");
    console.log("TARGET DATABASE:", db.databaseName);
    
    // Diagnostic: List collections
    const collections = await db.listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));

    // Seed Global Space
    const spaces = db.collection('spaces');
    const globalSpace = await spaces.findOne({ isGlobal: true });
    if (!globalSpace) {
      await spaces.insertOne({
        name: "Espace Commun",
        isGlobal: true,
        ownerId: null,
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Global Space seeded');
    }
  } catch (error) {
    console.error("Connection/Seeding error:", error);
  }
}

connectDB().catch(console.error);

// Memory Storage - Much more stable for local/small deployments
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } 
});

// API Endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
        console.error("UPLOAD ERROR: No file attached. req.body:", req.body);
        return res.status(400).json({ error: "No file received" });
    }
    
    const { spaceId, ownerId, folderId } = req.body;
    console.log(`UPLOAD START: ${file.originalname} (${file.size} bytes)`);
    console.log(`METADATA: spaceId=${spaceId}, ownerId=${ownerId}, folderId=${folderId}`);

    // Create a GridFS upload stream manually
    const filename = `${Date.now()}-${file.originalname}`;
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        spaceId: spaceId || null,
        ownerId: ownerId || null,
        folderId: folderId || null,
        originalName: file.originalname,
        contentType: file.mimetype
      }
    });

    // Write buffer to GridFS
    uploadStream.end(file.buffer);

    // Wait for the upload to finish
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', (err) => {
          console.error("GRIDFS STREAM ERROR:", err);
          reject(err);
      });
    });

    console.log(`GRIDFS OK: File stored as ${filename} (ID: ${uploadStream.id})`);

    const filesCollection = db.collection('files');
    const newFile = {
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      storageId: uploadStream.id,
      spaceId: spaceId && /^[0-9a-fA-F]{24}$/.test(spaceId) ? new ObjectId(spaceId) : null,
      folderId: folderId && folderId !== 'null' && /^[0-9a-fA-F]{24}$/.test(folderId) ? new ObjectId(folderId) : null,
      ownerId: ownerId && /^[0-9a-fA-F]{24}$/.test(ownerId) ? new ObjectId(ownerId) : null,
      createdAt: new Date(),
    };

    const result = await filesCollection.insertOne(newFile);
    console.log(`DB OK: Record created with ID: ${result.insertedId} in 'files' collection`);

    io.emit('file_uploaded', { 
      spaceId, 
      fileName: newFile.name,
      ownerId 
    });

    res.status(200).json({ success: true, file: { ...newFile, _id: result.insertedId } });
  } catch (error) {
    console.error("UPLOAD CRITICAL ERROR:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Upload process failed check server logs" });
    }
  }
});

app.get('/api/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(fileId)) return res.status(400).send('Invalid file ID');

    const filesCollection = db.collection('files');
    const fileRecord = await filesCollection.findOne({ _id: new ObjectId(fileId) });

    if (!fileRecord) return res.status(404).send('File not found');

    const downloadStream = bucket.openDownloadStream(fileRecord.storageId);
    
    res.set({
      'Content-Type': fileRecord.type,
      'Content-Disposition': 'inline',
      'Content-Length': fileRecord.size
    });

    downloadStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).send('Stream error');
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("View error:", error);
    res.status(500).send('View failed');
  }
});

app.get('/api/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(fileId)) return res.status(400).send('Invalid file ID');

    const filesCollection = db.collection('files');
    const fileRecord = await filesCollection.findOne({ _id: new ObjectId(fileId) });

    if (!fileRecord) return res.status(404).send('File not found');

    const downloadStream = bucket.openDownloadStream(fileRecord.storageId);
    
    res.set({
      'Content-Type': fileRecord.type,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileRecord.name)}"`,
      'Content-Length': fileRecord.size
    });

    downloadStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).send('Stream error');
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send('Download failed');
  }
});

// Space & Folder management
app.post('/api/spaces', async (req, res) => {
  try {
    const { name, ownerId } = req.body;
    const spaces = db.collection('spaces');
    const result = await spaces.insertOne({
      name,
      ownerId: ownerId ? new ObjectId(ownerId) : null,
      sharedWith: [],
      createdAt: new Date()
    });
    io.emit('space_created', { ownerId, name });
    res.status(201).json({ id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/folders', async (req, res) => {
  try {
    const { name, spaceId, parentId, ownerId } = req.body;
    const folders = db.collection('folders');
    const result = await folders.insertOne({
      name,
      spaceId: spaceId ? new ObjectId(spaceId) : null,
      parentId: parentId && parentId !== 'null' ? new ObjectId(parentId) : null,
      ownerId: ownerId ? new ObjectId(ownerId) : null,
      createdAt: new Date()
    });
    io.emit('folder_created', { spaceId, name });
    res.status(201).json({ id: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/items/rename', async (req, res) => {
  try {
    const { id, type, newName } = req.body;
    const collection = type === 'folder' ? db.collection('folders') : db.collection('files');
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { name: newName } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/items', async (req, res) => {
  try {
    const { id, type } = req.body;
    if (type === 'space') {
        const spaceId = new ObjectId(id);
        const filesCollection = db.collection('files');
        const filesInSpace = await filesCollection.find({ spaceId }).toArray();
        for (const file of filesInSpace) {
            try { await bucket.delete(file.storageId); } catch (e) {}
            await filesCollection.deleteOne({ _id: file._id });
        }
        await db.collection('folders').deleteMany({ spaceId });
        await db.collection('spaces').deleteOne({ _id: spaceId });
        io.emit('space_deleted', { spaceId: id });
    } else if (type === 'folder') {
        await db.collection('folders').deleteOne({ _id: new ObjectId(id) });
    } else {
        const filesCollection = db.collection('files');
        const file = await filesCollection.findOne({ _id: new ObjectId(id) });
        if (file) {
            try { await bucket.delete(file.storageId); } catch (e) {}
            await filesCollection.deleteOne({ _id: new ObjectId(id) });
        }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/favorites/toggle', async (req, res) => {
  try {
    const { id, type } = req.body;
    const collection = type === 'folder' ? db.collection('folders') : db.collection('files');
    const item = await collection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).json({ error: "Not found" });
    await collection.updateOne(
        { _id: new ObjectId(id) }, 
        { $set: { isFavorite: !item.isFavorite } }
    );
    res.json({ success: true, isFavorite: !item.isFavorite });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("EXPRESS ERROR:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simple Socket.io implementation
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend engine running on port ${PORT}`);
});
