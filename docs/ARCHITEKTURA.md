# Architektura aplikacji

## Przeplyw sterowania
- `App.tsx` trzyma stan pokretel, laczy ustawienia fizyki i audio, oraz
  ogranicza aktualizacje silnika do jednej na klatke.
- `components/Visualizer.tsx` rysuje scene na Canvas 2D, symuluje obiekty w 3D
  i wyzwala dzwiek przy kolizjach.
- `services/audioEngine.ts` buduje graf Web Audio (synteza lub sample, poglos,
  ping-pong delay, EQ, limiter, analyser).
- `src/music/scales.ts` i `src/music/quantize.ts` trzymaja definicje skal
  i logike mapowania MIDI do skali.

## Warstwy UI
- `components/Mixer.tsx` to transport, glosnosc, EQ i VU meter.
- `components/TapeCassette.tsx` rysuje kasete i animuje szpule w sekcji LO-FI.
- `components/Knob.tsx` to pokretlo z obsluga myszy i dotyku.
- `types.ts` opisuje kontrakty danych (AudioSettings, PhysicsSettings, MusicSettings).
 - Gyro rings i lissajous sa rysowane w `components/Visualizer.tsx` jako element HUD.

## Dzwiek
- Dwa tryby: SYNTH (oscylator) i SAMPLE (wczytany plik).
- Skala dzwiekowa zalezy od `MusicSettings` (root, skala, filtry).
- Panorama i filtracja zalezna od pozycji obiektu w scenie.
- Master chain: masterPreFX -> LO-FI -> EQ -> compressor -> limiter -> analysers -> output.
- LO-FI sklada sie z saturacji, wow/flutter i bitcrushera w AudioWorklet.

## Render
- Pseudo-3D z perspektywa (`DEPTH`, `FOCAL_LENGTH`).
- Obiekty deformuja sie w czasie, a zdarzenia zapisuje log w HUD.
- Odbicia na scianach/podlodze liczone sa wzgledem zdeformowanych plaszczyzn pokoju.
