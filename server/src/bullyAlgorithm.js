class BullyAlgorithm {
    constructor(id, onElectionCompleted) {
      this.id = id;
      this.nodes = new Map();
      this.onElectionCompleted = onElectionCompleted;
      this.electionTimeout = null;
      this.timeoutDuration = 3000; // 3 seconds
    }
  
    addNode(id, socket) {
      this.nodes.set(id, socket);
    }
  
    removeNode(id) {
      this.nodes.delete(id);
    }
  
    startElection() {
      console.log(`Node ${this.id} starting an election`);
      const higherNodes = Array.from(this.nodes.keys()).filter((nodeId) => nodeId > this.id);
  
      if (higherNodes.length === 0) {
        console.log(`Node ${this.id} wins the election`);
        this.onElectionCompleted(this.id);
      } else {
        higherNodes.forEach((nodeId) => {
          this.nodes.get(nodeId).emit('election', this.id);
        });
  
        this.electionTimeout = setTimeout(() => {
          this.startElection();
        }, this.timeoutDuration);
      }
    }
  
    handleMessage(senderId, messageType) {
      if (messageType === 'election') {
        if (senderId < this.id) {
          this.nodes.get(senderId).emit('election-response', this.id);
          if (!this.electionTimeout) {
            this.startElection();
          }
        }
      } else if (messageType === 'election-response') {
        clearTimeout(this.electionTimeout);
        this.electionTimeout = null;
      }
    }
  }
  
  module.exports = BullyAlgorithm;
  