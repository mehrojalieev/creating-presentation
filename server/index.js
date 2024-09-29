const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow multiple origins
    methods: ['GET', 'POST'],
  },
});

// CORS configuration for Express
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'], 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions)); 
app.use(express.json());

let presentations = []; 
let users = {};


// Create a new presentation
app.post('/api/presentations', (req, res) => {
  const { title, creator } = req.body;
  const newPresentation = {
    id: presentations.length + 1,
    title,
    creator,
    slides: [],
    users: [],
  };
  presentations.push(newPresentation);
  res.status(201).json(newPresentation);
});

// Get all presentations
app.get('/api/presentations', (req, res) => {
  res.json(presentations);
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('User connected: ', socket.id);

  socket.on('join-presentation', ({ presentationId, nickname }) => {
    socket.join(presentationId);
    users[socket.id] = { presentationId, nickname };
    const presentation = presentations.find((p) => p.id === presentationId);
    if (presentation) {
      presentation.users.push({ id: socket.id, nickname });
      io.to(presentationId).emit('user-joined', presentation.users);
    }
  });

  socket.on('draw', (data) => {
    const { presentationId, drawingData } = data;
    io.to(presentationId).emit('draw', drawingData);
  });

  socket.on('add-text', (data) => {
    const { presentationId, textData } = data;
    io.to(presentationId).emit('text-added', textData);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const { presentationId } = user;
      const presentation = presentations.find((p) => p.id === presentationId);
      if (presentation) {
        presentation.users = presentation.users.filter((u) => u.id !== socket.id);
        io.to(presentationId).emit('user-left', presentation.users);
      }
    }
    delete users[socket.id];
    console.log('User disconnected: ', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
