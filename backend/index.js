const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const todoRoutes = require('./routes/todoRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const projectRoutes = require('./routes/projectRoutes');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Todo API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      todos: '/api/todos',
      messages: '/api/messages',
      users: '/api/users',
      teams: '/api/teams',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User comes online
  socket.on('userOnline', async (userId) => {
    try {
      const User = require('./models/User');
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id,
      });
      
      // Broadcast to all clients
      io.emit('userStatusChanged', { 
        userId, 
        isOnline: true 
      });
      
      console.log(`User ${userId} is now online`);
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  });

  // Join team room
  socket.on('joinTeam', (teamId) => {
    if (teamId) {
      socket.join(`team-${teamId}`);
      console.log(`Socket ${socket.id} joined team-${teamId}`);
    }
  });

  // Leave team room
  socket.on('leaveTeam', (teamId) => {
    if (teamId) {
      socket.leave(`team-${teamId}`);
      console.log(`Socket ${socket.id} left team-${teamId}`);
    }
  });

  // Join project room
  socket.on('joinProject', (projectId) => {
    if (projectId) {
      socket.join(`project-${projectId}`);
      console.log(`Socket ${socket.id} joined project-${projectId}`);
    }
  });

  // Leave project room
  socket.on('leaveProject', (projectId) => {
    if (projectId) {
      socket.leave(`project-${projectId}`);
      console.log(`Socket ${socket.id} left project-${projectId}`);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    // Set user offline
    try {
      const User = require('./models/User');
      const user = await User.findOne({ socketId: socket.id });
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          isOnline: false,
          lastSeen: new Date(),
          socketId: null,
        });
        
        // Broadcast to all clients
        io.emit('userStatusChanged', { 
          userId: user._id, 
          isOnline: false,
          lastSeen: new Date()
        });
        
        console.log(`User ${user._id} is now offline`);
      }
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  });
});
