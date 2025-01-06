// Server.js - Node.js backend
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/realtime-collab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const documentSchema = new mongoose.Schema({
  content: String,
});

const Document = mongoose.model('Document', documentSchema);

// API routes
app.get('/documents/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  res.json(doc);
});

app.post('/documents', async (req, res) => {
  const newDoc = new Document({ content: '' });
  await newDoc.save();
  res.json(newDoc);
});

// Real-time collaboration
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join-document', async ({ documentId }) => {
    socket.join(documentId);
    const doc = await Document.findById(documentId);
    socket.emit('load-document', doc.content);

    socket.on('send-changes', async (delta) => {
      socket.to(documentId).emit('receive-changes', delta);
      const doc = await Document.findById(documentId);
      doc.content = delta;
      await doc.save();
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3001, () => console.log('Server is running on port 3001'));

// Frontend - React App
// Create a React app using `npx create-react-app`.

// App.js
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';

const socket = io('http://localhost:3001');

function App() {
  const { id } = useParams();
  const [content, setContent] = useState('');

  useEffect(() => {
    socket.emit('join-document', { documentId: id });

    socket.on('load-document', (docContent) => {
      setContent(docContent);
    });

    socket.on('receive-changes', (delta) => {
      setContent(delta);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const handleChange = (e) => {
    const delta = e.target.value;
    setContent(delta);
    socket.emit('send-changes', delta);
  };

  return (
    <textarea
      value={content}
      onChange={handleChange}
      style={{ width: '100%', height: '90vh' }}
    />
  );
}

export default App;


