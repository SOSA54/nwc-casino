const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcrypt');
const Tetris = require('./jstetris-master/jstetris-master/src/tetris.js');
const bodyParser = require('body-parser');
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cors = require('cors');
const server = require('http').createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});
const gameStartTimes = {};

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

app.get('/signup.html', (req, res) => res.sendFile(__dirname + '/signup.html'));
app.get('/homepage.html', (req, res) => res.sendFile(__dirname + '/homepage.html'));

let waitingPlayer = null;
const playerMapping = {};
let tetrisGame;

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);

  if (waitingPlayer) {
    gameStartTimes[socket.id] = new Date();
    gameStartTimes[waitingPlayer.id] = new Date();
    console.log(`Pairing with: ${waitingPlayer.id}`);
    playerMapping[socket.id] = waitingPlayer.id;
    playerMapping[waitingPlayer.id] = socket.id;
    
    io.to(socket.id).emit('paired', waitingPlayer.id);
    io.to(waitingPlayer.id).emit('paired', socket.id);

    io.to(socket.id).emit('startGame');
    io.to(waitingPlayer.id).emit('startGame');

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
    console.log('New waiting player:', socket.id);
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
    if (opponentId && io.sockets.sockets.get(opponentId)) {
      io.to(opponentId).emit('opponentDisconnected');
    }
  });

socket.on('paired', (opponentId) => {
    console.log('Paired with opponent:', opponentId);
    tetrisGame = new Tetris(socket); // Instantiate Tetris game here
    tetrisGame.start(); // Start the Tetris game
});

  socket.on('gameOver', (data) => {
    const loserId = data.loserId;
    const winnerId = playerMapping[loserId];
    if (winnerId) {
      io.to(loserId).emit('gameResult', { result: 'lose' });
      io.to(winnerId).emit('gameResult', { result: 'win' });

      const endTime = new Date();
      const startTime = gameStartTimes[winnerId] || new Date();
      console.log(`Game started at: ${startTime}`);
      console.log(`Game ended at: ${endTime}`);
      console.log(`Winner: ${winnerId}`);
      console.log(`Loser: ${loserId}`);

      setTimeout(() => {
        io.to(loserId).emit('redirect', '/servers-tetris.html');
        io.to(winnerId).emit('redirect', '/servers-tetris.html');
      }, 5000);
    }
  });
});

server.listen(3000, '0.0.0.0', () => console.log('Server listening on port 3000'));
