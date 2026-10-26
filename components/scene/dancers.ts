import * as THREE from "three";

// Bride & groom as smooth articulated mannequins (lathed torsos, tapered two-part limbs, round joints) in a waltz hold.
// Modelled full height (feet at y=0, ~1.8 tall) but shown waist-up: every material fades out between CUT_LOW and CUT_HIGH.
export const CUT_LOW = 0.95; // waist: fully faded out
export const CUT_HIGH = 1.25; // chest: fully shown

export function buildDancers(reduced: boolean) {
  const geos: THREE.BufferGeometry[] = [];
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xe6bd9b, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffc9b0) });
  const suit = new THREE.MeshStandardMaterial({ color: 0x17131f, roughness: 0.45 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x0b0a0e, roughness: 0.2 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf4efe8, roughness: 0.5, side: THREE.DoubleSide });
  const gown = new THREE.MeshPhysicalMaterial({ color: 0xfaf5ee, roughness: 0.55, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xffd6e2), side: THREE.DoubleSide });
  const veil = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const accent = new THREE.MeshStandardMaterial({ color: 0xe8c069, metalness: 0.8, roughness: 0.3 });
  // Waist-up cut: heights are in the couple's own units (feet at 0), so the cut follows them as they move and scale.
  const mats = [skin, suit, shoe, hair, shirt, gown, veil, accent];
  const base = mats.map((m) => ((m.transparent = true), m.opacity)); // the veil keeps its sheerness
  const toLocal = { value: new THREE.Matrix4() };
  for (const m of mats)
    m.onBeforeCompile = (s) => {
      s.uniforms.uToLocal = toLocal;
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nuniform mat4 uToLocal;\nvarying float vCutY;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvCutY = (uToLocal * modelMatrix * vec4(transformed, 1.0)).y;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vCutY;")
        .replace("#include <dithering_fragment>", `#include <dithering_fragment>\nfloat cut = smoothstep(${CUT_LOW.toFixed(2)}, ${CUT_HIGH.toFixed(2)}, vCutY);\nif (cut < 0.01) discard; // no depth from the hidden half\ngl_FragColor.a *= cut;`);
    };

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const ball = (r: number, mat: THREE.Material, x = 0, y = 0, z = 0) => mesh(new THREE.SphereGeometry(r, 20, 14), mat, x, y, z);
  // Body of revolution from [radius, y] pairs, squashed front-to-back so it reads as a torso, not a vase.
  const lathe = (profile: [number, number][], mat: THREE.Material, sx = 1, sz = 0.72) => {
    const m = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40), mat);
    m.scale.set(sx, 1, sz);
    return m;
  };
  // Tapered segment hanging down from its pivot, with a ball joint at the top.
  const seg = (len: number, r0: number, r1: number, mat: THREE.Material) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(r0, r1, len, 18), mat, 0, -len / 2), ball(r0, mat));
    return g;
  };
  // Two-part limb (upper + lower) ending in `end`; returns both pivots for posing.
  const limb = (x: number, y: number, a: [number, number, number], b: [number, number, number], mat: THREE.Material, end: THREE.Object3D) => {
    const upper = seg(...a, mat);
    upper.position.set(x, y, 0);
    const lower = seg(...b, mat);
    lower.position.y = -a[0];
    end.position.y -= b[0];
    lower.add(end);
    upper.add(lower);
    return { upper, lower };
  };
  const hand = () => {
    const h = ball(0.042, skin);
    h.scale.set(0.65, 1.35, 0.9);
    h.position.y = -0.04;
    return h;
  };
  const head = (y: number, r: number, bun: boolean) => {
    const g = new THREE.Group();
    const face = ball(r, skin, 0, y);
    face.scale.set(0.88, 1.12, 0.98);
    const cap = mesh(new THREE.SphereGeometry(r * 1.07, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, y + r * 0.08, -r * 0.06);
    cap.scale.set(0.9, 1.1, 1);
    g.add(face, cap, ball(r * 0.13, skin, 0, y - r * 0.05, r * 0.96)); // nose
    if (bun) g.add(ball(r * 0.55, hair, 0, y + r * 0.25, -r * 1.05));
    return g;
  };

  // Both are modelled facing +z inside `body` (lean), inside an outer group that turns them to face each other.
  // --- groom ---
  const gBody = new THREE.Group();
  const shoeL = mesh(new THREE.CapsuleGeometry(0.038, 0.13, 4, 10), shoe, 0, -0.03, 0.05);
  const shoeR = mesh(new THREE.CapsuleGeometry(0.038, 0.13, 4, 10), shoe, 0, -0.03, 0.05);
  shoeL.rotation.x = shoeR.rotation.x = Math.PI / 2;
  const gLegL = limb(0.085, 0.9, [0.44, 0.072, 0.054], [0.42, 0.05, 0.038], suit, shoeL);
  const gLegR = limb(-0.085, 0.9, [0.44, 0.072, 0.054], [0.42, 0.05, 0.038], suit, shoeR);
  const gArmL = limb(0.19, 1.41, [0.29, 0.05, 0.042], [0.26, 0.04, 0.032], suit, hand()); // frame arm, holds her hand
  const gArmR = limb(-0.19, 1.41, [0.29, 0.05, 0.042], [0.26, 0.04, 0.032], suit, hand()); // around her back
  const vee = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.045, 0), new THREE.Vector2(0.045, 0), new THREE.Vector2(0, -0.17)])), shirt, 0, 1.47, 0.128);
  vee.rotation.x = -0.12;
  gBody.add(
    lathe([[0.001, 0.86], [0.15, 0.87], [0.16, 0.95], [0.145, 1.03], [0.165, 1.16], [0.19, 1.28], [0.2, 1.37], [0.16, 1.45], [0.06, 1.5], [0.001, 1.51]], suit, 1.12),
    vee,
    ball(0.02, shoe, 0, 1.465, 0.14), // bow tie knot
    ball(0.026, accent, 0.11, 1.37, 0.135), // boutonniere
    mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.14, 14), skin, 0, 1.55),
    head(1.7, 0.105, false),
    gLegL.upper,
    gLegR.upper,
    gArmL.upper,
    gArmR.upper,
  );
  const groom = new THREE.Group();
  groom.add(gBody);
  groom.position.x = 0.2;
  groom.rotation.y = -Math.PI / 2; // faces -x: his left (frame) side is toward the camera

  // --- bride ---
  const bBody = new THREE.Group();
  const skirt = lathe([[0.5, 0], [0.49, 0.04], [0.44, 0.18], [0.34, 0.45], [0.22, 0.72], [0.14, 0.92], [0.12, 0.98]], gown, 1, 1);
  const bArmL = limb(0.15, 1.34, [0.27, 0.04, 0.034], [0.24, 0.032, 0.026], skin, hand()); // on his shoulder
  const bArmR = limb(-0.15, 1.34, [0.27, 0.04, 0.034], [0.24, 0.032, 0.026], skin, hand()); // in his hand
  const sash = mesh(new THREE.TorusGeometry(0.122, 0.02, 8, 40), accent, 0, 0.98);
  sash.rotation.x = Math.PI / 2;
  sash.scale.set(1.05, 0.75, 1);
  const veilMesh = mesh(new THREE.CylinderGeometry(0.08, 0.26, 0.85, 24, 1, true, Math.PI / 2, Math.PI), veil, 0, 1.25, -0.07); // back half, from the bun
  bBody.add(
    skirt,
    lathe([[0.12, 0.95], [0.11, 1.02], [0.13, 1.15], [0.155, 1.24], [0.15, 1.3]], gown, 1.05),
    lathe([[0.15, 1.29], [0.155, 1.33], [0.13, 1.38], [0.05, 1.42], [0.001, 1.43]], skin, 1.05),
    sash,
    mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.12, 14), skin, 0, 1.46),
    head(1.58, 0.098, true),
    veilMesh,
    bArmL.upper,
    bArmR.upper,
  );
  bBody.rotation.x = 0.08; // leans back from him
  const bride = new THREE.Group();
  bride.add(bBody);
  bride.position.x = -0.2;
  bride.rotation.y = Math.PI / 2; // faces +x: her right (frame) side is toward the camera

  // Waltz hold. Negative x = forward/up for an arm, positive x bends a knee back; z swings an arm out sideways.
  gArmL.upper.rotation.set(-0.6, 0, 0.9);
  gArmL.lower.rotation.set(-0.9, 0, 0);
  gArmR.upper.rotation.set(-1.15, 0, -0.25);
  gArmR.lower.rotation.set(0, 0, 1.3); // forearm swings sideways across her back, not up
  bArmR.upper.rotation.set(-0.6, 0, -0.9);
  bArmR.lower.rotation.set(-0.9, 0, 0);
  bArmL.upper.rotation.set(-1.35, 0, -0.05);
  bArmL.lower.rotation.set(-0.6, 0, 0);

  const pair = new THREE.Group();
  pair.add(groom, bride);
  const group = new THREE.Group();
  group.add(pair);
  group.visible = false;

  return {
    group,
    /** `show` 0..1 fades the couple in/out; t is elapsed seconds. */
    update(t: number, show: number) {
      group.visible = show > 0.01;
      mats.forEach((m, i) => (m.opacity = base[i] * show));
      group.updateMatrixWorld();
      toLocal.value.copy(group.matrixWorld).invert();
      if (!group.visible || reduced) return;
      // Waltz: one bar of 1-2-3 every ~1.2 s, down on the 1 and rising through 2-3, turning as they travel a small circle.
      const bar = ((t / 1.2) % 1) * Math.PI * 2;
      const step = Math.sin(bar);
      pair.position.set(Math.cos(t * 0.35) * 0.3, (1 - Math.cos(bar)) * 0.03, Math.sin(t * 0.35) * 0.3);
      pair.rotation.set(0, t * 0.9, step * 0.03);
      gLegL.upper.rotation.x = step * 0.32;
      gLegR.upper.rotation.x = -step * 0.32;
      gLegL.lower.rotation.x = 0.12 + Math.max(0, -step) * 0.45;
      gLegR.lower.rotation.x = 0.12 + Math.max(0, step) * 0.45;
      gBody.position.y = -Math.cos(bar) * 0.015 - 0.015; // knees soften on the 1
      bBody.rotation.x = 0.08 + Math.cos(bar) * 0.03;
      skirt.scale.set(1 + step * 0.05, 1, 1 + Math.cos(bar) * 0.05);
      veilMesh.rotation.x = -0.2 - step * 0.08;
    },
    setAccent: (c: THREE.Color) => void accent.color.copy(c),
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
