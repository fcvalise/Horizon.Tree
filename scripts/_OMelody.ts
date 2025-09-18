import * as hz from "horizon/core";
import { ORandom } from "_ORandom";
import { OWrapper } from "_OWrapper";
import { OUtils } from "_OUtils";

export type ScaleName =
  | "pentMaj" | "pentMin" | "major" | "minor"
  | "dorian" | "mixolydian" | "wholeTone"
  | "hirajoshi" | "inSen";

type GroupName = "Leaf" | "Branch" | "Terrain" | "Rain" | "Other";

type PendingNote = {
  pos: hz.Vec3;
  vel: number;
  dur: number;
  group: GroupName;
  dist: number;
};

export class NoteObject {
  constructor(
    public entity: hz.Entity,
    public audio: hz.AudioGizmo,
    public groups: Set<GroupName>,       // tags carried by this voice entity
    public isPlaying = false,
    public timer = 0,
    public duration = 1.9,
  ) {}
  stop() {
    // ultra-safe stop kept commented as requested
    // try { this.audio.stop({ fade: 0.1 }); } catch {}
    // this.isPlaying = false;
    // this.timer = 0;
  }
}

export class OMelody {
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

  // Config
  private scale: readonly number[] = OMelody.SCALES.pentMaj;
  private keySemis = 0;
  private transpose = 0;
  private octaves: [number, number] = [0, 2];

  // Quantize
  private bpm = 180;
  private stepMs = (60000 / 180) | 0;
  private quantize = true;
  private qMaxPerTick: number | null = 12;

  // Harmony offsets per group
  private groupRules: Record<GroupName, { offset: number; octaveBias: number }> = {
    Leaf:    { offset: 0, octaveBias: +1 },
    Branch:  { offset: 2, octaveBias:  0 },
    Terrain: { offset: 4, octaveBias: -1 },
    Rain:    { offset: -1, octaveBias: 0 },
    Other:   { offset: 0, octaveBias:  0 },
  };

  // Runtime
  private rng = new ORandom("Oisif");
  private notePool: NoteObject[] = [];
  private pending: PendingNote[] = [];
  private tickAccS = 0;
  private tickIndex = 0;

  constructor(private wrapper: OWrapper, noteTag: string) {
    // collect voices: must have the base "Note" tag (or your provided noteTag),
    // and may additionally have group tags like "Leaf", "Terrain", etc.
    const voices = this.wrapper.world.getEntitiesWithTags([noteTag]);
    for (const e of voices) {
      const giz = e.as(hz.AudioGizmo);
      if (!giz) continue;
      if (!e.parent.get()?.parent.get()?.visible.get()) continue;

      const tagNames = (e.tags?.get?.() ?? []) as string[];
      const lower = new Set(tagNames.map(t => t.toLowerCase()));

      const groups: Set<GroupName> = new Set();
      if (lower.has("leaf") || lower.has("leaves")) groups.add("Leaf");
      if (lower.has("branch") || lower.has("branches")) groups.add("Branch");
      if (lower.has("terrain")) groups.add("Terrain");
      if (lower.has("rain")) groups.add("Rain");
      if (groups.size === 0) groups.add("Other"); // default bucket

      this.notePool.push(new NoteObject(e, giz, groups));
    }

    if (this.notePool.length === 0) {
      throw new Error(`OMelody: no entities with tag '${noteTag}'.`);
    }

    // tick: update timers + quantize
    this.wrapper.onUpdate((dt) => {
      for (const v of this.notePool) {
        if (!v.isPlaying) continue;
        v.timer += dt;
        if (v.timer >= v.duration) v.stop();
      }
      if (!this.quantize) return;

      this.tickAccS += dt;
      const stepS = this.stepMs / 1000;
      while (this.tickAccS >= stepS) {
        this.tickAccS -= stepS;
        this.flushTick();
      }
    });
  }

  // -------- Public API --------

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

  triggerWithTags(pos: hz.Vec3, tags: string[] | undefined) {
    const result = OUtils.closestPlayer(this.wrapper, pos);
    if (result.distance > this.maxDistance) {
      if (!this.quantize) this.flushTick();
      return;
    }

    const group = this.tagsToGroup(tags);
    const vel = 0.7 + 0.3 * this.rng.next();
    const dur = 0.12 + 0.08 * this.rng.next();
    this.pending.push({ pos, vel, dur, group, dist: result.distance });

    if (!this.quantize) this.flushTick(); // immediate play mode
  }

  // -------- Internals --------

  private flushTick() {
    if (this.pending.length === 0) { this.tickIndex++; return; }

    let batch = this.pending.splice(0);
    batch.sort((a, b) => a.dist - b.dist);

    const cap = this.qMaxPerTick ?? this.notePool.length;
    if (cap != null && batch.length > cap) batch = batch.slice(0, cap);

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

      this.playNote(finalSemis, n.vel, n.dur, n.pos, n.dist, n.group);
    }

    this.tickIndex++;
  }

  private player: hz.Player | undefined = undefined;
  private maxDistance = 20;

  private minVolume = 0.25;
  private volumeCurve(dist: number, max: number) {
    const t = Math.max(0, Math.min(1, dist / max));
    const shaped = (1 - t);
    return Math.max(this.minVolume, shaped * shaped);
  }

  private async playNote(
    semitones: number,
    baseVel: number,
    duration: number,
    pos: hz.Vec3,
    dist: number,
    group: GroupName
  ) {
    const v = this.getVoice(group);

    v.audio.parent.get()?.position.set(pos.add(this.rng.vectorHalf().mul(0.3)));

    const d = dist ?? (this.player ? this.player.position.get().distance(pos ?? v.entity.position.get()) : 0);
    const vol = this.volumeCurve(d, this.maxDistance) * baseVel;

    v.stop();
    v.audio.pitch.set(semitones);
    v.audio.volume.set(vol);

    try { v.audio.play({ players: this.player ? [this.player] : undefined, fade: 0.05 }); }
    catch { v.audio.play(); }

    v.duration = Math.max(0.05, duration);
    v.timer = 0;
    v.isPlaying = true;
  }

  private getVoice(group: GroupName): NoteObject {
    const freeInGroup = this.notePool.find(v => !v.isPlaying && v.groups.has(group));
    if (freeInGroup) return freeInGroup;
    const playingInGroup = this.notePool.filter(v => v.isPlaying && v.groups.has(group));
    if (playingInGroup.length > 0) {
      return playingInGroup.reduce((oldest, v) => (v.timer > oldest.timer ? v : oldest), playingInGroup[0]);
    }
    const freeAny = this.notePool.find(v => !v.isPlaying);
    if (freeAny) return freeAny;
    return this.notePool.reduce((oldest, v) => (v.timer > oldest.timer ? v : oldest), this.notePool[0]);
  }

  private tagsToGroup(tags?: string[]): GroupName {
    if (!tags || tags.length === 0) return "Other";
    const s = new Set(tags.map(t => t.toLowerCase()));
    if (s.has("leaf") || s.has("leaves")) return "Leaf";
    if (s.has("branch") || s.has("branches")) return "Branch";
    if (s.has("terrain")) return "Terrain";
    if (s.has("rain")) return "Rain";
    return "Other";
  }

  private clampSemis(n: number) { return Math.max(-24, Math.min(24, n)); }
  private clampOctave(o: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, o)); }
}
