const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 7777;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7 // 🔒 10MB file limit
});

app.use(express.static(path.join(__dirname, "public")));

const users = {};

io.on("connection", (socket) => {
    console.log(`[SERVER] User connected: ${socket.id}`);

    // USER JOIN
    socket.on("join-room", (data) => {
        const { name, room } = data;
        if (!name || !room) return;
        
        socket.join(room);
        users[socket.id] = { name: name.trim(), room: room.trim() };
        
        console.log(`[SERVER] User ${name} joined room ${room} (${socket.id})`);
        
        socket.to(room).emit("name", `${name} joined the chat`);
        
        // Update users in THIS room ONLY
        const roomUsers = Object.values(users)
            .filter(u => u.room === room)
            .map(u => u.name);
            
        io.to(room).emit("updateUsers", roomUsers);
    });

    // TEXT MESSAGE
    socket.on("msg", (msg) => {
        const user = users[socket.id];
        if (!user || !msg || !msg.trim()) return;

        const messageData = {
            id: Math.random().toString(36).substr(2, 9),
            type: "text",
            name: user.name,
            message: msg.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.to(user.room).emit("incoming", messageData);
        console.log(`[SERVER] Message in room ${user.room} from ${user.name}`);
    });

    // DELETE MESSAGE
    socket.on("delete-msg", (msgId) => {
        const user = users[socket.id];
        if (!user) return;
        
        io.to(user.room).emit("msg-deleted", msgId);
        console.log(`[SERVER] Message ${msgId} deleted in room ${user.room}`);
    });

    // TYPING STATUS
    socket.on("typing", () => {
        const user = users[socket.id];
        if (!user) return;
        
        socket.to(user.room).emit("user-typing", { name: user.name, id: socket.id });
    });

    socket.on("stop-typing", () => {
        const user = users[socket.id];
        if (!user) return;
        
        socket.to(user.room).emit("user-stop-typing", { id: socket.id });
    });

    // FILE MESSAGE (ANY EXTENSION)
    socket.on("file", (data) => {
        const user = users[socket.id];
        if (!user || !data || !data.fileContent || !data.fileName) return;

        const fileData = {
            id: Math.random().toString(36).substr(2, 9),
            type: "file",
            name: user.name,
            fileName: data.fileName,
            fileContent: data.fileContent, // base64
            fileSize: data.fileSize || 'Unknown',
            fileMime: data.fileMime || 'application/octet-stream',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.to(user.room).emit("incoming", fileData);
        console.log(`[SERVER] File shared in room ${user.room} from ${user.name}: ${data.fileName}`);
    });

    // USER DISCONNECT
    socket.on("disconnect", () => {
        const user = users[socket.id];
        if (!user) return;

        delete users[socket.id];

        socket.to(user.room).emit("name", `${user.name} left the chat`);
        
        const roomUsers = Object.values(users)
            .filter(u => u.room === user.room)
            .map(u => u.name);
            
        io.to(user.room).emit("updateUsers", roomUsers);

        console.log(`[SERVER] User ${user.name} left room ${user.room}`);
    });

    // ERROR HANDLING
    socket.on("error", (err) => {
        console.error("Socket error:", err.message);
    });
});

// ROUTE
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// START SERVER
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});