/**
 * compute_interval_variants.js
 * For each song chunk, computes 11 interval variants by encoding,
 * shifting with interval vector at 11 levels, and decoding.
 *
 * Run from the repo root, with the repo served on port 8081
 * (python3 -m http.server 8081):
 *   node scripts/compute_interval_variants.js
 *
 * MAX_SHIFT sets how far the 11 levels reach, as a multiple of the interval
 * vector (default 15, which reproduces the shipped data/interval_variants.json):
 *   MAX_SHIFT=6 node scripts/compute_interval_variants.js
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const mm   = require('../node_modules/@magenta/music/node/music_vae');
const tf   = require('../node_modules/@tensorflow/tfjs');

const CHECKPOINT    = 'http://localhost:8081/data/mel_small';
const INTERVAL_VEC  = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/interval_vector.json'), 'utf8'));
const OUTPUT_PATH   = path.join(__dirname, '../data/interval_variants.json');

// 11 shift amounts: -MAX_SHIFT (stepwise) to +MAX_SHIFT (leaping)
const MAX_SHIFT = Number(process.env.MAX_SHIFT || 15);
const AMOUNTS = Array.from({length: 11}, (_, i) => -MAX_SHIFT + i * (2 * MAX_SHIFT / 10));

// Load chunks via vm sandbox
const chunksCode = fs.readFileSync(path.join(__dirname, '../song-chunks.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(chunksCode, sandbox);

const SONGS = {
  'AVRIL':    { varName: 'AVRIL_MEL_CHUNKS',   bpm: 78  },
  'GALORE':   { varName: 'GALORE_MEL_CHUNKS',  bpm: 125 },
  'VERIDIS':  { varName: 'VERIDIS_MEL_CHUNKS', bpm: 120 },
  'ROSALIA':  { varName: 'ROSALIA_MEL_CHUNKS', bpm: 120 },
};

function notesToNoteSequence(notes, bpm=120, totalSteps=32, stepsPerQuarter=4) {
  const secondsPerStep = (60.0 / bpm) / stepsPerQuarter;
  const ns = {
    notes: [],
    quantizationInfo: { stepsPerQuarter },
    totalQuantizedSteps: totalSteps,
    tempos: [{ qpm: bpm }]
  };
  for (const n of notes) {
    const startStep = Math.round(n.quantizedStartStep);
    let endStep = Math.min(Math.max(Math.round(n.quantizedEndStep), startStep + 1), totalSteps);
    if (startStep >= totalSteps) continue;
    ns.notes.push({
      pitch: n.pitch, velocity: n.velocity || 80,
      quantizedStartStep: startStep, quantizedEndStep: endStep,
      instrument: 0, program: 0, isDrum: false
    });
  }
  return ns;
}

function noteSequenceToChunk(ns) {
  if (!ns || !ns.notes) return [];
  return ns.notes.map(n => ({
    pitch: n.pitch, velocity: n.velocity || 80,
    quantizedStartStep: n.quantizedStartStep,
    quantizedEndStep: n.quantizedEndStep
  }));
}

async function main() {
  for (const [key, info] of Object.entries(SONGS)) {
    if (!sandbox[info.varName]) {
      console.log(`WARNING: ${info.varName} not found, skipping ${key}`);
      delete SONGS[key];
    } else {
      console.log(`Found ${key}: ${sandbox[info.varName].length} chunks`);
    }
  }

  console.log('\nLoading MusicVAE model...');
  const model = new mm.MusicVAE(CHECKPOINT);
  await model.initialize();
  console.log('Model loaded\n');

  const output = {};

  for (const [songKey, songInfo] of Object.entries(SONGS)) {
    const chunks = sandbox[songInfo.varName];
    console.log(`Processing ${songKey}: ${chunks.length} chunks x 11 variants`);
    output[songKey] = [];

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = JSON.parse(JSON.stringify(chunks[ci]));
      if (!chunk || !chunk.length) { output[songKey].push(null); continue; }

      try {
        const seq  = notesToNoteSequence(chunk, songInfo.bpm);
        const z    = await model.encode([seq]);
        const zArr = await z.array();
        z.dispose();
        const zVec = zArr[0];

        const variants = [];
        for (const amount of AMOUNTS) {
          const zShifted = zVec.map((val, i) => val + amount * (INTERVAL_VEC[i] || 0));
          const zTensor  = tf.tensor2d([zShifted]);
          const decoded  = await model.decode(zTensor);
          zTensor.dispose();
          const variant = noteSequenceToChunk(Array.isArray(decoded) ? decoded[0] : decoded);
          variants.push(variant);
        }
        output[songKey].push(variants);

      } catch(e) {
        console.warn(`  chunk ${ci} failed: ${e.message}`);
        output[songKey].push(null);
      }

      if (ci % 5 === 0) console.log(`  ${songKey} chunk ${ci}/${chunks.length}`);
    }
    console.log(`  ${songKey} done\n`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  const size = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Saved to ${OUTPUT_PATH} (${size} MB)`);
}

main().catch(console.error);
