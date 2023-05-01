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
  const taskId = generateUniqueId();
  const { language, code } = req.body;
  console.log(`Received code in ${language}:\n${code}`);

  // Choose a worker client to execute the code
  const workerClient = selectWorkerClient(workerClients);

  if (workerClient) {
    // Forward the code to the selected worker client
    workerClient.emit('execute-code', { taskId, language, code });

    // Handle the result from the worker client
    const handleCodeResult = (resultData) => {
      const { taskId: resultTaskId, success, result, error } = resultData;
      if (resultTaskId === taskId) {
        // Send the result back to the frontend
        res.json({ success, result, error });

        // Cleanup
        workerClient.removeListener('code-result', handleCodeResult);
      }
    };

    workerClient.on('code-result', handleCodeResult);
  } else {
    res.status(500).json({ success: false, message: 'No available worker clients' });
  }
});


// Add a new variable to store the current worker index
let currentWorkerIndex = 0;

// Replace the previous selectWorkerClient function with this new version
function selectWorkerClient(workerClients) {
  if (workerClients.size > 0) {
    const workerArray = Array.from(workerClients.values());
    const selectedWorker = workerArray[currentWorkerIndex];
    
    // Move to the next worker in the array, or back to the start if the end is reached
    currentWorkerIndex = (currentWorkerIndex + 1) % workerArray.length;
    
    return selectedWorker;
  }
  return null;
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