const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const playerMapping = {};
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
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

app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

let waitingPlayer = null;

app.post('/signup', (req, res) => {
    const { email, password } = req.body;
    console.log('Email:', email);
    console.log('Password:', password);
    res.redirect('/homepage.html');
});
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'ozbej', // Replace with your MySQL username
    password: 'testtest', // Replace with your MySQL password
    database: 'nwc' // Replace with your MySQL database name
  });

  db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
  });

  app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).send('Server error');
        }
        if (results.length === 0) {
            return res.status(400).send('User not found');
        }

        const validPassword = await bcrypt.compare(password, results[0].password);
        if (!validPassword) {
            return res.status(400).send('Invalid Password');
        }

        res.json({ message: 'Login successful' });
    });
});
app.post('/start-game', async (req, res) => {
    const userId = req.body.userId; // or however you get the user's ID
    const gameCost = 10; // set the cost of the game

    // Query to deduct the balance
    const deductBalanceQuery = 'UPDATE user_balances SET balance = balance - ? WHERE user_id = ?';
    db.query(deductBalanceQuery, [gameCost, userId], (err, result) => {
        if (err) {
            // Handle any errors, such as insufficient balance
            return res.status(500).send('Error processing your request');
        }

        // If balance is successfully deducted, fetch the updated balance
        const fetchBalanceQuery = 'SELECT balance FROM user_balances WHERE user_id = ?';
        db.query(fetchBalanceQuery, [userId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(500).send('Error fetching updated balance');
            }

            // Send the updated balance back to the client
            res.json({ balance: results[0].balance });
        });
    });
});

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    db.query('SELECT email FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            return res.status(500).send('Server error');
        }
        if (result.length > 0) {
            return res.status(400).send('User already exists');
        } else {
            db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err, result) => {
                if (err) {
                    return res.status(500).send('Server error');
                }
                res.send('User registered successfully');
            });
        }
    });
});

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    socket.on('gameStateUpdate', (gameState) => {
        // Relay the game state to the other player
        socket.broadcast.emit('opponentGameState', gameState);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

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
        const opponentId = playerMapping[data.loserId];
    if (opponentId) {
        // Emit to the losing player
        io.to(data.loserId).emit('youLose');
        // Emit to the winning player
        io.to(opponentId).emit('youWin');
    }
    });
    socket.on('gameOver', (data) => {
        // Assuming data contains the loser's ID
        const loserId = data.loserId;
        const winnerId = playerMapping[loserId]; // Assuming you have a way to identify the winner
    
        if (winnerId) {
            io.to(loserId).emit('youLose');
            io.to(winnerId).emit('youWin');
        }
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
