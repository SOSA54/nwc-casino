const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const playerMapping = {};
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://127.0.0.1:5502",  // Change this to your client's origin
        methods: ["GET", "POST"]
    }
});

app.get('/signup.html', (req, res) => {
    res.sendFile(__dirname + '/signup.html'); // Replace 'signup.html' with the actual file path if needed
});

app.get('/homepage.html', (req, res) => {
    res.sendFile(__dirname + '/homepage.html'); // Replace 'homepage.html' with the actual file path if needed
});


let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (waitingPlayer) {
        // Pair up players
        playerMapping[socket.id] = waitingPlayer.id;
    playerMapping[waitingPlayer.id] = socket.id;
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
        const opponentId = playerMapping[socket.id];
    delete playerMapping[socket.id];
    delete playerMapping[opponentId];
    });

    socket.on('gameOver', (data) => {
        console.log('Player lost:', data.loserId);
        // Notify the other player
        socket.broadcast.emit('opponentWon', { winnerId: socket.id });
    });

    socket.on('opponentWon', (data) => {
        alert("You win!");
        // Yo seru can also update the UI or game state as necessary
    });
    // Server-side: Relay game state to the other player
    socket.on('gameStateUpdate', (gameState) => {
        let opponentId = playerMapping[socket.id];
        if (opponentId) {
            socket.to(opponentId).emit('opponentGameState', gameState);
        }
    });
    
    // Additional game state synchronization events can be added here
});

server.listen(3000, () => console.log('Server listening on port 3000'));
