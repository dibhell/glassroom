import pytest

from tests.ts_runner import run_ts_json

def _run_typescript_cases() -> dict:
    script = """
import { SCALES, getScaleById } from './src/music/scales.ts';
import { quantizeMidiToScale } from './src/music/quantize.ts';

const minorPent = getScaleById('minor-pentatonic');
const dorian = getScaleById('dorian');
const harmonicMinor = getScaleById('harmonic-minor');
const chromatic = getScaleById('chromatic');

const payload = {
  fallbackScale: getScaleById('not-existing-scale').id,
  scalesNormalized: SCALES.every((scale) =>
    scale.intervals.every((v, i, arr) => Number.isInteger(v) && v >= 0 && v <= 11 && (i === 0 || arr[i - 1] < v))
  ),
  nearestSnap: quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: 'nearest' }),
  downSnap: quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: 'down' }),
  upSnap: quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: 'up' }),
  noImmediateRepeat: quantizeMidiToScale(61, {
    rootMidi: 60,
    scale: minorPent,
    mode: 'nearest',
    noImmediateRepeat: true,
    lastMidi: 60,
  }),
  noThirdsEnabled: quantizeMidiToScale(64, { rootMidi: 60, scale: dorian, mode: 'nearest', noThirds: true }),
  noThirdsDisabled: quantizeMidiToScale(64, { rootMidi: 60, scale: dorian, mode: 'nearest' }),
  avoidLeadingToneTrue: quantizeMidiToScale(59.5, {
    rootMidi: 60,
    scale: harmonicMinor,
    mode: 'nearest',
    avoidLeadingTone: true,
  }),
  avoidLeadingToneFalse: quantizeMidiToScale(59.5, {
    rootMidi: 60,
    scale: harmonicMinor,
    mode: 'nearest',
    avoidLeadingTone: false,
  }),
  nonFiniteInputFallback: quantizeMidiToScale(Number.NaN, { rootMidi: 64, scale: chromatic, mode: 'nearest' }),
};

console.log(JSON.stringify(payload));
"""
    return run_ts_json(script)


@pytest.fixture(scope="module")
def cases() -> dict:
    return _run_typescript_cases()


def test_scale_fallback_defaults_to_minor_pentatonic(cases: dict) -> None:
    assert cases["fallbackScale"] == "minor-pentatonic"


def test_scales_are_normalized_for_pitch_classes(cases: dict) -> None:
    assert cases["scalesNormalized"] is True


def test_quantizer_respects_nearest_and_direction_modes(cases: dict) -> None:
    assert cases["nearestSnap"] == 60
    assert cases["downSnap"] == 60
    assert cases["upSnap"] == 63


def test_quantizer_avoids_immediate_repeat_when_possible(cases: dict) -> None:
    assert cases["noImmediateRepeat"] == 63


def test_quantizer_can_remove_thirds_from_scale(cases: dict) -> None:
    assert cases["noThirdsEnabled"] == 65
    assert cases["noThirdsDisabled"] == 63


def test_quantizer_can_penalize_leading_tone(cases: dict) -> None:
    assert cases["avoidLeadingToneTrue"] == 60
    assert cases["avoidLeadingToneFalse"] == 59


def test_quantizer_uses_root_for_non_finite_input(cases: dict) -> None:
    assert cases["nonFiniteInputFallback"] == 64
