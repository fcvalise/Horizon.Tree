import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";

type ScaleName =
  | "pentMaj" | "pentMin" | "major" | "minor"
  | "dorian" | "mixolydian" | "wholeTone"
  | "hirajoshi" | "inSen";

type GroupName = "Leaf" | "Branch" | "Terrain" | "Other";

type PendingNote = {
  pos: hz.Vec3;
  vel: number;
  dur: number;
  group: GroupName;
};

export class NoteObject {
  constructor(
    public entity: hz.Entity,
    public audio: hz.AudioGizmo,
    public isPlaying = false,
    public timer = 0,
    public duration = 1.9
  ) {}
  stop() { /* try { this.audio.stop({fade: 1}); } catch {} this.isPlaying = false; this.timer = 0; */ }
}

export class OMelody {
  // --- Musical tables (small, timeless) ---
  private static readonly SCALES: Record<ScaleName, readonly number[]> = {
    pentMaj:   [0, 2, 4, 7, 9],
    pentMin:   [0, 3, 5, 7, 10],
    major:     [0, 2, 4, 5, 7, 9, 11],
    minor:     [0, 2, 3, 5, 7, 8, 10],
    dorian:    [0, 2, 3, 5, 7, 9, 10],
    mixolydian:[0, 2, 4, 5, 7, 9, 10],
    wholeTone: [0, 2, 4, 6, 8, 10],
    hirajoshi: [0, 2, 3, 7, 8],
    inSen:     [0, 1, 5, 7, 10],
  } as const;

  private static readonly NOTE_INDEX: Record<string, number> = {
    C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11
  };

  // --- Config (set once, forget) ---
  private scale: readonly number[] = OMelody.SCALES.pentMaj;
  private keySemis = 0;
  private transpose = 0;
  private octaves: [number, number] = [0, 2];

  // Quantize
  private bpm = 240;
  private stepMs = 250;          // derived from bpm
  private quantize = true;
  private qMaxPerTick: number | null = 12;

  // Harmony groups (simple triad: root, 3rd, 5th)
  private groupRules: Record<GroupName, { offset: number; octaveBias: number }> = {
    Leaf:   { offset: 0, octaveBias: +1 },   // melody/top
    Branch: { offset: 2, octaveBias:  0 },   // 3rd
    Terrain:  { offset: 4, octaveBias: -1 },   // 5th / bass
    Other:  { offset: 0, octaveBias:  0 },
  };

  // --- Runtime ---
  private rng = new ORandom("Oisif");
  private notePool: NoteObject[] = [];
  private pending: PendingNote[] = [];
  private tickAccS = 0;
  private tickIndex = 0;

  constructor(private wrapper: OWrapper, noteTag: string) {
    this.setTempo(this.bpm);
    // collect voices
    const voices = this.wrapper.world.getEntitiesWithTags([noteTag]);
    for (const e of voices) {
      const giz = e.as(hz.AudioGizmo);
      if (giz) this.notePool.push(new NoteObject(e, giz));
    }
    if (this.notePool.length === 0) throw new Error(`OMelody: no entities with tag '${noteTag}'.`);

    // tick: update timers + quantize
    this.wrapper.onUpdate((dt) => {
      for (const v of this.notePool) {
        if (!v.isPlaying) continue;
        v.timer += dt;
        if (v.timer >= v.duration) v.stop();
      }
      if (this.quantize) {
        this.tickAccS += dt;
        const stepS = this.stepMs / 1000;
        while (this.tickAccS >= stepS) {
          this.tickAccS -= stepS;
          this.flushTick();
        }
      }
    });
  }

  // ---------- Public API (tiny, readable) ----------

  useScale(name: ScaleName) { this.scale = OMelody.SCALES[name]; return this; }
  useKey(k: string | number) {
    this.keySemis = typeof k === "number" ? k : (OMelody.NOTE_INDEX[k] ?? 0);
    return this;
  }
  setOctaves(minInclusive: number, maxInclusive: number) {
    this.octaves = [Math.min(minInclusive, maxInclusive), Math.max(minInclusive, maxInclusive)];
    return this;
  }
  setTranspose(semitones: number) { this.transpose = this.clampSemis(semitones); return this; }
  setQuantize(enabled: boolean, opts?: { bpm?: number; maxPerTick?: number | null }) {
    this.quantize = enabled;
    if (opts?.bpm) this.setTempo(opts.bpm);
    if (opts?.maxPerTick !== undefined) this.qMaxPerTick = opts.maxPerTick;
    return this;
  }
  setTempo(bpm: number) {
    this.bpm = Math.max(30, bpm|0);
    this.stepMs = Math.max(30, Math.floor(60000 / this.bpm));
    return this;
  }

  /** The only call you need from gameplay. Pass position + tags; we do the rest. */
  triggerWithTags(pos: hz.Vec3, tags: string[] | undefined) {
    const group = this.tagsToGroup(tags);
    const vel = 0.7 + 0.3 * this.rng.next();
    const dur = 0.12 + 0.08 * this.rng.next();
    this.pending.push({ pos, vel, dur, group });
    if (!this.quantize) this.flushTick(); // immediate play mode
  }

  // ---------- Internals (short & clear) ----------

  private flushTick() {
    if (this.pending.length === 0) { this.tickIndex++; return; }

    let batch = this.pending.splice(0);
    const cap = this.qMaxPerTick ?? this.notePool.length;
    if (cap != null && batch.length > cap) {
      batch.sort((a,b)=>b.vel-a.vel);
      batch = batch.slice(0, cap);
    }

    const scaleLen = this.scale.length;
    const baseDegree = this.tickIndex % scaleLen;

    for (const n of batch) {
      const rule = this.groupRules[n.group] ?? this.groupRules.Other;

      const degree = (baseDegree + rule.offset) % scaleLen;

      const [lo, hi] = this.octaves;
      const rawOct = lo + ((Math.abs(Math.floor(n.pos.y))) % (hi - lo + 1));
      const octave = this.clampOctave(rawOct + rule.octaveBias, lo, hi);

      const degSemis = this.scale[degree];
      const finalSemis = this.clampSemis(degSemis + 12 * octave + this.keySemis + this.transpose);

      this.playNote(finalSemis, n.vel, n.dur, n.pos);
    }

    this.tickIndex++;
  }

  private playNote(semitones: number, volume: number, duration: number, pos?: hz.Vec3) {
    const v = this.getVoice();
    if (pos) { try { v.entity.position.set(pos); } catch {} }
    v.stop();
    v.audio.pitch.set(semitones);
    v.audio.volume.set(volume);
    v.audio.play();
    v.duration = Math.max(0.05, duration);
    v.timer = 0;
    v.isPlaying = true;
  }

  private getVoice(): NoteObject {
    const free = this.notePool.find(v => !v.isPlaying);
    if (free) return free;
    return this.notePool.reduce((oldest, v) => (v.timer > oldest.timer ? v : oldest), this.notePool[0]);
  }

  private tagsToGroup(tags?: string[]): GroupName {
    if (!tags || tags.length === 0) return "Other";
    const s = new Set(tags.map(t => t.toLowerCase()));
    if (s.has("Leaf")   || s.has("leaves"))  return "Leaf";
    if (s.has("Branch") || s.has("Branches"))return "Branch";
    if (s.has("Terrain")  || s.has("terrain")) return "Terrain";
    return "Other";
  }

  private clampSemis(n: number) { return Math.max(-24, Math.min(24, n)); }
  private clampOctave(o: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, o)); }
}
