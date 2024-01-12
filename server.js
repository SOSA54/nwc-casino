const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://127.0.0.1:5502",  // Change this to your client's origin
        methods: ["GET", "POST"]
    }
});

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (waitingPlayer) {
        // Pair up players
        [socket, waitingPlayer].forEach(s => s.emit('gameStart', { opponentId: s.id }));
        waitingPlayer = null;
    } else {
        // Waiting for an opponent
        waitingPlayer = socket;
        socket.emit('waitingForOpponent');
    }

    socket.on('disconnect', () => {
        console.log('A player disconnected:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
    });

    socket.on('gameOver', (data) => {
        console.log('Player lost:', data.loserId);
        // Notify the other player
        socket.broadcast.emit('opponentWon', { winnerId: socket.id });
    });

    socket.on('opponentWon', (data) => {
        alert("You win!");
        // You can also update the UI or game state as necessary
    });
    
    // Additional game state synchronization events can be added here
});

server.listen(3000, () => console.log('Server listening on port 3000'));
