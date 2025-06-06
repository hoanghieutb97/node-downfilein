const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Expose-Headers', 'Content-Disposition,content-disposition');
    next();
});

// ---- Thêm cho socket.io ----
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
});

app.get('/list-folder', (req, res) => {
    const folderPath = req.query.path;
    console.log('LIST:', folderPath);  // log đường dẫn đang đọc
    fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.log('ERR:', err);
            return res.status(400).json({ error: 'Không đọc được thư mục' });
        }
    
        const result = files.map(f => ({
            name: f.name,
            isDir: f.isDirectory()
        }));
        res.json(result);
    });
});


app.post('/download-zip-tree', (req, res) => {
    const { selected, rootPath } = req.body;
    // Lấy tên zip dựa theo thư mục gốc (rootPath)
    const zipName = `${rootPath ? rootPath.split(/[/\\]/).filter(Boolean).pop() : 'selected_files'}.zip`;

    res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`
    });

    const archiverLib = require('archiver');
    const archive = archiverLib('zip');
    archive.pipe(res);

    selected.forEach(fullPath => {
        // Tính đường dẫn TƯƠNG ĐỐI để giữ cấu trúc thư mục
        let relative = fullPath.replace(rootPath, "").replace(/^[/\\]+/, "");
        if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
            archive.directory(fullPath, relative); // Giữ nguyên folder structure
        } else if (fs.existsSync(fullPath)) {
            archive.file(fullPath, { name: relative }); // Giữ file nằm đúng folder
        }
    });
    archive.finalize();
});


server.listen(4001, () => console.log('Server chạy port 4001'));

