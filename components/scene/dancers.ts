import * as THREE from "three";
import { noiseTexture } from "./textures";

export const CUT_LOW = 0.5; // below the bouquet: fully faded out
export const CUT_HIGH = 0.8; // fully shown
export const TOP = 1.88; // ear tips

// Kitten bride & groom, wedding-figurine style: soft fur, big heads, cheek to cheek over a rose bouquet, swaying in a
// slow dance. Modelled from a floor at y=0; everything fades out between CUT_HIGH and CUT_LOW, so the lower half is hidden.
export function buildDancers(reduced: boolean) {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const toLocal = { value: new THREE.Matrix4() };

  // Fade by height in the couple's own units, so the cut follows them as they sway and scale. Brightness is capped
  // (hue kept) just under the bloom threshold: white fur under the orbiting lights would otherwise glow into a blob.
  const cut = <M extends THREE.Material>(m: M) => {
    m.transparent = true;
    m.onBeforeCompile = (s) => {
      s.uniforms.uToLocal = toLocal;
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nuniform mat4 uToLocal;\nvarying float vCutY;")
        .replace(
          "#include <project_vertex>",
          "#include <project_vertex>\nvec4 cutP = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\ncutP = instanceMatrix * cutP;\n#endif\nvCutY = (uToLocal * modelMatrix * cutP).y;", // instanced lace flowers sit where their own matrix puts them
        );
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vCutY;")
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>\nfloat cut = smoothstep(${CUT_LOW.toFixed(2)}, ${CUT_HIGH.toFixed(2)}, vCutY);\nif (cut < 0.01) discard;\ngl_FragColor.a *= cut;\nfloat lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));\nif (lum > 0.85) gl_FragColor.rgb *= 0.85 / lum;`, // white fur stays under the bloom threshold
        );
    };
    m.userData.base = m.opacity; // fade-in multiplies this
    mats.push(m);
    return m;
  };
  const furBump = noiseTexture(256, 0);
  furBump.wrapS = furBump.wrapT = THREE.RepeatWrapping;
  furBump.repeat.set(3, 3);
  const phys = (color: number, o: THREE.MeshPhysicalMaterialParameters = {}) => cut(new THREE.MeshPhysicalMaterial({ color, roughness: 0.75, ...o }));
  const fur = phys(0xf4efe8, { roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.55, bumpMap: furBump, bumpScale: 0.12 });
  const pink = phys(0xf0a3a6, { roughness: 0.6 });
  const eye = phys(0x22160f, { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const shine = cut(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const mouth = phys(0x7a524a);
  const lace = phys(0xf1e4cf, { sheen: 0.7, sheenColor: new THREE.Color(0xfff6e6), side: THREE.DoubleSide });
  const flower = phys(0xfffaf0, { roughness: 0.55, emissive: 0x1a1610 });
  const suit = phys(0x3b3936, { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const lapel = phys(0x2f2d2b, { roughness: 0.3, clearcoat: 0.6 });
  const shirt = phys(0xf5f1ea, { side: THREE.DoubleSide });
  const rose = phys(0xf2e7d3, { roughness: 0.65, sheen: 0.5, sheenColor: new THREE.Color(0xfff3dd) });
  const leaf = phys(0x7d9a68, { roughness: 0.6 });
  const accent = phys(0xe8c069, { metalness: 0.7, roughness: 0.3 }); // bouquet ribbon, follows the theme

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const ball = (r: number, mat: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const m = mesh(new THREE.SphereGeometry(r, 28, 20), mat, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  // Body of revolution from [radius, y] pairs, squashed front-to-back.
  const lathe = (profile: [number, number][], mat: THREE.Material, sx = 1, sz = 0.8) => {
    const m = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48), mat);
    m.scale.set(sx, 1, sz);
    return m;
  };
  // Two-part arm hanging from the shoulder, ending in a round paw; returns both pivots for posing.
  const arm = (x: number, y: number, r: number, sleeve: THREE.Material) => {
    const seg = (len: number, r0: number, r1: number) => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(r0, r1, len, 18), sleeve, 0, -len / 2), ball(r0, sleeve));
      return g;
    };
    const upper = seg(0.2, r, r * 0.92);
    upper.position.set(x, y, 0);
    const lower = seg(0.18, r * 0.9, r * 0.85);
    lower.position.y = -0.2;
    lower.add(ball(r * 1.15, fur, 0, -0.18 - r * 0.6, 0, 1, 0.9, 1)); // paw
    upper.add(lower);
    return { upper, lower };
  };
  // Cat head facing +z: wide fluffy face, big glossy eyes, pink nose, little "w" mouth, pointed pink-lined ears.
  const catHead = (y: number, r: number) => {
    const g = new THREE.Group();
    g.position.y = y;
    g.add(ball(r, fur, 0, 0, 0, 1.12, 0.95, 0.95));
    const ears: THREE.Group[] = [];
    for (const s of [-1, 1]) {
      g.add(
        ball(r * 0.3, fur, s * r * 0.66, -r * 0.4, r * 0.3, 1.15, 0.8, 0.8), // cheek fluff
        ball(r * 0.23, eye, s * r * 0.4, r * 0.04, r * 0.76, 1, 1.12, 0.55),
        ball(r * 0.065, shine, s * r * 0.4 + r * 0.08, r * 0.14, r * 0.88),
        ball(r * 0.17, fur, s * r * 0.13, -r * 0.3, r * 0.82, 1.15, 0.85, 0.8), // muzzle
      );
      const ear = new THREE.Group();
      ear.position.set(s * r * 0.62, r * 0.66, -r * 0.05);
      ear.rotation.z = -s * 0.38;
      const outer = mesh(new THREE.ConeGeometry(r * 0.36, r * 0.62, 20), fur, 0, r * 0.22, 0);
      const inner = mesh(new THREE.ConeGeometry(r * 0.24, r * 0.46, 20), pink, 0, r * 0.18, r * 0.1);
      outer.scale.z = inner.scale.z = 0.55;
      ear.add(outer, inner);
      g.add(ear);
      ears.push(ear);
      const lip = mesh(new THREE.TorusGeometry(r * 0.08, r * 0.018, 8, 16, Math.PI), mouth, s * r * 0.08, -r * 0.42, r * 0.93);
      lip.rotation.z = Math.PI; // each half of the "w" opens upward
      g.add(lip);
    }
    g.add(ball(r * 0.09, pink, 0, -r * 0.2, r * 0.97, 1.3, 0.8, 0.8)); // nose
    return { head: g, ears };
  };
  // Little rose: a ball with a spiral of petal rims.
  const roseBud = (r: number, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(ball(r, rose));
    for (let i = 0; i < 3; i++) {
      const petal = mesh(new THREE.TorusGeometry(r * (0.45 + i * 0.22), r * 0.12, 6, 18), rose, 0, r * (0.75 - i * 0.18), 0);
      petal.rotation.x = Math.PI / 2;
      g.add(petal);
    }
    return g;
  };

  // --- bride (on the left, turned toward him) ---
  const bride = new THREE.Group();
  const skirtShape: [number, number][] = [[0.5, 0], [0.46, 0.15], [0.36, 0.42], [0.26, 0.65], [0.2, 0.76]];
  const bodiceShape: [number, number][] = [[0.19, 0.75], [0.17, 0.85], [0.19, 0.98], [0.2, 1.06], [0.17, 1.1]];
  const skirt = lathe(skirtShape, lace, 1, 0.85);
  const bodice = lathe(bodiceShape, lace, 1.05);
  bride.add(skirt, bodice, lathe([[0.17, 1.08], [0.18, 1.12], [0.12, 1.16], [0.001, 1.18]], fur, 1.05));
  // Lace flowers scattered over the gown (instanced: one draw call for all of them).
  const blossomGeo = new THREE.DodecahedronGeometry(0.038, 0); // faceted little blooms catch the light
  geos.push(blossomGeo);
  const blossoms = new THREE.InstancedMesh(blossomGeo, flower, 110);
  const dummy = new THREE.Object3D();
  // Gown radius at height y, read off the same profiles the lathes use.
  const gownR = (y: number) => {
    const p = y < 0.76 ? skirtShape : bodiceShape;
    const i = Math.max(1, p.findIndex(([, py]) => py >= y));
    const [[r0, y0], [r1, y1]] = [p[i - 1], p[i] ?? p[i - 1]];
    return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
  };
  for (let i = 0; i < blossoms.count; i++) {
    const y = 0.6 + Math.random() * 0.48; // only where the gown is visible above the fade
    const a = Math.random() * Math.PI * 2;
    const r = gownR(y) + 0.012;
    dummy.position.set(Math.cos(a) * r * (y < 0.76 ? 1 : 1.05), y, Math.sin(a) * r * (y < 0.76 ? 0.85 : 0.8));
    dummy.scale.set(1, 0.55, 1);
    dummy.lookAt(dummy.position.x * 2, y, dummy.position.z * 2);
    dummy.updateMatrix();
    blossoms.setMatrixAt(i, dummy.matrix);
  }
  bride.add(blossoms);
  const bCat = catHead(1.42, 0.29);
  const bArmR = arm(-0.15, 1.08, 0.055, fur);
  const bArmL = arm(0.15, 1.08, 0.055, fur);
  bArmR.upper.rotation.set(-0.85, 0, 0.55); // both paws on the bouquet in front of them
  bArmR.lower.rotation.set(-0.75, 0, 0);
  bArmL.upper.rotation.set(-0.8, 0, 0.1);
  bArmL.lower.rotation.set(-0.8, 0, 0);
  bride.add(bCat.head, bArmR.upper, bArmL.upper);
  bride.position.x = -0.26;
  bride.rotation.y = 0.45;
  bCat.head.rotation.z = -0.16; // leans in, cheek to his

  // --- groom (on the right, turned toward her) ---
  const groom = new THREE.Group();
  const jacket = lathe([[0.001, 0.5], [0.2, 0.52], [0.21, 0.7], [0.19, 0.85], [0.21, 1.0], [0.22, 1.08], [0.15, 1.15], [0.001, 1.17]], suit, 1.1);
  const vee = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.07, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, -0.26)])), shirt, 0, 1.13, 0.172);
  vee.rotation.x = -0.18;
  groom.add(jacket, mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.5, 20), suit, 0, 0.25), vee);
  for (const s of [-1, 1]) {
    const l = mesh(new THREE.BoxGeometry(0.06, 0.3, 0.012), lapel, s * 0.075, 1.0, 0.17);
    l.rotation.set(-0.15, 0, s * 0.32);
    const wing = mesh(new THREE.ConeGeometry(0.03, 0.06, 12), lapel, s * 0.028, 1.12, 0.185); // bow tie
    wing.rotation.z = (s * Math.PI) / 2;
    groom.add(l, wing);
  }
  groom.add(ball(0.025, flower, 0.13, 1.02, 0.17), ball(0.018, leaf, 0.15, 0.99, 0.165)); // boutonniere
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.55, -0.15), new THREE.Vector3(0.12, 0.5, -0.32), new THREE.Vector3(0.32, 0.62, -0.38), new THREE.Vector3(0.42, 0.85, -0.3)]);
  const tail = new THREE.Group();
  tail.add(mesh(new THREE.TubeGeometry(tailCurve, 24, 0.045, 12), fur), ball(0.05, fur, 0.42, 0.85, -0.3));
  groom.add(tail);
  const gCat = catHead(1.47, 0.3);
  const gArmR = arm(-0.17, 1.06, 0.062, suit); // paw on the bouquet with hers
  const gArmL = arm(0.17, 1.06, 0.062, suit);
  gArmR.upper.rotation.set(-0.8, 0, -0.5);
  gArmR.lower.rotation.set(-0.7, 0, 0);
  gArmL.upper.rotation.set(-0.35, 0, 0.12);
  gArmL.lower.rotation.set(-0.55, 0, 0);
  groom.add(gCat.head, gArmR.upper, gArmL.upper);
  groom.position.x = 0.26;
  groom.rotation.y = -0.45;
  gCat.head.rotation.z = 0.16;

  // --- bouquet held between them ---
  const bouquet = new THREE.Group();
  bouquet.position.set(0, 0.92, 0.36);
  bouquet.scale.setScalar(1.5);
  const buds: [number, number, number][] = [[0, 0.1, 0], [-0.07, 0.07, 0.02], [0.07, 0.08, 0.01], [-0.035, 0.04, 0.07], [0.04, 0.035, 0.07], [0, 0.13, -0.05], [-0.08, 0.02, -0.03], [0.08, 0.02, -0.03], [0, 0.03, 0.09]];
  for (const [x, y, z] of buds) bouquet.add(roseBud(0.04, x, y, z));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lf = mesh(new THREE.ConeGeometry(0.03, 0.11, 8), leaf, Math.cos(a) * 0.1, -0.01, Math.sin(a) * 0.08);
    lf.scale.z = 0.3;
    lf.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    bouquet.add(lf);
  }
  const ribbon = mesh(new THREE.TorusGeometry(0.028, 0.01, 6, 16), accent, 0, -0.06, 0);
  ribbon.rotation.x = Math.PI / 2; // wraps the stems
  bouquet.add(mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.16, 10), leaf, 0, -0.1, 0), ribbon);

  const pair = new THREE.Group();
  pair.add(bride, groom, bouquet);
  const group = new THREE.Group();
  group.add(pair);
  group.visible = false;
  const ears = [...bCat.ears, ...gCat.ears];
  const earZ = ears.map((e) => e.rotation.z);

  return {
    group,
    /** `show` 0..1 fades the couple in/out; t is elapsed seconds. */
    update(t: number, show: number) {
      group.visible = show > 0.01;
      mats.forEach((m) => (m.opacity = m.userData.base * show));
      group.updateMatrixWorld();
      toLocal.value.copy(group.matrixWorld).invert();
      if (!group.visible || reduced) return;
      // Slow dance in 3/4: they sway side to side together, dip on the 1, and turn a little back and forth.
      const bar = ((t / 1.5) % 1) * Math.PI * 2;
      pair.rotation.set(0, Math.sin(t * 0.5) * 0.35, Math.sin(bar) * 0.06);
      pair.position.y = (1 - Math.cos(bar)) * 0.02;
      bCat.head.rotation.z = -0.16 - Math.sin(bar) * 0.04; // nuzzle
      gCat.head.rotation.z = 0.16 - Math.sin(bar) * 0.04;
      tail.rotation.y = Math.sin(t * 1.6) * 0.35; // swish
      // An ear flicks now and then.
      ears.forEach((e, i) => (e.rotation.z = earZ[i] + Math.max(0, Math.sin(t * 0.9 + i * 1.7) - 0.92) * 2.5 * Math.sign(earZ[i])));
    },
    setAccent: (c: THREE.Color) => void accent.color.copy(c),
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      blossoms.dispose();
      furBump.dispose();
    },
  };
}
