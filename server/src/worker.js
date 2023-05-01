const io = require('socket.io-client');
const BullyAlgorithm = require('./bullyAlgorithm');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { PythonShell } = require('python-shell');
const JavaRunner = require('java-runner');

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


const writeFileAsync = util.promisify(fs.writeFile);

async function executeCode(language, code) {
  return new Promise(async (resolve, reject) => {
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
    } else if (language === 'java') {
      try {
        const className = 'TempJavaClass'; // You may need to parse the class name from the code
        const filePath = path.join(__dirname, `${className}.java`);
        await writeFileAsync(filePath, code);

        const javaRunner = new JavaRunner();
        const javaResult = await javaRunner.runJavaFile(filePath, className);
        resolve(javaResult);
      } catch (error) {
        reject(error);
      }
    } else if (language === 'c++') {
      const sourceFilePath = path.join(__dirname, 'tempCode.cpp');
      const binaryFilePath = path.join(__dirname, 'tempBinary');

      try {
        await writeFileAsync(sourceFilePath, code);

        exec(`g++ ${sourceFilePath} -o ${binaryFilePath}`, (error) => {
          if (error) {
            reject(error);
          } else {
            exec(binaryFilePath, (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else if (stderr) {
                reject(new Error(stderr));
              } else {
                resolve(stdout);
              }
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error(`Unsupported language: ${language}`));
    }
  });
}

function generateUniqueId() {
  return Math.floor(Math.random() * 1e10).toString();
}
