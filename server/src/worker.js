const io = require('socket.io-client');
const BullyAlgorithm = require('./bullyAlgorithm');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const JavaRunner = require('java-runner');
const { error } = require('console');

const config = JSON.parse(fs.readFileSync('./server/src/config.json', 'utf-8'));
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
    const { taskId, language, code } = data;
    executeCode(language, code)
      .then((result) => {
        console.log(`Task ${taskId} executed successfully`);
        socket.emit('code-result', { taskId, success: true, result });
      })
      .catch((error) => {
        console.error(`Task ${taskId} failed: ${error.message}`);
        socket.emit('code-result', { taskId, success: false, error: error.message });
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
    if (language === 'javascript') {
      try {
        const originalConsoleLog = console.log;
        let logs = '';

        // Override console.log to capture logs
        console.log = (...args) => {
          logs += args.join(' ') + '\n';
          originalConsoleLog.apply(console, args);
        };

        const result = eval(code);
        resolve({ result, logs });

        // Restore the original console.log
        console.log = originalConsoleLog;
      } catch (error) {
        reject(error);
      }
    } else if (language === 'python') {
      let logs = '';
      const pyProcess = spawn('python', ['-u', '-c', code]);
    
      pyProcess.stdout.on('data', (data) => {
        logs += data.toString();
      });
    
      pyProcess.stderr.on('data', (data) => {
        logs += data.toString();
      });
    
      pyProcess.on('error', (error) => {
        reject(error);
      });
    
      pyProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}`));
        } else {
          resolve({ result: null, logs });
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
