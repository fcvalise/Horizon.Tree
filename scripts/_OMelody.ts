import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";

/** One pooled voice (an entity with an AudioGizmo tagged "Note"). */
export class NoteObject {
  constructor(
    public entity: hz.Entity,
    public audio: hz.AudioGizmo,
    public isPlaying = false,
    public timer = 0,
    public duration = 2
  ) {}
  stop() {
    // try { this.audio.stop(); } catch {}
    // this.isPlaying = false;
    // this.timer = 0;
  }
}

type ScaleName =
  | "pentMaj" | "pentMin" | "major" | "minor"
  | "dorian" | "mixolydian" | "wholeTone"
  | "hirajoshi" | "inSen";

/** Pooled, multi-scale melody player. */
export class OMelody {
  // ---- static scale & pitch tables ----
  private static readonly SCALES: Record<ScaleName, number[]> = {
    pentMaj:    [0, 2, 4, 7, 9],
    pentMin:    [0, 3, 5, 7, 10],
    major:      [0, 2, 4, 5, 7, 9, 11],
    minor:      [0, 2, 3, 5, 7, 8, 10],
    dorian:     [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    wholeTone:  [0, 2, 4, 6, 8, 10],
    hirajoshi:  [0, 2, 3, 7, 8],
    inSen:      [0, 1, 5, 7, 10],
  };
  private static readonly NOTE_INDEX: Record<string, number> = {
    C:0,"C#":1,Db:1, D:2,"D#":3,Eb:3, E:4, F:5,"F#":6,Gb:6,
    G:7,"G#":8,Ab:8, A:9,"A#":10,Bb:10, B:11
  };

  // ---- config (editable at runtime) ----
  private scale: number[] = OMelody.SCALES.pentMaj; // active scale degrees
  private keySemis = 0;           // transpose from C (e.g., A = +9)
  private transpose = 0;          // extra global transpose
  private octaves: [number, number] = [0, 1]; // 0..1 around C4→C5 if base is C4
  private stepMs = 800;           // sequence tempo (ms per step)

  // ---- pool & rng ----
  private rng: ORandom;
  private notePool: NoteObject[] = [];

  constructor(private wrapper: OWrapper) {
    const voices = this.wrapper.world.getEntitiesWithTags(["Note"]);
    for (const e of voices) {
      const giz = e.as(hz.AudioGizmo);
      if (giz) this.notePool.push(new NoteObject(e, giz));
    }
    if (this.notePool.length === 0) throw new Error("OMelody: no entities with tag 'Note'.");

    // tick voices
    this.wrapper.onUpdate((dt) => {
      for (const v of this.notePool) {
        if (!v.isPlaying) continue;
        v.timer += dt;
        if (v.timer >= v.duration) v.stop();
      }
    });

    this.rng = new ORandom("Oisif");
  }

  // ===================== Public API =====================

  /** Quick one-off when an object pops. */
  trigger(pos: hz.Vec3, idx: number) {
    const semis = this.mapToSemitones(pos, idx);
    const vel = 0.7 + 0.3 * this.rng.next();
    const dur = 0.12 + 0.08 * this.rng.next();
    this.playSemisAt(pos, semis, vel, dur);
  }

  /** Play using semitone offset (engine expects -24..+24). */
  playSemis(semitones: number, vel = 0.9, dur = 0.25) {
    this.playNote(this.clampSemis(semitones + this.keySemis + this.transpose), vel, dur);
  }

  /** Same, but position the source first (spatial audio). */
  playSemisAt(pos: hz.Vec3, semitones: number, vel = 0.9, dur = 0.25) {
    this.playNote(this.clampSemis(semitones + this.keySemis + this.transpose), vel, dur, pos);
  }

  /** Change musical scale. */
  useScale(name: ScaleName) { this.scale = OMelody.SCALES[name]; return this; }

  /** Set key by name ("A","F#") or semitone offset (number). */
  useKey(k: string | number) {
    this.keySemis = typeof k === "number" ? k : (OMelody.NOTE_INDEX[k] ?? 0);
    return this;
  }

  /** Limit/octave band (inclusive). e.g., setOctaves(0,1) ~ C4..C5 if base is C4. */
  setOctaves(minInclusive: number, maxInclusive: number) {
    this.octaves = [Math.min(minInclusive, maxInclusive), Math.max(minInclusive, maxInclusive)];
    return this;
  }

  /** Extra global transpose on top of key (clamped to engine limits). */
  setTranspose(semitones: number) {
    this.transpose = this.clampSemis(semitones);
    return this;
  }

  /** Set tempo for sequence helpers (bpm). */
  setTempo(bpm: number) {
    this.stepMs = Math.max(30, Math.floor(60000 / Math.max(1, bpm)));
    return this;
  }

  /** Play a short melodic sequence (degrees are indices into the current scale). */
  playSequenceAt(pos: hz.Vec3, degrees: number[], vel = 0.9, dur = 0.2, humanizeMs = 12) {
    degrees.forEach((deg, i) => {
      const semis = this.degreeToSemis(deg, pos);
      const jitter = Math.floor((this.rng.next() * 2 - 1) * humanizeMs);
      this.wrapper.component.async.setTimeout(() => {
        this.playSemisAt(pos, semis, vel, dur);
      }, i * this.stepMs + jitter);
    });
  }

  /** Play a chord (multiple scale degrees at once). */
  playChordAt(pos: hz.Vec3, chordDegrees: number[], vel = 0.9, dur = 0.25, spreadMs = 12) {
    chordDegrees.forEach((deg, i) => {
      const semis = this.degreeToSemis(deg, pos);
      this.wrapper.component.async.setTimeout(() => {
        this.playSemisAt(pos, semis, vel, dur);
      }, i * spreadMs);
    });
  }

  // ===================== Internals =====================

  private playNote(semitones: number, volume: number, duration: number, pos?: hz.Vec3) {
    const v = this.getVoice();
    var options: hz.AudioOptions = {fade: 1};
    if (pos) { try { v.entity.position.set(pos); } catch {} }
    v.stop();
    v.audio.pitch.set(semitones);   // semitones in [-24..+24]
    v.audio.volume.set(volume);
    v.audio.play(options);
    v.duration = Math.max(0.01, duration);
    v.timer = 0;
    v.isPlaying = true;
  }

  private getVoice(): NoteObject {
    const free = this.notePool.find(v => !v.isPlaying);
    if (free) return free;
    // steal the one closest to finishing (simple & musical enough)
    return this.notePool.reduce((oldest, v) => (v.timer > oldest.timer ? v : oldest), this.notePool[0]);
  }

  /** Deterministic mapping from pop position/index to a scale degree & octave. */
  private mapToSemitones(pos: hz.Vec3, idx: number): number {
    const degreeIdx = (idx + Math.abs(Math.floor(pos.x + pos.z))) % this.scale.length;
    const degSemis = this.scale[degreeIdx];
    const [lo, hi] = this.octaves;
    const octave = lo + ((Math.abs(Math.floor(pos.y)) % (hi - lo + 1)));
    return this.clampSemis(degSemis + 12 * octave);
  }

  /** Convert an arbitrary degree index (can be negative/large) to semitones. */
  private degreeToSemis(degreeIndex: number, pos?: hz.Vec3): number {
    const len = this.scale.length;
    const idx = ((degreeIndex % len) + len) % len;
    const base = this.scale[idx];
    const [lo, hi] = this.octaves;
    const octave = pos
      ? lo + ((Math.abs(Math.floor(pos.y)) % (hi - lo + 1)))
      : lo + Math.floor(this.rng.range(0, hi - lo + 1));
    return this.clampSemis(base + 12 * octave);
  }

  private clampSemis(n: number) { return Math.max(-24, Math.min(24, n)); }
}
