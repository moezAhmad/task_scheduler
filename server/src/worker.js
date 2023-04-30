const io = require('socket.io-client');
const { PythonShell } = require('python-shell');
const JavaRunner = require('java-runner');
const BullyAlgorithm = require('./bullyAlgorithm');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./src/config.json', 'utf-8'));
const serverUrl = config.masterServerUrl;

const socket = io(serverUrl);
const clientId = generateUniqueId();

const bully = new BullyAlgorithm(clientId, (newMasterId) => {
  console.log(`New master elected: ${newMasterId}`);
});

socket.on('connect', () => {
  console.log(`Worker client ${clientId} connected to the master server`);

  // Handle election-related messages from the master server
  socket.on('election', (senderId) => {
    bully.handleMessage(senderId, 'election');
  });

  socket.on('election-response', (senderId) => {
    bully.handleMessage(senderId, 'election-response');
  });

  // Handle code execution
  socket.on('execute-code', (data) => {
    const { language, code } = data;
    executeCode(language, code)
      .then((result) => {
        socket.emit('code-result', { success: true, result });
      })
      .catch((error) => {
        socket.emit('code-result', { success: false, error: error.message });
      });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Worker client ${clientId} disconnected from the master server`);

    // Start an election if the master server disconnects
    if (!bully.electionTimeout) {
      bully.startElection();
    }
  });
});

function executeCode(language, code) {
  return new Promise((resolve, reject) => {
    // Implement code execution for each language here
    // For simplicity, only JavaScript and Python are included in this example
    if (language === 'javascript') {
      try {
        const result = eval(code);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    } else if (language === 'python') {
      PythonShell.runString(code, null, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    } else {
      reject(new Error(`Unsupported language: ${language}`));
    }
  });
}

function generateUniqueId() {
  return Math.floor(Math.random() * 1e10).toString();
}
