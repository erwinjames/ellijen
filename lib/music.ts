// Background music. With wedding.songUrl: loops that file. Without: a generated music-box tune
// with vinyl crackle, so the "old disk" always plays something. Call play() from a user gesture.

export type Player = { play(): void; pause(): void; toggle(): void; playing: boolean; dispose(): void };

export function createPlayer(url: string, onChange: (playing: boolean) => void): Player {
  return url ? fileplayer(url, onChange) : musicBox(onChange);
}

function fileplayer(url: string, onChange: (p: boolean) => void): Player {
  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0.6;
  const p: Player = {
    playing: false,
    play() {
      audio.play().then(() => onChange((p.playing = true))).catch(() => {});
    },
    pause() {
      audio.pause();
      onChange((p.playing = false));
    },
    toggle: () => (p.playing ? p.pause() : p.play()),
    dispose: () => audio.pause(),
  };
  return p;
}

// Pachelbel-style progression in D, one bar per chord, arpeggiated as a music box.
const BARS: number[][] = [
  [62, 66, 69, 74],
  [57, 61, 64, 69],
  [59, 62, 66, 71],
  [54, 57, 61, 66],
  [55, 59, 62, 67],
  [50, 54, 57, 62],
  [55, 59, 62, 67],
  [57, 61, 64, 69],
];
const STEP = 0.26; // seconds per note
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function musicBox(onChange: (p: boolean) => void): Player {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let timer = 0;
  let nextTime = 0;
  let step = 0;

  function note(midi: number, t: number, vel: number) {
    const osc = ctx!.createOscillator();
    const osc2 = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = "sine";
    osc2.type = "triangle";
    osc.frequency.value = hz(midi);
    osc2.frequency.value = hz(midi) * 2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(g);
    osc2.connect(g);
    g.gain.value = 0;
    g.connect(master);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.5);
    osc2.stop(t + 1.5);
  }

  function schedule() {
    while (nextTime < ctx!.currentTime + 0.6) {
      const bar = BARS[Math.floor(step / 8) % BARS.length];
      const i = step % 8;
      note(bar[[0, 1, 2, 3, 2, 1, 0, 1][i]], nextTime, 0.18); // up then down
      if (i === 0) note(bar[0] + 12, nextTime, 0.1);
      if (i === 4) note(bar[2] + 12, nextTime, 0.07);
      nextTime += STEP;
      step++;
    }
  }

  function crackle() {
    const len = ctx!.sampleRate * 2;
    const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0015 ? (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 0.03;
    const src = ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx!.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    const g = ctx!.createGain();
    g.gain.value = 0.35;
    src.connect(bp).connect(g).connect(master);
    src.start();
  }

  const p: Player = {
    playing: false,
    play() {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
        crackle();
        nextTime = ctx.currentTime + 0.1;
      }
      ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.5);
      clearInterval(timer);
      timer = window.setInterval(schedule, 200);
      schedule();
      onChange((p.playing = true));
    },
    pause() {
      clearInterval(timer);
      if (ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      onChange((p.playing = false));
    },
    toggle: () => (p.playing ? p.pause() : p.play()),
    dispose() {
      clearInterval(timer);
      ctx?.close();
    },
  };
  return p;
}
