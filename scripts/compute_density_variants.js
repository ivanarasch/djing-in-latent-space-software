/**
 * compute_density_variants.js
 * For each song chunk, computes 11 density variants by encoding,
 * shifting with density vector at 11 levels, and decoding.
 *
 * Run from the repo root, with the repo served on port 8081:
 *   python3 -m http.server 8081
 *   node scripts/compute_density_variants.js
 */

const fs   = require('fs');
const path = require('path');
const mm   = require('../node_modules/@magenta/music/node/music_vae');
const tf   = require('../node_modules/@tensorflow/tfjs');

const CHECKPOINT    = 'http://localhost:8081/data/mel_small';
const DENSITY_VEC   = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/density_vector.json'), 'utf8'));
const OUTPUT_PATH   = path.join(__dirname, '../data/density_variants.json');

// 11 shift amounts: -2 (most sparse) to +2 (most dense)
const AMOUNTS = Array.from({length: 11}, (_, i) => -2 + i * (4/10));

// Load chunks by running song-chunks.js in a sandboxed context
const vm = require('vm');
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
      pitch: n.pitch,
      velocity: n.velocity || 80,
      quantizedStartStep: startStep,
      quantizedEndStep: endStep,
      instrument: 0,
      program: 0,
      isDrum: false
    });
  }
  return ns;
}

function noteSequenceToChunk(ns) {
  if (!ns || !ns.notes) return [];
  return ns.notes.map(n => ({
    pitch: n.pitch,
    velocity: n.velocity || 80,
    quantizedStartStep: n.quantizedStartStep,
    quantizedEndStep: n.quantizedEndStep
  }));
}

async function main() {
  // check which songs are actually available
  for (const [key, info] of Object.entries(SONGS)) {
    if (!sandbox[info.varName]) {
      console.log(`WARNING: ${info.varName} not found in song-chunks.js, skipping ${key}`);
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
      const chunk = chunks[ci];
      if (!chunk || !chunk.length) {
        output[songKey].push(null);
        continue;
      }

      try {
        const chunk2 = JSON.parse(JSON.stringify(chunk));
        const seq = notesToNoteSequence(chunk2, songInfo.bpm);
        const z = await model.encode([seq]);
        const zArr = await z.array();
        z.dispose();
        const zVec = zArr[0]; // [256]

        const variants = [];
        for (const amount of AMOUNTS) {
          const zShifted = zVec.map((val, i) => val + amount * (DENSITY_VEC[i] || 0));
          const zTensor = tf.tensor2d([zShifted]);
          const decoded = await model.decode(zTensor);
          zTensor.dispose();
          const variant = noteSequenceToChunk(Array.isArray(decoded) ? decoded[0] : decoded);
          variants.push(variant);
        }

        output[songKey].push(variants);

      } catch(e) {
        console.warn(`  chunk ${ci} failed: ${e.message}`, e.stack ? e.stack.split('\n')[1] : '');
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
