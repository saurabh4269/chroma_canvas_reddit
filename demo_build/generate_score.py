#!/usr/bin/env python3
"""Sunny arcade demo score — original, deterministic, no dependencies.

Bright major-key trailer energy for a coral/sky/cream platformer film:
bouncy pulse, clear motif, scene-lift stingers. Not dark ambient.
"""

from __future__ import annotations

import argparse
import math
import struct
import wave
from pathlib import Path

# C major / relative brightness (Hz)
NOTE = {
    "C2": 65.41,
    "G2": 98.00,
    "C3": 130.81,
    "E3": 164.81,
    "F3": 174.61,
    "G3": 196.00,
    "A3": 220.00,
    "B3": 246.94,
    "C4": 261.63,
    "D4": 293.66,
    "E4": 329.63,
    "F4": 349.23,
    "G4": 392.00,
    "A4": 440.00,
    "B4": 493.88,
    "C5": 523.25,
    "D5": 587.33,
    "E5": 659.25,
    "F5": 698.46,
    "G5": 783.99,
    "A5": 880.00,
    "C6": 1046.50,
}

# I – V – vi – IV loop (sunny pop)
CHORDS = (
    ("C3", "E3", "G3", "C4"),
    ("G2", "B3", "D4", "G4"),
    ("A3", "C4", "E4", "A4"),
    ("F3", "A3", "C4", "F4"),
)

# Catchy 2-bar motif (sixteenth grid within a bar of 4)
MOTIF = (
    (0.00, "E5", 0.18),
    (0.25, "G5", 0.18),
    (0.50, "C6", 0.34),
    (1.00, "A5", 0.18),
    (1.25, "G5", 0.18),
    (1.50, "E5", 0.34),
    (2.00, "D5", 0.18),
    (2.25, "E5", 0.18),
    (2.50, "G5", 0.34),
    (3.00, "C5", 0.45),
)

# Absolute scene starts matching src/storyboard.ts (gameplay ≈ 34.67s)
DEFAULT_SCENE_STARTS = (0.0, 3.0, 7.0, 42.17, 47.17)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate sunny arcade demo score")
    parser.add_argument("output", type=Path)
    parser.add_argument("--duration", type=float, default=54.0)
    parser.add_argument("--sample-rate", type=int, default=44_100)
    parser.add_argument("--bpm", type=float, default=128.0)
    parser.add_argument(
        "--scene-starts",
        type=str,
        default=",".join(str(s) for s in DEFAULT_SCENE_STARTS),
        help="Comma-separated scene start times in seconds",
    )
    return parser.parse_args()


def _clamp(value: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return lo if value < lo else hi if value > hi else value


def _noise(sample_index: int, salt: float) -> float:
    n = math.sin(sample_index * 12.9898 + salt) * 43_758.5453
    return (n - math.floor(n)) * 2.0 - 1.0


def _env_pluck(phase: float, length: float) -> float:
    if phase < 0.0 or phase > length:
        return 0.0
    attack = min(1.0, phase / 0.008)
    return attack * math.exp(-phase * (3.2 / max(0.05, length)))


def _env_pad(phase: float, length: float) -> float:
    if phase < 0.0 or phase > length:
        return 0.0
    attack = min(1.0, phase / 0.12)
    release = min(1.0, (length - phase) / 0.18)
    return attack * release


def _tone(freq: float, t: float, bright: float = 0.18) -> float:
    """Soft triangle-ish tone: fundamental + light odd harmonics."""
    w = 2 * math.pi * freq * t
    return (
        math.sin(w) * 0.72
        + math.sin(2 * w) * bright * 0.35
        + math.sin(3 * w) * bright * 0.18
        + math.sin(4 * w) * bright * 0.08
    )


def _scene_energy(t: float, scenes: tuple[float, ...], duration: float) -> tuple[float, float, float, float]:
    """Return (pad, pulse, motif, sparkle) gains by storyboard section."""
    cold, mech, play, community, close = scenes
    if t < mech:
        # Cold open: motif + sparkle, almost no kick
        return 0.35, 0.12, 0.95, 0.85
    if t < play:
        # Mechanism: groove enters
        return 0.55, 0.55, 0.85, 0.70
    if t < community:
        # Gameplay: full sunny arcade drive
        return 0.70, 1.0, 1.0, 0.95
    if t < close:
        # Community: warmer lift
        return 0.80, 0.75, 1.05, 1.05
    # Close: resolve, keep motif bright
    fade = max(0.35, 1.0 - (t - close) / max(0.5, duration - close))
    return 0.65 * fade, 0.45 * fade, 1.0, 0.9


def _stinger(t: float, start: float, kind: int) -> float:
    phase = t - start
    if phase < 0.0 or phase > 0.55:
        return 0.0
    env = math.exp(-phase * 6.5) * min(1.0, phase / 0.01)
    if kind == 0:
        # Cold-open chime cluster
        return (
            _tone(NOTE["C5"], phase, 0.3) * 0.16
            + _tone(NOTE["E5"], phase, 0.28) * 0.14
            + _tone(NOTE["G5"], phase, 0.25) * 0.12
        ) * env
    if kind == 1:
        # Mechanism: playful up-sweep
        freq = 320 + 520 * min(1.0, phase / 0.22)
        return _tone(freq, phase, 0.22) * env * 0.18
    if kind == 2:
        # Gameplay drop-in
        return (
            _tone(NOTE["G4"], phase, 0.2) * 0.12
            + _tone(NOTE["C5"], phase, 0.25) * 0.14
            + _tone(NOTE["E5"], phase, 0.22) * 0.11
        ) * env
    if kind == 3:
        # Community warm lift
        return (
            _tone(NOTE["F4"], phase, 0.2) * 0.11
            + _tone(NOTE["A4"], phase, 0.22) * 0.13
            + _tone(NOTE["C5"], phase, 0.2) * 0.12
            + _tone(NOTE["F5"], phase, 0.18) * 0.10
        ) * env
    # Close tag
    return (
        _tone(NOTE["C5"], phase, 0.22) * 0.14
        + _tone(NOTE["G5"], phase, 0.2) * 0.12
        + _tone(NOTE["C6"], phase, 0.18) * 0.10
    ) * env


def render(
    output: Path,
    duration: float,
    sample_rate: int,
    bpm: float,
    scene_starts: tuple[float, ...],
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    beat = 60.0 / bpm
    bar = beat * 4.0
    scenes = scene_starts if len(scene_starts) >= 5 else DEFAULT_SCENE_STARTS

    def master_envelope(t: float) -> float:
        fade_in = min(1.0, t / 0.9)
        fade_out = min(1.0, (duration - t) / 2.4)
        return max(0.0, min(fade_in, fade_out))

    def value(sample_index: int) -> tuple[int, int]:
        t = sample_index / sample_rate
        pad_g, pulse_g, motif_g, sparkle_g = _scene_energy(t, scenes, duration)

        # --- Warm major pad (chord loop) ---
        chord_index = int(t / bar) % len(CHORDS)
        chord = CHORDS[chord_index]
        chord_phase = t % bar
        pad = 0.0
        for i, name in enumerate(chord):
            pad += _tone(NOTE[name], t, 0.12) * _env_pad(chord_phase, bar) * (0.045 - i * 0.004)
        # Octave shimmer above pad
        pad += _tone(NOTE[chord[-1]] * 2.0, t, 0.08) * 0.018
        # Soft sub for body (kept light — not horror drone)
        root = NOTE[chord[0]]
        pad += math.sin(2 * math.pi * root * t) * 0.04

        # --- Bouncy pulse: kick + soft clap ---
        beat_phase = t % beat
        beat_i = int(t / beat) % 4
        kick = 0.0
        if beat_i in (0, 2) and beat_phase <= 0.14:
            freq = 140 - 70 * (beat_phase / 0.14)
            kick = math.sin(2 * math.pi * freq * beat_phase) * math.exp(-beat_phase * 28) * 0.22
        clap = 0.0
        if beat_i in (1, 3) and beat_phase <= 0.08:
            clap = _noise(sample_index, 1.7) * math.exp(-beat_phase * 55) * 0.09
            clap += _tone(1800, beat_phase, 0.05) * math.exp(-beat_phase * 40) * 0.03

        # Soft 8th-note sparkle hat
        eighth = beat / 2
        eighth_phase = t % eighth
        hat = 0.0
        if eighth_phase <= 0.035:
            hat = _noise(sample_index, 3.1) * math.exp(-eighth_phase * 90) * 0.045

        # --- Motif (melody) ---
        motif_bar_t = t % (bar * 2)
        motif = 0.0
        for start, name, length in MOTIF:
            phase = motif_bar_t - start
            if 0 <= phase <= length + 0.05:
                motif += _tone(NOTE[name], phase, 0.28) * _env_pluck(phase, length) * 0.17

        # Answer phrase in bars 2 of every 4 (call/response)
        if int(t / bar) % 4 == 3:
            answer_t = t % bar
            for start, name, length in (
                (0.0, "G5", 0.2),
                (0.5, "E5", 0.2),
                (1.0, "C5", 0.35),
            ):
                phase = answer_t - start
                if 0 <= phase <= length:
                    motif += _tone(NOTE[name], phase, 0.24) * _env_pluck(phase, length) * 0.12

        # --- Plucky arpeggio under motif ---
        step = beat / 2
        arp_i = int(t / step) % 4
        arp_phase = t % step
        arp_note = chord[arp_i % len(chord)]
        arp = _tone(NOTE[arp_note] * 2, arp_phase, 0.2) * _env_pluck(arp_phase, step * 0.85) * 0.07

        # --- Scene stingers ---
        stinger = 0.0
        for kind, start in enumerate(scenes[:5]):
            stinger += _stinger(t, start, kind)

        # Extra mid-gameplay accents (climb energy)
        if scenes[2] <= t < scenes[3]:
            for hit in (4.0, 12.0, 20.0, 28.0):
                stinger += _stinger(t, scenes[2] + hit, 2) * 0.55

        mixed = (
            pad * pad_g * 1.15
            + (kick + clap) * pulse_g * 1.25
            + hat * sparkle_g * 1.15
            + motif * motif_g * 1.35
            + arp * (0.55 + 0.45 * pulse_g) * 1.2
            + stinger * 1.15
        ) * master_envelope(t) * 1.25

        # Soft stereo: motif/sparkle slight width, pad centered
        width = (motif * 0.08 + hat * 0.12 + stinger * 0.06) * sparkle_g
        left = _clamp(mixed + width)
        right = _clamp(mixed - width)
        return int(left * 32_767), int(right * 32_767)

    with wave.open(str(output), "wb") as audio:
        audio.setnchannels(2)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        chunk = bytearray()
        total = int(sample_rate * duration)
        for sample_index in range(total):
            chunk.extend(struct.pack("<hh", *value(sample_index)))
            if len(chunk) >= 256 * 1024:
                audio.writeframesraw(chunk)
                chunk.clear()
        if chunk:
            audio.writeframesraw(chunk)


def main() -> None:
    args = parse_args()
    if args.duration <= 0 or args.sample_rate <= 0 or args.bpm <= 0:
        raise SystemExit("duration, sample rate, and BPM must be positive")
    starts = tuple(float(part.strip()) for part in args.scene_starts.split(",") if part.strip())
    if len(starts) < 2:
        raise SystemExit("need at least two scene start times")
    render(args.output, args.duration, args.sample_rate, args.bpm, starts)
    print(f"generated sunny score {args.output} ({args.duration:.2f}s @ {args.bpm:.0f} bpm)")


if __name__ == "__main__":
    main()
