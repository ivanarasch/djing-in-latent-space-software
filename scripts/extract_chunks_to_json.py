"""
Step 1: extract_chunks_to_json.py
Extracts 2-bar monophonic chunks from Lakh MIDI and saves them as JSON.
Needs pretty_midi and tqdm only (no magenta).

Usage:
  python3 scripts/extract_chunks_to_json.py \
    --midi_dir /path/to/lakh_midi \
    --output chunks.json \
    --max_files 5000
"""

import os
import json
import argparse
import pretty_midi
from tqdm import tqdm


def is_monophonic(instrument):
    notes = sorted(instrument.notes, key=lambda n: n.start)
    for i in range(1, len(notes)):
        if notes[i].start < notes[i-1].end - 0.05:
            return False
    return True


def extract_2bar_chunks(midi_path, bpm=120):
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
    chunk_duration = seconds_per_bar * 2
    chunks = []
    end_time = max(n.end for n in melody_track.notes)
    t = 0.0
    while t + chunk_duration <= end_time:
        chunk_notes = [n for n in melody_track.notes if n.start >= t and n.start < t + chunk_duration]
        if len(chunk_notes) >= 2:
            # convert to simple dicts, normalize time to start at 0
            notes_json = []
            for n in chunk_notes:
                notes_json.append({
                    'pitch': n.pitch,
                    'velocity': n.velocity,
                    'start': n.start - t,
                    'end': min(n.end - t, chunk_duration)
                })
            density = len(chunk_notes) / 8.0
            chunks.append({'notes': notes_json, 'density': density})
        t += chunk_duration
    return chunks


def main(args):
    print(f'Scanning {args.midi_dir}...')
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
    for path in tqdm(midi_files):
        all_chunks.extend(extract_2bar_chunks(path))

    print(f'Extracted {len(all_chunks)} chunks')
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(all_chunks, f)
    print(f'Saved to {args.output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--midi_dir',  required=True)
    parser.add_argument('--output',    required=True)
    parser.add_argument('--max_files', type=int, default=5000)
    main(parser.parse_args())
