import { Worker } from 'worker_threads';

const workerCode = `
const { parentPort } = require('worker_threads');
parentPort.on('message', (msg) => {
  const arr = [ { step: 1 } ];
  arr.cardId = "test_card";
  parentPort.postMessage(arr);
});
`;

const worker = new Worker(workerCode, { eval: true });
worker.on('message', (msg) => {
  console.log("Array length:", msg.length);
  console.log("cardId property:", msg.cardId);
  process.exit(0);
});
worker.postMessage("start");
