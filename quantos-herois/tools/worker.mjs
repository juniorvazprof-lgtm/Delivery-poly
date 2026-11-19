// Worker: calcula um "ideal" (menor formação vencedora) para o pool do balance.mjs.
import { parentPort, workerData } from 'node:worker_threads';
import { HEROIS } from '../data/herois.js';
import { ideal, setN } from './simlib.mjs';
setN(workerData.N);
const armadura = HEROIS.guardiao.reducaoDano;
parentPort.on('message', ({ id, args, extra }) => {
  HEROIS.guardiao.reducaoDano = extra?.semArmadura ? 0 : armadura;
  const res = ideal(...args);
  HEROIS.guardiao.reducaoDano = armadura;
  parentPort.postMessage({ id, res });
});
