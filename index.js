const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "/public")));

const users = {};

io.on('connection', (socket) => {
    socket.on('name', (name) => {
        users[socket.id] = name;

        io.emit('name', `${name} has joined the chat.`);
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
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
}); 

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});