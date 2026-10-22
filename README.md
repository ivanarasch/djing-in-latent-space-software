# DJing in Latent Space

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
| `data/*_validation.{csv,json}`, `data/song_stats.csv` | Validation results for the attribute vectors and interpolation |
| `data/figures/` | Plots generated from the validation results (PNG + PDF) |
| `data/piano/` | Local copy of the 88 piano samples |

### Regenerating the density vector

```bash
pip install magenta pretty_midi numpy tqdm
python3 data/densityvector.py \
  --midi_dir /path/to/lakh_midi \
  --checkpoint data/mel_small \
  --output_dir data \
  --max_files 5000
```

It extracts monophonic 2-bar chunks from a MIDI corpus, encodes them with the MusicVAE checkpoint, and takes the difference between the mean latent vector of the densest and sparsest quartiles of chunks as the "note density" direction.

## Acknowledgments

This project builds directly on [Magenta](https://magenta.tensorflow.org/)'s **Melody Mixer** demo and the **MusicVAE** model:

- Roberts et al., *A Hierarchical Latent Vector Model for Learning Long-Term Structure in Music*, ICML 2018.
- Magenta.js, Tone.js, and p5.js for the in-browser model, audio, and drawing.
- The Lakh MIDI Dataset (Raffel, 2016) for computing the attribute vectors.

Thank you to my thesis advisor, Dr. Magdalena Fuentes.

Third-party code and assets in `libraries/`, `data/mel_small/`, `data/piano/`, and `data/images/` retain their original licenses (Magenta's Melody Mixer is released under Apache 2.0).
