from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def _read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text(encoding="utf-8")


def test_app_contains_primary_ui_entrypoints() -> None:
    app = _read("App.tsx")
    assert "ENTER ROOM" in app
    assert "Tap to enable audio" in app
    assert "<Visualizer" in app
    assert "<Mixer" in app


def test_app_keeps_music_panel_controls() -> None:
    app = _read("App.tsx")
    assert "Avoid Leading Tone" in app
    assert "No Immediate Repeat" in app
    assert "No 3rd Filter" in app
    assert "Scale:" in app


def test_app_knobs_remain_connected_to_audio_service() -> None:
    app = _read("App.tsx")
    assert "audioService.setReverbWet(v);" in app
    assert "audioService.setPingPongWet(v);" in app


def test_visualizer_canvas_pointer_interactions_are_bound() -> None:
    visualizer = _read("components/Visualizer.tsx")
    assert "onPointerDown={handlePointerDown}" in visualizer
    assert "onPointerMove={handlePointerMove}" in visualizer
    assert "onPointerUp={handlePointerUp}" in visualizer
    assert "onPointerCancel={handlePointerUp}" in visualizer
    assert "onPointerLeave={handlePointerUp}" in visualizer


def test_mixer_source_controls_and_actions_exist() -> None:
    mixer = _read("components/Mixer.tsx")
    assert "SYNTH ON" in mixer
    assert "SYNTH OFF" in mixer
    assert "Load Samples" in mixer
    assert "MIC0{idx + 1}" in mixer
    assert "SMP0{idx + 1}" in mixer
    assert "audioService.setSynthEnabled(!bank.synthEnabled);" in mixer
    assert "audioService.clearMicSlot(slot);" in mixer
    assert "audioService.clearSampleSlot(slot);" in mixer
