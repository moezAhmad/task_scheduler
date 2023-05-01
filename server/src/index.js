// Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
var cors = require('cors')
const BullyAlgorithm = require('./bullyAlgorithm');

const workerClients = new Map();

const masterId = generateUniqueId();

const bully = new BullyAlgorithm(masterId, (newMasterId) => {
  console.log(`New master elected: ${newMasterId}`);
});

// Initialize the express app
const app = express();
app.use(cors())
const server = http.createServer(app);

// Set up socket.io
const io = socketIO(server);

// Set up middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname,"../", 'public')));

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname,"../", 'public', 'index.html'));
});

// Add this near the other routes
app.post('/submit-code', (req, res) => {
  const { language, code } = req.body;
  console.log(`Received code in ${language}:\n${code}`);

  // Choose a worker client to execute the code
  const workerClient = selectWorkerClient(workerClients);
  
  if (workerClient) {
    // Forward the code to the selected worker client
    workerClient.emit('execute-code', { language, code });

    // Listen for the result from the worker client
    workerClient.once('code-result', (result) => {
      // Send the result back to the frontend
      res.json({ success: true, result });
    });
  } else {
    res.status(500).json({ success: false, message: 'No available worker clients' });
  }
});

// Add this helper function to select a worker client
function selectWorkerClient(workerClients) {
  // This is a basic selection strategy; you'll replace it with a more advanced scheduling algorithm later
  if (workerClients.size > 0) {
    return workerClients.values().next().value;
  }
  return null;
}

function generateUniqueId(){
  return Math.floor(Math.random() * 1e10).toString();
}


// Set up socket.io connection
io.on('connection', (socket) => {
  console.log('A new worker client connected');
  
  // Assign a unique ID to each worker client
  const clientId = generateUniqueId();
  
  // Add the new worker client to the workerClients map and Bully Algorithm
  workerClients.set(clientId, socket);
  bully.addNode(clientId, socket);
  
  // Handle election-related messages from the worker clients
  socket.on('election-message', (message) => {
    const { senderId, messageType } = message;
    bully.handleMessage(senderId, messageType);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A worker client disconnected');
    
    // Remove the disconnected worker client from the workerClients map and Bully Algorithm
    workerClients.delete(clientId);
    bully.removeNode(clientId);
  });
});




// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});