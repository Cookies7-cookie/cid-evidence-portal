const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://Cookies77:0912309K@cluster0.cchkvyh.mongodb.net/cid_evidence?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define Schema
const evidenceSchema = new mongoose.Schema({
    type: { type: String, default: 'main_storage' }, // Identifier
    photos: { type: Array, default: [] },
    videos: { type: Array, default: [] },
    text: { type: Array, default: [] },
    criminals: { type: Array, default: [] }
});

const Evidence = mongoose.model('Evidence', evidenceSchema);

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    // API Endpoint: Get Evidence Data
    if (req.url === '/api/evidence' && req.method === 'GET') {
        try {
            let data = await Evidence.findOne({ type: 'main_storage' });

            // If no data exists, create initial empty doc
            if (!data) {
                data = new Evidence({
                    type: 'main_storage',
                    photos: [],
                    videos: [],
                    text: [],
                    criminals: []
                });
                await data.save();
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (err) {
            console.error(err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Database error' }));
        }
        return;
    }

    // API Endpoint: Save Evidence Data
    if (req.url === '/api/evidence' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const newData = JSON.parse(body);

                // Update the main storage document
                await Evidence.findOneAndUpdate(
                    { type: 'main_storage' },
                    {
                        photos: newData.photos,
                        videos: newData.videos,
                        text: newData.text,
                        criminals: newData.criminals
                    },
                    { upsert: true, new: true }
                );

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Could not save data' }));
            }
        });
        return;
    }

    // Static File Serving
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`CID Evidence Portal running on port ${PORT}`);
});
