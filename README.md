# DJing in Latent Space

> Extended from Google Magenta's [Melody Mixer](https://experiments.withgoogle.com/ai/melody-mixer) ([source](https://github.com/googlecreativelab/melody-mixer)), which is built on the [MusicVAE](https://magenta.tensorflow.org/music-vae) model.

A browser-based, two-deck DJ instrument that navigates a **MusicVAE latent space** instead of mixing recorded audio. Pick a melody on each deck, and the crossfader moves through the space *between* them in real time, generating new melodies that exist between the two. The result is played through sampled piano in the browser, or sent out over MIDI to a **Yamaha Disklavier** acoustic piano.

This is the software half of my M.S. thesis project at NYU Steinhardt (2025–2026). It is designed to be played from a custom MIDI DJ controller, but every control also works on screen.

- **Live demo:** [ivanarasch.github.io/latent-djing-clean](https://ivanarasch.github.io/latent-djing-clean/neural-dj-v4.html) (use Chrome or Edge)
- **Portfolio page:** [ivanarasch.github.io/#thesis](https://ivanarasch.github.io/#thesis)
- **Demo video:** [YouTube](https://www.youtube.com/watch?v=BHOvkIi4GPU)
- **Controller hardware (KiCad PCBs, firmware, enclosure):** [Ivanita-s-DIY-DJ-Controller](https://github.com/ivanarasch/Ivanita-s-DIY-DJ-Controller)

## How it works

1. **Two decks, two melodies.** Each deck holds a song split into 2-bar chunks (32 steps each). Separate melody and bass models run in parallel.
2. **Latent interpolation.** Both decks' current chunks are encoded by MusicVAE (`mel_2bar_small`, 256-dimensional latent space). The crossfader moves through 11 interpolation steps between the two points, and each step is decoded back into a playable melody. The endpoints are the original melodies, so the generated material is exploratory but stays anchored to music you recognize.
3. **Attribute control.** The `DEN` (note density) and `INT` (average interval size) knobs reshape a chunk along a musical attribute while keeping the melody's character. Density is computed from an attribute vector in latent space (see [`data/densityvector.py`](data/densityvector.py)). Density and interval variants are also precomputed per chunk for fast, glitch-free playback (`data/density_variants.json`, `data/interval_variants.json`).
4. **Performance layer.** Tempo, per-deck pitch / octave / note length / swing, velocity, hot cues, loop, and reverse sit on top of the generated material, the way they would on a conventional DJ controller.

## Running it

The quickest way to try it is the [live demo](https://ivanarasch.github.io/latent-djing-clean/neural-dj-v4.html). To run your own copy, note that the page loads the model checkpoint and JSON data with `fetch()`, so it has to be served over HTTP (opening the file directly won't work).

```bash
git clone https://github.com/ivanarasch/latent-djing-clean.git
cd latent-djing-clean
python3 -m http.server 8000
```

Then open <http://localhost:8000/neural-dj-v4.html> in **Chrome or Edge**. Safari does not support Web MIDI, so a hardware controller won't be detected there.

Notes:

- Click a deck's play button to start audio. Browsers block sound until you interact with the page.
- Piano samples and the page font are loaded from the network at runtime, so you need an internet connection.
- The on-screen controls work with a mouse. A MIDI controller is optional.

## Using it

The demo is built around two decks, **A** (left) and **B** (right), with a crossfader and tempo control in between. Each deck holds one song, split into 2-bar chunks.

### Quick start

1. Open the [live demo](https://ivanarasch.github.io/latent-djing-clean/neural-dj-v4.html) in Chrome or Edge and wait for the loading bar to reach "ready".
2. Pick a song on each deck from the dropdowns at the top (Avril 14th, Galore, Veridis Quo, Rosalia). Deck A starts on Avril 14th and deck B on Galore.
3. Press **▶** on a deck to start playback. The piano rolls show the melody (top) and bass (bottom) for the current chunk.
4. Move the **crossfader** between A and B. The melody morphs between the two decks' current chunks, and the readout (`α = 0.00` to `1.00`) shows how far you are along that path. At either end you hear that deck's own song. Press **LOOP** to hold the current chunk while you move it.
5. Turn the knobs (drag up or down) to reshape the sound. Use **PREV / NEXT** to move through chunks.

Only one deck is the *active* one at a time, and it drives playback. Pressing a deck's ▶ or LOOP makes it active, and the crossfader switches it (left half is A, right half is B).

### Controls

| Control | What it does |
|---|---|
| **▶ / ■** | Start and stop playback. Press ▶ again to resume. |
| **Crossfader** | Moves from deck A (`α = 0`) to deck B (`α = 1`) through 11 steps in latent space. Between the two ends you hear the interpolated melody and bass. |
| **LOOP** | Holds the current chunk so you can move the crossfader over the same material. |
| **PREV / NEXT** | Move to the previous or next 2-bar chunk. |
| **CUE 1–4** | Tap an empty cue to save the current chunk (the button shows the chunk number). Tap it again to jump back. Double-click to clear. |
| **REV** | Plays the chunk backwards. |
| **Platter** | Drag up or down to scrub through steps. |
| **Tempo slider** | Sets the BPM (60 to 200). The song's own tempo is loaded when you pick it. |
| **VOL** | Note velocity for the deck. |
| **OCT** | Octave shift, −2 to +2. |
| **PCH** | Pitch shift, −12 to +12 semitones. |
| **LEN** | Note length, as a percentage of each note's duration. |
| **SWG** | Swing, which delays every other step. |
| **DEN** | Note density. Low values thin the melody out and high values fill it in, using the density attribute vector. In Bass Mode it sets how often each bass note plays. |
| **INT** | Average interval size between notes. 50% is the original melody. Best used between roughly 20% and 80% (see limitations). Melody only. |
| **BASS MODE** | Points that deck's knobs and VOL slider at the bass line instead of the melody. Press again to go back. |

The `DEN` and `INT` knobs sit at 50% by default (no change). If both are moved, the one further from 50% is the one applied.

The status bar at the bottom shows playback state, MIDI connection, the current step, and `α`. With a MIDI controller connected, every control above also responds to the mapping in the next section.

## MIDI mapping

If a MIDI input is connected, it is picked up automatically. MIDI *output* is routed to a port named `MiniFuse 4` if present (the interface I use to drive the Disklavier), otherwise to the first available output.

Deck A / Deck B notes (note-on):

| Function | Deck A | Deck B |
|---|---|---|
| Play / pause | 74 | 64 |
| Previous chunk | 65 | 59 |
| Next chunk | 68 | 60 |
| Loop | 66 | 61 |
| Reverse | 69 | 62 |
| Bass mode | 67 | 63 |
| Hot cues 1–4 | 73, 72, 71, 70 | 58, 57, 56, 55 |

Hot cues: tap to jump to a cue; double-tap quickly to clear it.

Continuous controls (CC):

| Control | Deck A | Deck B |
|---|---|---|
| `OCT` octave shift (−2…+2) | 22 | 20 |
| `INT` interval size | 23 | 21 |
| `LEN` note length | 24 | 30 |
| `DEN` note density | 27 | 33 |
| `SWG` swing | 26 | 32 |
| `PCH` pitch shift (−12…+12 semitones) | 25 | 31 |
| Velocity slider | 28 | 29 |

Global: crossfader = CC 12, tempo = CC 10 (60–200 BPM), jog / scrub = CC 9 and CC 11.

## Repository layout

| Path | What it is |
|---|---|
| `neural-dj-v4.html` | The whole app: UI, playback, MIDI handling, and interpolation logic |
| `song-chunks.js` | Melody and bass chunks (and BPM) for the four songs, as note data |
| `libraries/` | `musicvae.js` (Magenta.js), `tone.js`, `p5.js`, `StartAudioContext.js` |
| `data/mel_small/` | MusicVAE `mel_2bar_small` checkpoint (256-d latent) |
| `data/density_vector.json`, `data/interval_vector.json` | Attribute vectors in latent space |
| `data/density_variants.json`, `data/interval_variants.json` | Precomputed variants for 4 songs (Avril 14th, Galore, Veridis Quo, Rosalia), 11 levels per chunk |
| `data/densityvector.py` | Script that computes the density attribute vector from a MIDI dataset |
| `scripts/` | Scripts that extract chunks from a MIDI corpus, compute the interval vector, and generate the density and interval variants |
| `package.json` | Node dependencies for the scripts (`npm install`) |
| `data/*_validation.{csv,json}`, `data/song_stats.csv` | Validation results for the attribute vectors and interpolation |
| `data/figures/` | Plots generated from the validation results (PNG + PDF) |
| `data/piano/` | Local copy of the 88 piano samples |

### Regenerating the attribute vectors and variants

The `DEN` and `INT` knobs each use a direction in MusicVAE's latent space (`data/density_vector.json`, `data/interval_vector.json`) and per-chunk variants precomputed along it. Both vectors are built the same way: encode a corpus of 2-bar chunks, then take the mean latent vector of the top quartile for that attribute minus the mean of the bottom quartile (densest minus sparsest for density, widest-leaping minus most stepwise for interval).

1. **Extract chunks** from a MIDI corpus such as Lakh MIDI:

   ```bash
   pip install pretty_midi tqdm
   python3 scripts/extract_chunks_to_json.py \
     --midi_dir /path/to/lakh_midi \
     --output chunks.json \
     --max_files 5000
   ```

2. **Density vector** (Python, uses Magenta):

   ```bash
   pip install magenta pretty_midi numpy tqdm
   python3 data/densityvector.py \
     --midi_dir /path/to/lakh_midi \
     --checkpoint data/mel_small \
     --output_dir data \
     --max_files 5000
   ```

3. **Interval vector** (Node). The scripts load the checkpoint over HTTP, so serve the repo on port 8081 in a second terminal:

   ```bash
   npm install
   python3 -m http.server 8081          # second terminal, from the repo root
   node scripts/compute_interval_vector.js chunks.json
   ```

4. **Variants.** Each chunk of the four songs is encoded, shifted along the vector at 11 levels (one per knob position), and decoded:

   ```bash
   node scripts/compute_density_variants.js
   node scripts/compute_interval_variants.js
   ```

   The density variants shift by up to ±2 times the density vector. The interval variants shift by up to ±15 times the interval vector by default, which can be changed with `MAX_SHIFT`, for example `MAX_SHIFT=6 node scripts/compute_interval_variants.js`.

## Limitations and ideas

This is a research prototype, and there are things I plan to improve:

- **Bring your own melodies.** Only the four included songs are available. The `DEN` and `INT` variants are precomputed for them, so loading your own MIDI file or drawing a melody in a piano roll would also need those variants to be computed live.
- **Simpler bass controls.** Bass Mode reuses the same knobs for the melody and the bass, which hides the bass controls behind a button.
- **Combined attribute control.** `DEN` and `INT` currently don't combine, so only the one further from 50% is applied.
- **`INT` at its extremes.** Between roughly 20% and 80% the knob changes the melody smoothly, but near 0% and 100% the decoded melody collapses into a few notes, with very large leaps at 100%. The interval variants shift each chunk by up to ±15 times the interval vector, about 2.6 times further in latent space than the density variants, which pushes the decoder outside the melodies it handles well. Regenerating them with a smaller `MAX_SHIFT` (see above) is the planned fix.
- **Browser support.** Web MIDI is not available in Safari, so a hardware controller needs Chrome or Edge.

## Acknowledgments

This project builds directly on [Magenta](https://magenta.tensorflow.org/)'s **Melody Mixer** demo and the **MusicVAE** model:

- Roberts et al., *A Hierarchical Latent Vector Model for Learning Long-Term Structure in Music*, ICML 2018.
- Magenta.js, Tone.js, and p5.js for the in-browser model, audio, and drawing.
- The [Lakh MIDI Dataset](https://colinraffel.com/projects/lmd/) (CC BY 4.0) for computing the attribute vectors. Colin Raffel. *Learning-Based Methods for Comparing Sequences, with Applications to Audio-to-MIDI Alignment and Matching.* PhD Thesis, 2016.

Thank you to my thesis advisor, Dr. Magdalena Fuentes.

## Songs

The four songs on the decks are transcriptions of parts of existing music, used for research and demonstration. The compositions belong to their rights holders:

- *Avril 14th* by Aphex Twin
- *Veridis Quo* by Daft Punk
- *Berghain* by Rosalía (listed as "Rosalia" on the deck)
- *Galore* by Oklou

## License

Released under the [Apache License 2.0](LICENSE), the same license as Melody Mixer, which this project extends. Bundled libraries, data and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The song transcriptions in `song-chunks.js` are not covered by this license.
