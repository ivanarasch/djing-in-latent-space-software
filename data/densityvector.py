"""
compute_density_vector.py

Computes MusicVAE attribute vector for note density only.

Usage:
  python3 compute_density_vector.py \
    --midi_dir /path/to/lakh_midi \
    --checkpoint /path/to/mel_small \
    --output_dir /path/to/demo_4/data \
    --max_files 5000

Requirements:
  pip install magenta pretty_midi numpy tqdm
"""

import os
import json
import argparse
import numpy as np
import pretty_midi
from tqdm import tqdm


def note_density(notes):
    return len(notes) / 8.0


def is_monophonic(instrument):
    notes = sorted(instrument.notes, key=lambda n: n.start)
    for i in range(1, len(notes)):
        if notes[i].start < notes[i-1].end - 0.05:
            return False
    return True


def extract_2bar_chunks(midi_path, bpm=120, bars=2):
    try:
        pm = pretty_midi.PrettyMIDI(midi_path)
    except Exception:
        return []

    melody_track = None
    best_count = 0
    for inst in pm.instruments:
        if inst.is_drum:
            continue
        if len(inst.notes) > best_count and is_monophonic(inst):
            melody_track = inst
            best_count = len(inst.notes)

    if melody_track is None or len(melody_track.notes) < 4:
        return []

    seconds_per_bar = (60.0 / bpm) * 4
    chunk_duration = seconds_per_bar * bars
    chunks = []
    end_time = max(n.end for n in melody_track.notes)
    t = 0.0
    while t + chunk_duration <= end_time:
        chunk_notes = [n for n in melody_track.notes if n.start >= t and n.start < t + chunk_duration]
        if len(chunk_notes) >= 2:
            shifted = [pretty_midi.Note(velocity=n.velocity, pitch=n.pitch, start=n.start - t, end=min(n.end - t, chunk_duration)) for n in chunk_notes]
            chunks.append(shifted)
        t += chunk_duration
    return chunks


def notes_to_note_sequence(notes, bpm=120, total_steps=32, steps_per_quarter=4):
    from note_seq import NoteSequence
    ns = NoteSequence()
    ns.tempos.add(qpm=bpm)
    ns.quantization_info.steps_per_quarter = steps_per_quarter
    seconds_per_step = (60.0 / bpm) / steps_per_quarter
    for n in notes:
        start_step = int(round(n.start / seconds_per_step))
        end_step = max(int(round(n.end / seconds_per_step)), start_step + 1)
        end_step = min(end_step, total_steps)
        if start_step >= total_steps:
            continue
        note = ns.notes.add()
        note.pitch = n.pitch
        note.velocity = n.velocity
        note.quantized_start_step = start_step
        note.quantized_end_step = end_step
        note.instrument = 0
        note.program = 0
    ns.total_quantized_steps = total_steps
    return ns


def main(args):
    print(f'Scanning {args.midi_dir} for MIDI files...')
    midi_files = []
    for root, _, files in os.walk(args.midi_dir):
        for f in files:
            if f.endswith('.mid') or f.endswith('.midi'):
                midi_files.append(os.path.join(root, f))
        if len(midi_files) >= args.max_files:
            break
    midi_files = midi_files[:args.max_files]
    print(f'Found {len(midi_files)} MIDI files')

    all_chunks = []
    all_densities = []
    print('Extracting chunks...')
    for path in tqdm(midi_files):
        for chunk in extract_2bar_chunks(path):
            all_chunks.append(chunk)
            all_densities.append(note_density(chunk))

    print(f'Extracted {len(all_chunks)} chunks')
    if len(all_chunks) < 100:
        print('WARNING: very few chunks, results may be unreliable')

    print('Loading MusicVAE model...')
    from magenta.models.music_vae import TrainedModel, configs
    config = configs.CONFIG_MAP['cat-mel_2bar_small']
    model = TrainedModel(config, batch_size=64, checkpoint_dir_or_path=args.checkpoint)

    print('Encoding chunks...')
    note_sequences = [notes_to_note_sequence(c) for c in all_chunks]
    z_all = []
    for i in tqdm(range(0, len(note_sequences), 64)):
        try:
            z, _, _ = model.encode(note_sequences[i:i+64])
            z_all.append(z)
        except Exception as e:
            print(f'  batch {i} failed: {e}')
    if not z_all:
        print('ERROR: nothing encoded'); return

    z_all = np.concatenate(z_all, axis=0)
    print(f'Encoded {z_all.shape[0]} chunks, dim {z_all.shape[1]}')

    print('Computing density vector...')
    densities = np.array(all_densities[:z_all.shape[0]])
    q = len(densities) // 4
    sorted_idx = np.argsort(densities)
    density_vector = z_all[sorted_idx[-q:]].mean(axis=0) - z_all[sorted_idx[:q]].mean(axis=0)
    print(f'Vector norm: {np.linalg.norm(density_vector):.3f}')

    os.makedirs(args.output_dir, exist_ok=True)
    out_path = os.path.join(args.output_dir, 'density_vector.json')
    with open(out_path, 'w') as f:
        json.dump(density_vector.tolist(), f)
    print(f'Saved to {out_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--midi_dir',   required=True)
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--output_dir', required=True)
    parser.add_argument('--max_files',  type=int, default=5000)
    main(parser.parse_args())