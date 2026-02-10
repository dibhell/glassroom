import pytest

from tests.ts_runner import run_ts_json


def _run_notes_cases() -> dict:
    script = """
import {
  pitchClassToNoteName,
  noteNameToPitchClass,
  noteNameToMidi,
  midiToNoteName,
  midiToFreq,
  freqToMidi,
  snapMidiToPitchClass,
} from './src/music/notes.ts';

const payload = {
  negPitchClass: pitchClassToNoteName(-1),
  sharpPitchClass: noteNameToPitchClass('F#'),
  c4Midi: noteNameToMidi('C', 4),
  midiName61: midiToNoteName(61),
  a4Freq: midiToFreq(69),
  a4Midi: freqToMidi(440),
  nanMidiFreqFallback: midiToFreq(Number.NaN),
  invalidFreqMidiFallback: freqToMidi(-100),
  snapToCSharp: snapMidiToPitchClass(60.2, 1),
  snapFromNan: snapMidiToPitchClass(Number.NaN, 9),
  roundTripMidi: freqToMidi(midiToFreq(57.3)),
};

console.log(JSON.stringify(payload));
"""
    return run_ts_json(script)


@pytest.fixture(scope="module")
def cases() -> dict:
    return _run_notes_cases()


def test_pitch_class_wrapping_and_lookup(cases: dict) -> None:
    assert cases["negPitchClass"] == "B"
    assert cases["sharpPitchClass"] == 6


def test_note_name_and_midi_mapping(cases: dict) -> None:
    assert cases["c4Midi"] == 60
    assert cases["midiName61"] == "C#"


def test_frequency_and_midi_conversions(cases: dict) -> None:
    assert cases["a4Freq"] == pytest.approx(440.0)
    assert cases["a4Midi"] == pytest.approx(69.0)
    assert cases["nanMidiFreqFallback"] == pytest.approx(440.0)
    assert cases["invalidFreqMidiFallback"] == pytest.approx(69.0)


def test_snap_to_target_pitch_class(cases: dict) -> None:
    assert cases["snapToCSharp"] == 61
    assert cases["snapFromNan"] == 69


def test_midi_freq_round_trip_is_stable(cases: dict) -> None:
    assert cases["roundTripMidi"] == pytest.approx(57.3)
