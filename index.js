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
    console.log("User connected:", socket.id);

    // USER JOIN
    socket.on("name", (name) => {
        if (!name || !name.trim()) return;

        users[socket.id] = name.trim();

        socket.broadcast.emit("name", `${name} joined the chat`);
        io.emit("updateUsers", Object.values(users));
    });

    // TEXT MESSAGE
    socket.on("msg", (msg) => {
        if (!users[socket.id] || !msg || !msg.trim()) return;

        socket.broadcast.emit("incoming", {
            type: "text",
            name: users[socket.id],
            message: msg.trim()
        });
    });

    // FILE MESSAGE (IMAGE ONLY)
    socket.on("file", (data) => {
        if (!users[socket.id]) return;
        if (!data || !data.fileContent || !data.fileName) return;

        // Allow only images
        if (!data.fileContent.startsWith("data:image")) {
            socket.emit("name", "Only image files are allowed");
            return;
        }

        socket.broadcast.emit("incoming", {
            type: "file",
            name: users[socket.id],
            fileName: data.fileName,
            fileContent: data.fileContent
        });
    });

    // USER DISCONNECT
    socket.on("disconnect", () => {
        const username = users[socket.id];
        if (!username) return;

        delete users[socket.id];

        socket.broadcast.emit("name", `${username} left the chat`);
        io.emit("updateUsers", Object.values(users));

        console.log("User disconnected:", socket.id);
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