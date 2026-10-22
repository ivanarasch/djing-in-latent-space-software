/**
 * compute_interval_vector.js
 * Computes an "average interval" attribute vector in MusicVAE latent space.
 * Reads chunks extracted from a MIDI corpus (see extract_chunks_to_json.py),
 * encodes them with MusicVAE, and takes the mean latent vector of the
 * widest-leaping quartile minus that of the most stepwise quartile.
 *
 * Run from the repo root, with the repo served on port 8081
 * (python3 -m http.server 8081):
 *   node scripts/compute_interval_vector.js path/to/chunks.json
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const mm   = require('../node_modules/@magenta/music/node/music_vae');
const tf   = require('../node_modules/@tensorflow/tfjs');

const CHECKPOINT  = 'http://localhost:8081/data/mel_small';
const CHUNKS_PATH = process.argv[2];
if (!CHUNKS_PATH) { console.error('usage: node scripts/compute_interval_vector.js path/to/chunks.json'); process.exit(1); }
const OUTPUT_PATH = path.join(__dirname, '../data/interval_vector.json');

function avgInterval(notes) {
  if (!notes || notes.length < 2) return 0;
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += Math.abs(sorted[i].pitch - sorted[i-1].pitch);
  }
  return total / (sorted.length - 1);
}

function notesToNoteSequence(notes, bpm=120, totalSteps=32, stepsPerQuarter=4) {
  const secondsPerStep = (60.0 / bpm) / stepsPerQuarter;
  const ns = {
    notes: [],
    quantizationInfo: { stepsPerQuarter },
    totalQuantizedSteps: totalSteps,
    tempos: [{ qpm: bpm }]
  };
  for (const n of notes) {
    const startStep = Math.round(n.start / secondsPerStep);
    let endStep = Math.min(Math.max(Math.round(n.end / secondsPerStep), startStep + 1), totalSteps);
    if (startStep >= totalSteps) continue;
    ns.notes.push({
      pitch: n.pitch,
      velocity: n.velocity || 80,
      quantizedStartStep: startStep,
      quantizedEndStep: endStep,
      instrument: 0, program: 0, isDrum: false
    });
  }
  return ns;
}

async function main() {
  console.log('Loading chunks...');
  const chunks = JSON.parse(fs.readFileSync(CHUNKS_PATH, 'utf8'));
  console.log(`Loaded ${chunks.length} chunks`);

  // compute average interval per chunk
  const intervals = chunks.map(c => avgInterval(c.notes));
  const mean = intervals.reduce((a,b)=>a+b,0)/intervals.length;
  const std  = Math.sqrt(intervals.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/intervals.length);
  console.log(`Interval stats: mean=${mean.toFixed(2)}, std=${std.toFixed(2)}`);

  console.log('Loading MusicVAE model...');
  const model = new mm.MusicVAE(CHECKPOINT);
  await model.initialize();
  console.log('Model loaded');

  const batchSize = 32;
  const zAll = [];
  console.log('Encoding chunks...');
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const seqs  = batch.map(c => notesToNoteSequence(c.notes));
    try {
      const z    = await model.encode(seqs);
      const zArr = await z.array();
      zAll.push(...zArr);
      z.dispose();
    } catch(e) {}
    if (i % 2000 === 0) console.log(`  ${i}/${chunks.length}`);
  }
  console.log(`Encoded ${zAll.length} chunks`);

  // sort by average interval, take top and bottom quartile
  const n = zAll.length;
  const q = Math.floor(n / 4);
  const sortedIdx = intervals.slice(0, n)
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .map(x => x.i);

  const botIdx = sortedIdx.slice(0, q);   // stepwise (small intervals)
  const topIdx = sortedIdx.slice(-q);     // leaping (large intervals)
  const dim = 256;
  const topMean = new Float64Array(dim);
  const botMean = new Float64Array(dim);

  for (const i of topIdx) for (let d = 0; d < dim; d++) topMean[d] += zAll[i][d] / q;
  for (const i of botIdx) for (let d = 0; d < dim; d++) botMean[d] += zAll[i][d] / q;

  const intervalVector = Array.from({length: dim}, (_, d) => topMean[d] - botMean[d]);
  const norm = Math.sqrt(intervalVector.reduce((s, v) => s + v*v, 0));
  console.log(`Interval vector norm: ${norm.toFixed(3)}`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), {recursive: true});
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(intervalVector));
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch(console.error);
