const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 7777;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "/public")));

const users = {};

io.on('connection', (socket) => {
    socket.on('name', (name) => {
        users[socket.id] = name;

        socket.broadcast.emit('name', `${name} has joined the chat.`);
        io.emit('updateUsers', Object.values(users));
    });

    socket.on('msg', (msg) => {
        socket.broadcast.emit('incoming', { name: users[socket.id], message: msg });
    });

    socket.on('disconnect', () => {
        io.emit('name', `${users[socket.id]} has left the chat.`);
        delete users[socket.id];

        io.emit('updateUsers', Object.values(users));
    });

    socket.on('file', (data) => {
        const imgHTML = `<b>${data.sender}:</b><br><img src="${data.fileContent}" alt="${data.fileName}" style="max-width: 200px; max-height: 150px; border-radius: 5px;" />`;

        socket.broadcast.emit('incoming', {
            name: users[socket.id], // get sender's name from `users`
            message: imgHTML
        });
    });
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

server.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});