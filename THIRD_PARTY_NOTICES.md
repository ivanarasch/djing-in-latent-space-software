# Third-party notices

This project is released under the Apache License 2.0 (see [LICENSE](LICENSE)). It includes or builds on the following work.

| Component | Used for | License | Source |
|---|---|---|---|
| Melody Mixer (Google Creative Lab) | The app is extended from this demo | Apache 2.0 | [googlecreativelab/melody-mixer](https://github.com/googlecreativelab/melody-mixer) |
| Magenta.js / MusicVAE (`libraries/musicvae.js`) | In-browser model code | Apache 2.0, Copyright 2016 The Magenta Team | [magenta/magenta-js](https://github.com/magenta/magenta-js) |
| Tone.js (`libraries/tone.js`) | Audio and transport | MIT, Copyright 2014-2015 Yotam Mann | [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) |
| StartAudioContext (`libraries/StartAudioContext.js`) | Starting audio on user interaction | MIT, Copyright 2016 Yotam Mann | [tambien/StartAudioContext](https://github.com/tambien/StartAudioContext) |
| p5.js v0.5.7 (`libraries/p5.js`) | Drawing | LGPL 2.1 | [processing/p5.js](https://github.com/processing/p5.js) |

Full texts for the bundled libraries are in [`libraries/licenses/`](libraries/licenses/).

## Data

- **Lakh MIDI Dataset** (Colin Raffel), used to compute the density and interval attribute vectors. The dataset is not included in this repository, only vectors derived from it. It is distributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Reference: Colin Raffel. *Learning-Based Methods for Comparing Sequences, with Applications to Audio-to-MIDI Alignment and Matching.* PhD Thesis, 2016. <https://colinraffel.com/projects/lmd/>
- **MusicVAE checkpoint** (`data/mel_small/`) and **piano samples** (`data/piano/`). The checkpoint weights (`mel_2bar_small`) and the 88 piano samples were copied from the [Melody Mixer](https://github.com/googlecreativelab/melody-mixer) repository (`demo_1/data/mel_small` and `demo_3/data/piano`), which is released under Apache 2.0. `config.json` and `weights_manifest.json` in the checkpoint folder are adapted configuration files.
- **Song note data** (`song-chunks.js`) is a transcription of melody and bass parts of existing songs by other artists, used here for research and demonstration. Those compositions remain the property of their rights holders and are not covered by this repository's license:
  - *Avril 14th* by Aphex Twin
  - *Veridis Quo* by Daft Punk
  - *Berghain* by Rosalía (the "Rosalia" deck entry)
  - *Galore* by Oklou
