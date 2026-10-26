// Background music (admin → Settings → Theme music). A YouTube link plays through a hidden YouTube player, any other
// link loops that audio file, and empty plays a generated music-box tune with vinyl crackle, so the "old disk" always
// plays something. Create the player ahead of time and call play() from a user gesture.
import { youtubeId } from "./settings-utils";

export type Player = { play(): void; pause(): void; toggle(): void; playing: boolean; dispose(): void };

export function createPlayer(url: string, onChange: (playing: boolean) => void): Player {
  const yt = youtubeId(url);
  return yt ? youtube(yt, onChange) : url ? fileplayer(url, onChange) : musicBox(onChange);
}

// Just the bits of the IFrame API used here (no @types/youtube for one call site).
type YTPlayer = { playVideo(): void; pauseVideo(): void; setVolume(v: number): void; destroy(): void };
type YTNamespace = { Player: new (el: HTMLElement, opts: object) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let ytApi: Promise<YTNamespace> | undefined;
const loadYouTube = () =>
  (ytApi ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    document.head.appendChild(Object.assign(document.createElement("script"), { src: "https://www.youtube.com/iframe_api" }));
  }));

// ponytail: iOS Safari may refuse to start YouTube audio that wasn't tapped inside the video itself; the vinyl then
// stays paused. An mp3 link has no such limit, so suggest one if guests on iPhones report silence.
function youtube(id: string, onChange: (p: boolean) => void): Player {
  // Off-screen rather than display:none, which stops some browsers from playing at all.
  const host = Object.assign(document.createElement("div"), { ariaHidden: "true" });
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:200px;pointer-events:none";
  const mount = host.appendChild(document.createElement("div"));
  document.body.appendChild(host);
  let yt: YTPlayer | undefined;
  let wanted = false;
  const blocked = () => {
    wanted = false;
    onChange((p.playing = false));
  };
  loadYouTube().then((YT) => {
    if (!host.isConnected) return; // disposed while the API loaded
    yt = new YT.Player(mount, {
      videoId: id,
      playerVars: { loop: 1, playlist: id, controls: 0, playsinline: 1, disablekb: 1 },
      events: {
        onReady: () => {
          yt!.setVolume(60);
          if (wanted) yt!.playVideo();
        },
        // 1 = playing, 2 = paused, 0 = ended (loop restarts it).
        onStateChange: (e: { data: number }) => (e.data === 1 || e.data === 2) && onChange((p.playing = e.data === 1)),
        onError: blocked,
        onAutoplayBlocked: blocked,
      },
    });
  });
  const p: Player = {
    playing: false,
    play() {
      wanted = true;
      yt?.playVideo();
    },
    pause() {
      wanted = false;
      yt?.pauseVideo();
      onChange((p.playing = false));
    },
    toggle: () => (p.playing ? p.pause() : p.play()),
    dispose() {
      wanted = false;
      yt?.destroy();
      host.remove();
    },
  };
  return p;
}

function fileplayer(url: string, onChange: (p: boolean) => void): Player {
  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0.6;
  let disposed = false;
  const set = (v: boolean) => !disposed && p.playing !== v && onChange((p.playing = v));
  audio.onplaying = () => set(true);
  audio.onpause = () => set(false);
  const p: Player = {
    playing: false,
    play() {
      audio.play().catch(() => {});
    },
    pause: () => audio.pause(),
    toggle: () => (p.playing ? p.pause() : p.play()),
    dispose() {
      disposed = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    },
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
      nextTime = Math.max(nextTime, ctx.currentTime + 0.1);
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
