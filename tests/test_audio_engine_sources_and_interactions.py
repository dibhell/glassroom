import pytest

from tests.ts_runner import run_ts_json


def _run_audio_engine_cases() -> dict:
    script = """
import { audioService } from './services/audioEngine.ts';
import { SoundType } from './types.ts';
import { getScaleById } from './src/music/scales.ts';

const engine: any = audioService;

const toLabel = (source: any) => {
  if (!source) return 'NONE';
  if (source.type === 'synth') return 'SYNTH';
  if (source.type === 'mic') return `MIC${String((source.index ?? 0) + 1).padStart(2, '0')}`;
  if (source.type === 'smp') return `SMP${String((source.index ?? 0) + 1).padStart(2, '0')}`;
  return 'UNKNOWN';
};

const calls: Record<string, Array<[number, number, number]>> = {};
const makeParam = (name: string) => ({
  setTargetAtTime(value: number, at: number, tc: number) {
    if (!calls[name]) calls[name] = [];
    calls[name].push([value, at, tc]);
  },
});

engine.clearAllSamples();
engine.setSynthEnabled(true);
const synthOnlyPool = engine.getActivePoolInfo();
const synthOnlyPick = toLabel(engine.assignSourceToBubble());

engine.setSynthEnabled(false);
engine.clearAllSamples();
const emptyPickNoSynth = toLabel(engine.assignSourceToBubble());

engine.setSynthEnabled(true);
engine.clearAllSamples();
engine.sampleBank[0] = { duration: 1 };
engine.micBank[2] = { duration: 1 };
engine.updatePlayPool();
const mixedSnapshot = engine.getBankSnapshot();
const mixedPool = engine.getActivePoolInfo();
const seq: string[] = [];
for (let i = 0; i < mixedPool.size * 2; i++) seq.push(toLabel(engine.assignSourceToBubble()));
const firstCycle = seq.slice(0, mixedPool.size);
const secondCycle = seq.slice(mixedPool.size);

const findSlotForward = engine.findSlot([{}, {}, null, null], 2);
const findSlotWrap = engine.findSlot([{}, null, {}, {}], 3);
const findSlotFull = engine.findSlot([{}, {}, {}], 1);

engine.setSynthEnabled(false);
engine.setSoundType(SoundType.SAMPLE);
const synthAfterSample = engine.getBankSnapshot().synthEnabled;
engine.setSoundType(SoundType.SYNTH);
const synthAfterSynth = engine.getBankSnapshot().synthEnabled;

engine.clearAllSamples();
engine.setSynthEnabled(true);
engine.sampleBank[0] = { duration: 1 };
engine.sampleBank[1] = { duration: 1 };
engine.micBank[0] = { duration: 1 };
engine.updatePlayPool();
engine.clearSampleSlot(1);
engine.clearMicSlot(0);
const clearedSnapshot = engine.getBankSnapshot();

engine.ctx = { currentTime: 12.5 };
engine.reverbGain = { gain: makeParam('reverbWet') };
engine.dryGain = { gain: makeParam('dryGain') };
engine.pingPongReturn = { gain: makeParam('pingWet') };
engine.feedbackL = { gain: makeParam('feedbackL') };
engine.feedbackR = { gain: makeParam('feedbackR') };
engine.delayL = { delayTime: makeParam('delayL') };
engine.delayR = { delayTime: makeParam('delayR') };
engine.lastDelayTimes = null;
engine.lastAudioSettings = { baseFrequency: 440 };
engine.lastMusicSettings = {
  root: 0,
  scaleId: 'ionian',
  scaleIndex: 0,
  quantizeEnabled: true,
  noImmediateRepeat: false,
  avoidLeadingTone: false,
  noThirds: false,
};
engine.granularNode = {
  parameters: new Map([
    ['stretch', makeParam('stretch')],
    ['mix', makeParam('mix')],
    ['grainSize', makeParam('grainSize')],
  ]),
};

const lofiEnabledCalls: boolean[] = [];
const lofiParamsCalls: any[] = [];
engine.masterLofi = {
  setEnabled(enabled: boolean) { lofiEnabledCalls.push(enabled); },
  setParams(params: any) { lofiParamsCalls.push(params); },
  dispose() {},
};

engine.setReverbWet(2);
engine.setReverbWet(-1);
engine.setPingPongWet(2);
engine.setPingPongWet(Number.NaN);
engine.setLofiEnabled(true);
engine.setLofiParams({ drive: 2, tape: -1, crush: 0.4 });
engine.setLofiParams({ drive: Number.NaN });

const nonDroneScale = getScaleById('ionian');
const droneScale = getScaleById('drone-1-3');
const nonDroneReferenceEqual = engine.getScaleForQuantize(nonDroneScale) === nonDroneScale;
engine.droneScaleId = null;
engine.dronePool = null;
engine.droneTriggerCount = 0;
const droneA = engine.getScaleForQuantize(droneScale);
const droneB = engine.getScaleForQuantize(droneScale);

console.log(JSON.stringify({
  synthOnlyPoolSize: synthOnlyPool.size,
  synthOnlyPoolLabels: synthOnlyPool.labels,
  synthOnlyPick,
  emptyPickNoSynth,
  mixedSnapshot,
  mixedPoolSize: mixedPool.size,
  firstCycle,
  secondCycle,
  findSlotForward,
  findSlotWrap,
  findSlotFull,
  synthAfterSample,
  synthAfterSynth,
  clearedSnapshot,
  calls,
  lofiEnabledCalls,
  lofiParamsCalls,
  lofiParamsInternal: engine.lofiParams,
  nonDroneReferenceEqual,
  droneAIntervals: droneA.intervals,
  droneBIntervals: droneB.intervals,
  droneBaseIntervals: droneScale.intervals,
  droneTriggerCount: engine.droneTriggerCount,
}));
"""
    return run_ts_json(script)


@pytest.fixture(scope="module")
def cases() -> dict:
    return _run_audio_engine_cases()


def test_synth_only_pool_defaults_to_three_entries(cases: dict) -> None:
    assert cases["synthOnlyPoolSize"] == 3
    assert all(label == "SYNTH" for label in cases["synthOnlyPoolLabels"])
    assert cases["synthOnlyPick"] == "SYNTH"


def test_empty_pool_returns_none_when_synth_disabled(cases: dict) -> None:
    assert cases["emptyPickNoSynth"] == "NONE"


def test_mixed_sources_expose_snapshot_and_round_robin(cases: dict) -> None:
    assert cases["mixedSnapshot"]["smp"][0] is True
    assert cases["mixedSnapshot"]["mic"][2] is True
    assert cases["mixedSnapshot"]["synthEnabled"] is True
    assert cases["mixedPoolSize"] == 3
    assert cases["firstCycle"] == cases["secondCycle"]


def test_find_slot_supports_forward_search_wrap_and_full(cases: dict) -> None:
    assert cases["findSlotForward"] == 2
    assert cases["findSlotWrap"] == 1
    assert cases["findSlotFull"] == -1


def test_sound_type_can_reenable_synth_source(cases: dict) -> None:
    assert cases["synthAfterSample"] is False
    assert cases["synthAfterSynth"] is True


def test_slot_clearing_updates_source_bank_snapshot(cases: dict) -> None:
    assert cases["clearedSnapshot"]["smp"][0] is True
    assert cases["clearedSnapshot"]["smp"][1] is False
    assert cases["clearedSnapshot"]["mic"][0] is False


def test_reverb_pingpong_and_lofi_controls_apply_clamped_values(cases: dict) -> None:
    reverb_calls = cases["calls"]["reverbWet"]
    dry_calls = cases["calls"]["dryGain"]
    ping_calls = cases["calls"]["pingWet"]
    feedback_l = cases["calls"]["feedbackL"]
    feedback_r = cases["calls"]["feedbackR"]

    assert reverb_calls[0][0] == pytest.approx(1.0)
    assert dry_calls[0][0] == pytest.approx(0.5)
    assert reverb_calls[1][0] == pytest.approx(0.0)
    assert dry_calls[1][0] == pytest.approx(1.0)

    assert ping_calls[0][0] == pytest.approx(1.0)
    assert feedback_l[0][0] == pytest.approx(0.9)
    assert feedback_r[0][0] == pytest.approx(0.9)
    assert ping_calls[1][0] == pytest.approx(0.0)
    assert feedback_l[1][0] == pytest.approx(0.2)
    assert feedback_r[1][0] == pytest.approx(0.2)

    assert cases["lofiEnabledCalls"] == [True]
    assert cases["lofiParamsCalls"][0] == {"drive": 1, "tape": 0, "crush": 0.4}
    assert cases["lofiParamsCalls"][1] == {"drive": 1, "tape": 0, "crush": 0.4}
    assert cases["lofiParamsInternal"] == {"drive": 1, "tape": 0, "crush": 0.4}


def test_drone_scale_quantization_pool_obeys_contract(cases: dict) -> None:
    assert cases["nonDroneReferenceEqual"] is True
    assert 1 <= len(cases["droneAIntervals"]) <= 3
    assert cases["droneAIntervals"] == sorted(set(cases["droneAIntervals"]))
    assert all(interval in cases["droneBaseIntervals"] for interval in cases["droneAIntervals"])
    assert 0 in cases["droneAIntervals"]
    assert cases["droneAIntervals"] == cases["droneBIntervals"]
    assert cases["droneTriggerCount"] == 2
