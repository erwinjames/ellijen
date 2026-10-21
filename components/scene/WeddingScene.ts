import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GradeShader, backdropFragment, backdropVertex, particleFragment, particleVertex } from "./shaders";
import { noiseTexture, petalTexture, sparkleTexture } from "./textures";
import { buildEnvelope } from "./envelope";
import { wedding } from "@/lib/wedding";

export type SceneHandle = {
  /** Ease the camera/rings/lights to the named chapter (see CHAPTERS). Unknown names are ignored. */
  setChapter(name: string): void;
  /** Play the envelope-opening sequence. No-op after the first call. */
  open(): void;
  /** Recolour the gold (rings, sparkles, warm accent) and rose (fill light, sparkles) from admin settings. */
  setTheme(gold: string, rose: string): void;
  dispose(): void;
};

type Opts = {
  onReady?: () => void;
  onProgress?: (p: number) => void;
  /** Fired on the click that starts the opening (user gesture: safe to start audio). */
  onOpenStart?: () => void;
  /** Fired when the envelope sequence has finished and story mode is live. */
  onOpened?: () => void;
};

type Phase = "intro" | "opening" | "story";

export function createWeddingScene(canvas: HTMLCanvasElement, opts: Opts = {}): SceneHandle {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const disposables: { dispose(): void }[] = [];
  let phase: Phase = "intro";

  // --- renderer / scene / camera ---------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setClearColor(0x0a0612); // matches the fog, so any gap past the backdrop on tall screens is invisible
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  disposables.push(renderer);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0612, 0.045);

  const FOV = 42;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  // Intro camera sits close to the envelope; the story timeline drives `story` afterwards.
  const cam = { x: 0, y: 0.15, z: 4.4, lookY: 0 };
  camera.position.set(cam.x, cam.y, cam.z);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // --- lights -----------------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0xffe9d6, 0.12));
  scene.add(new THREE.HemisphereLight(0x5a3d7a, 0x1a0b12, 0.35));

  const key = new THREE.SpotLight(0xffe0b0, 70, 30, Math.PI / 5, 0.6, 2);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const fill = new THREE.PointLight(0xff6b9d, 25, 20, 2);
  const rim = new THREE.PointLight(0xffc266, 20, 20, 2);
  scene.add(fill, rim);
  // Paper would blow out under the full rig, so the intro runs the lights low and ramps up for the rings.
  const lightScale = { v: 0.2 };

  // --- backdrop (shader plane) --------------------------------------------------------
  const accentCool = new THREE.Color(0x4a1a36);
  const accentWarm = new THREE.Color(0x6a4a1a);
  const backdropMat = new THREE.ShaderMaterial({
    vertexShader: backdropVertex,
    fragmentShader: backdropFragment,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(0x1b1033) },
      uBottom: { value: new THREE.Color(0x05030a) },
      uAccent: { value: accentCool.clone() },
    },
    depthWrite: false,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), backdropMat);
  backdrop.position.set(0, 4, -28);
  scene.add(backdrop);
  disposables.push(backdrop.geometry, backdropMat);

  // --- floor ----------------------------------------------------------------------------
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0710, roughness: 0.7, metalness: 0, envMapIntensity: 0.15 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(22, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.2;
  floor.receiveShadow = true;
  scene.add(floor);
  disposables.push(floor.geometry, floorMat);

  // --- envelope (intro) ---------------------------------------------------------------------
  const env = buildEnvelope();
  scene.add(env.group);
  disposables.push(env);

  // --- rings (hidden until the envelope opens) -------------------------------------------------
  const rough = noiseTexture();
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xe8c069,
    metalness: 1,
    roughness: 0.22,
    roughnessMap: rough,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.5,
    emissive: 0xffb347,
    emissiveIntensity: 0,
  });
  const torus = new THREE.TorusGeometry(1.15, 0.11, 48, 160);
  const ringA = new THREE.Mesh(torus, gold);
  const ringB = new THREE.Mesh(torus, gold.clone());
  const ringBaseX = [Math.PI / 2.6, Math.PI / 2.2];
  ringA.rotation.set(ringBaseX[0], 0.3, 0);
  ringB.rotation.set(ringBaseX[1], -0.5, 0.4);
  ringA.position.x = -0.55;
  ringB.position.x = 0.55;
  for (const r of [ringA, ringB]) r.castShadow = r.receiveShadow = true;
  const rings = new THREE.Group();
  rings.position.y = 0.2;
  rings.scale.setScalar(0);
  rings.add(ringA, ringB);
  scene.add(rings);
  key.target = rings;
  disposables.push(torus, gold, ringB.material as THREE.Material, rough);

  if (wedding.ringsModelUrl) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => opts.onProgress?.(loaded / total);
    manager.onLoad = () => opts.onReady?.();
    manager.onError = () => opts.onReady?.();
    new GLTFLoader(manager).load(wedding.ringsModelUrl, (gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
      gltf.scene.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z));
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = (o as THREE.Mesh).receiveShadow = true;
      });
      rings.clear();
      rings.add(gltf.scene);
    });
  } else {
    opts.onReady?.();
  }

  // --- particles (custom shader) ---------------------------------------------------------
  const count = reduced ? 300 : mobile ? 700 : 1500;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const psize = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
    seed[i] = Math.random();
    psize[i] = 1.5 + Math.random() * 4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(psize, 1));
  const sparkle = sparkleTexture();
  const pMat = new THREE.ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms: {
      uTime: { value: 0 },
      uRise: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uMap: { value: sparkle },
      uColorA: { value: new THREE.Color(0xffd27a) },
      uColorB: { value: new THREE.Color(0xff9ec4) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(pGeo, pMat));
  disposables.push(pGeo, pMat, sparkle);

  // --- falling petals (instanced) ----------------------------------------------------------
  const petalCount = reduced ? 30 : mobile ? 70 : 140;
  const petalTex = petalTexture();
  const petalMat = new THREE.MeshStandardMaterial({ map: petalTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
  const petalGeo = new THREE.PlaneGeometry(0.18, 0.26);
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  petals.castShadow = true;
  const petal = Array.from({ length: petalCount }, () => ({
    x: (Math.random() - 0.5) * 14,
    y: Math.random() * 9 - 2,
    z: (Math.random() - 0.5) * 8 - 1,
    rx: Math.random() * Math.PI,
    ry: Math.random() * Math.PI,
    rz: Math.random() * Math.PI,
    speed: 0.25 + Math.random() * 0.45,
    phase: Math.random() * Math.PI * 2,
  }));
  scene.add(petals);
  disposables.push(petalGeo, petalMat, petalTex);
  const dummy = new THREE.Object3D();

  // --- post-processing ---------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.6, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  if (reduced) grade.uniforms.uAberration.value = 0;
  composer.addPass(grade);
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);
  disposables.push(composer);

  // --- story chapters (driven by which page section is on screen) --------------------------------
  // lookX steers the rings to the side: positive parks them left of frame (behind a left-hand photo).
  type ChapterState = { x: number; y: number; z: number; lookX: number; lookY: number; spread: number; flat: number; rise: number; bloom: number; warm: number };
  const CHAPTERS: Record<string, ChapterState> = {
    hero: { x: 0, y: 1.4, z: 7, lookX: 0, lookY: 1.3, spread: 0, flat: 0, rise: 0, bloom: 0.45, warm: 0 },
    met: { x: 2.5, y: 1.0, z: 7, lookX: 1.8, lookY: 0.6, spread: 2.0, flat: 0, rise: 0, bloom: 0.35, warm: 0 },
    growing: { x: -2.5, y: 0.6, z: 7, lookX: -1.8, lookY: 0.6, spread: 1.0, flat: 0, rise: 0, bloom: 0.4, warm: 0.3 },
    proposal: { x: 2.0, y: 0.4, z: 6, lookX: 1.8, lookY: 0.6, spread: 0, flat: 0, rise: 0, bloom: 0.9, warm: 0.7 },
    details: { x: 0.4, y: 4.8, z: 3.2, lookX: 0, lookY: 0.2, spread: 0, flat: 1, rise: 0, bloom: 0.3, warm: 0.2 },
    countdown: { x: 0, y: 1.8, z: 9.5, lookX: 0, lookY: 0.2, spread: 0, flat: 0, rise: 1, bloom: 0.4, warm: 0.5 },
    program: { x: -3, y: 1.2, z: 7, lookX: -2.2, lookY: 0.6, spread: 0.6, flat: 0, rise: 0, bloom: 0.35, warm: 0.4 },
    entourage: { x: 0, y: 3, z: 11, lookX: 0, lookY: 1.5, spread: 0, flat: 0, rise: 0.5, bloom: 0.25, warm: 0.3 }, // far back: big grid on top
    palette: { x: 2.5, y: 0.8, z: 6, lookX: 1.6, lookY: 0.6, spread: 1.4, flat: 0, rise: 0, bloom: 0.5, warm: 0.8 },
    gallery: { x: 0, y: 5, z: 2.5, lookX: 0, lookY: 0.2, spread: 0, flat: 1, rise: 0, bloom: 0.25, warm: 0.2 },
    faq: { x: -2, y: 2.2, z: 9, lookX: -2, lookY: 1.2, spread: 2.4, flat: 0, rise: 1, bloom: 0.3, warm: 0.5 },
    travel: { x: 0, y: 2.6, z: 8, lookX: 0, lookY: 2.6, spread: 0, flat: 0, rise: 0, bloom: 0.35, warm: 0.6 },
    rsvp: { x: 0, y: 2.2, z: 6, lookX: 0, lookY: 2.4, spread: 0, flat: 0, rise: 0, bloom: 0.5, warm: 1 },
  };
  const story: ChapterState = { ...CHAPTERS.hero };
  let chapter: ChapterState = CHAPTERS.hero;

  // --- opening sequence ------------------------------------------------------------------------------
  let openTl: gsap.core.Timeline | undefined;
  function open() {
    if (phase !== "intro") return;
    phase = "opening";
    try {
      opts.onOpenStart?.();
    } catch (err) {
      console.warn("onOpenStart failed", err); // audio problems must not block the envelope
    }
    document.body.style.cursor = "";
    const letterMat = env.letter.material as THREE.MeshStandardMaterial;
    openTl = gsap
      .timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: () => {
          phase = "story";
          env.group.visible = false;
          opts.onOpened?.();
        },
      })
      .to(env.seal.scale, { x: 0, y: 0, z: 0, duration: 0.45, ease: "back.in(2)" })
      .to(env.flapPivot.rotation, { x: -Math.PI * 0.95, duration: 1.1 }, "-=0.1")
      .to(env.letter.position, { y: 1.75, duration: 1.1, ease: "power2.out" }, "-=0.5")
      .to(env.letter.position, { y: 0.4, z: 1.6, duration: 1.1 }, "+=0.2")
      .to(env.letter.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 1.1 }, "<")
      .to([env.body.position, env.flapPivot.position], { y: "-=4", duration: 1.1, ease: "power2.in" }, "<")
      .to(cam, { x: story.x, y: story.y, z: story.z, lookY: story.lookY, duration: 1.6 }, "<+0.3")
      .to(letterMat, { opacity: 0, duration: 0.7 }, "+=0.9")
      .to(rings.scale, { x: 1, y: 1, z: 1, duration: 1.3, ease: "back.out(1.4)" }, "-=0.5")
      .to(lightScale, { v: 1, duration: 1.5 }, "<")
      .fromTo(bloom, { strength: 0.55 }, { strength: 1.8, duration: 0.35, yoyo: true, repeat: 1, ease: "power1.inOut" }, "-=0.6");
  }

  // --- interaction -----------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);
  let hovered = false;
  let spinning = false;

  const onMove = (e: PointerEvent) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest("a,button,input,textarea,select,label")) return;
    if (phase === "intro") return open();
    if (phase !== "story" || !hovered || spinning) return;
    spinning = true;
    gsap.to(rings.rotation, {
      y: rings.rotation.y + Math.PI * 2,
      x: rings.rotation.x + Math.PI * 0.5,
      duration: 1.6,
      ease: "power3.inOut",
      onComplete: () => void (spinning = false),
    });
    gsap.fromTo(bloom, { strength: bloom.strength }, { strength: 1.6, duration: 0.3, yoyo: true, repeat: 1 });
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("click", onClick);

  // --- resize -----------------------------------------------------------------------------------
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    // Portrait: hold the horizontal field of view instead, so the envelope and rings stay fully in frame on phones.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / Math.min(1, camera.aspect)));
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    const pr = renderer.getPixelRatio();
    fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    pMat.uniforms.uPixelRatio.value = pr;
  };
  resize();
  window.addEventListener("resize", resize);

  // --- loop ------------------------------------------------------------------------------------------
  const timer = new THREE.Timer();
  const ringMats = [ringA.material, ringB.material] as THREE.MeshPhysicalMaterial[];
  const camTarget = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    backdropMat.uniforms.uTime.value = t;
    pMat.uniforms.uTime.value = t;
    grade.uniforms.uTime.value = t;

    fill.position.set(Math.cos(t * 0.6) * 4, 1.5 + Math.sin(t * 0.9) * 0.8, Math.sin(t * 0.6) * 4);
    rim.position.set(-Math.cos(t * 0.45) * 4.5, 2.5, -Math.sin(t * 0.45) * 4.5);
    key.intensity = 70 * lightScale.v;
    fill.intensity = (22 + Math.sin(t * 2) * 6) * lightScale.v;
    rim.intensity = (18 + Math.cos(t * 1.4) * 5) * lightScale.v;

    parallax.lerp(mouse, 0.04);
    raycaster.setFromCamera(mouse, camera);

    if (phase === "story") {
      for (const k of Object.keys(story) as (keyof ChapterState)[]) story[k] = THREE.MathUtils.damp(story[k], chapter[k], 2.5, dt);
      pMat.uniforms.uRise.value = story.rise;
      bloom.strength = spinning ? bloom.strength : story.bloom;
      backdropMat.uniforms.uAccent.value.copy(accentCool).lerp(accentWarm, story.warm);
      camTarget.set(story.x + parallax.x * 0.6, story.y + parallax.y * 0.3, story.z);
      lookAt.set(story.lookX, story.lookY, 0);
    } else {
      camTarget.set(cam.x + parallax.x * 0.3, cam.y + parallax.y * 0.15, cam.z);
      lookAt.set(0, cam.lookY, 0);
    }
    camera.position.lerp(camTarget, 0.06);
    camera.lookAt(lookAt);

    // envelope idle: float + tilt toward the pointer
    if (phase !== "story") {
      env.group.position.y = Math.sin(t * 1.2) * 0.06;
      env.group.rotation.y = parallax.x * 0.25;
      env.group.rotation.x = -parallax.y * 0.2;
    }

    // rings idle + story spread/flatten
    if (!spinning) rings.rotation.y += dt * 0.25;
    rings.position.y = 0.2 + Math.sin(t * 0.8) * 0.08;
    ringA.position.x = THREE.MathUtils.damp(ringA.position.x, -0.55 - story.spread, 4, dt);
    ringB.position.x = THREE.MathUtils.damp(ringB.position.x, 0.55 + story.spread, 4, dt);
    ringA.rotation.x = THREE.MathUtils.damp(ringA.rotation.x, THREE.MathUtils.lerp(ringBaseX[0], Math.PI / 2, story.flat), 4, dt);
    ringB.rotation.x = THREE.MathUtils.damp(ringB.rotation.x, THREE.MathUtils.lerp(ringBaseX[1], Math.PI / 2, story.flat), 4, dt);
    ringA.rotation.z += dt * 0.12;
    ringB.rotation.z -= dt * 0.1;

    for (let i = 0; i < petalCount; i++) {
      const p = petal[i];
      p.y -= p.speed * dt;
      p.x += Math.sin(t * 0.8 + p.phase) * dt * 0.35;
      p.rx += dt * 0.9;
      p.rz += dt * 0.6;
      if (p.y < -2.3) {
        p.y = 7;
        p.x = (Math.random() - 0.5) * 14;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;

    // hover: envelope in intro, rings in story
    const target = phase === "intro" ? env.group : phase === "story" ? rings : null;
    const hit = !!target && raycaster.intersectObject(target, true).length > 0;
    if (hit !== hovered) {
      hovered = hit;
      document.body.style.cursor = hit ? "pointer" : "";
      if (phase === "story") gsap.to(ringMats, { emissiveIntensity: hit ? 0.6 : 0, duration: 0.35 });
      else gsap.to(env.group.scale, { x: hit ? 1.05 : 1, y: hit ? 1.05 : 1, z: hit ? 1.05 : 1, duration: 0.4, ease: "power2.out" });
    }

    composer.render();
  });

  return {
    setChapter: (name) => void (chapter = CHAPTERS[name] ?? chapter),
    setTheme(goldHex, roseHex) {
      const g = new THREE.Color(goldHex);
      const r = new THREE.Color(roseHex);
      for (const m of ringMats) m.color.copy(g);
      pMat.uniforms.uColorA.value.copy(g).lerp(new THREE.Color(0xffffff), 0.25);
      pMat.uniforms.uColorB.value.copy(r);
      fill.color.copy(r);
      rim.color.copy(g);
      accentWarm.copy(g).multiplyScalar(0.45);
    },
    open,
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      document.body.style.cursor = "";
      openTl?.kill();
      gsap.killTweensOf([rings.rotation, rings.scale, bloom, ringMats, env.group.scale, cam, lightScale]);
      scene.environment?.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}
