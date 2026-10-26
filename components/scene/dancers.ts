import * as THREE from "three";

// Cake-topper bride & groom built from primitives (feet at y=0, about 1.8 tall before the 1.6x display scale), waltzing in update().
export function buildDancers(reduced: boolean) {
  const geos: THREE.BufferGeometry[] = [];
  const skin = new THREE.MeshStandardMaterial({ color: 0xe9c2a0, roughness: 0.6 });
  const suit = new THREE.MeshStandardMaterial({ color: 0x17131f, roughness: 0.5 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf4efe8, roughness: 0.5 });
  const gown = new THREE.MeshPhysicalMaterial({ color: 0xfaf5ee, roughness: 0.55, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xffd6e2), side: THREE.DoubleSide });
  const veil = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const accent = new THREE.MeshStandardMaterial({ color: 0xe8c069, metalness: 0.8, roughness: 0.3 });

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  // Arm or leg hanging from a pivot at its top, with a hand/shoe sphere at the end.
  const limb = (len: number, r: number, mat: THREE.Material, end: THREE.Material, x: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(mesh(new THREE.CapsuleGeometry(r, len, 4, 12), mat, 0, -len / 2 - r), mesh(new THREE.SphereGeometry(r * 1.15, 12, 8), end, 0, -len - r * 2));
    return pivot;
  };
  const head = (y: number, r: number) => {
    const h = new THREE.Group();
    h.add(mesh(new THREE.SphereGeometry(r, 24, 16), skin, 0, y), mesh(new THREE.SphereGeometry(r * 1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, y + r * 0.05, -r * 0.08));
    return h;
  };

  // Both modelled facing +z, then turned to face each other.
  const groom = new THREE.Group();
  const gArmUp = limb(0.46, 0.055, suit, skin, -0.2, 1.47);
  const gArmHold = limb(0.42, 0.055, suit, skin, 0.2, 1.47);
  gArmUp.rotation.set(-0.4, 0, -1.25); // right hand raised out, holding hers
  gArmHold.rotation.set(-1.15, 0, -0.25); // left arm around her waist
  groom.add(
    limb(0.72, 0.07, suit, suit, -0.09, 0.92),
    limb(0.72, 0.07, suit, suit, 0.09, 0.92),
    mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.62, 20), suit, 0, 1.2),
    mesh(new THREE.BoxGeometry(0.1, 0.36, 0.02), shirt, 0, 1.3, 0.158),
    mesh(new THREE.SphereGeometry(0.032, 10, 8), accent, 0.1, 1.4, 0.16), // boutonniere
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), skin, 0, 1.56),
    head(1.74, 0.13),
    gArmUp,
    gArmHold,
  );
  groom.position.x = -0.23;
  groom.rotation.y = Math.PI / 2;

  const bride = new THREE.Group();
  const skirt = mesh(
    new THREE.LatheGeometry([0.47, 0.44, 0.35, 0.24, 0.15, 0.12].map((r, i) => new THREE.Vector2(r, [0, 0.1, 0.35, 0.65, 0.92, 1.0][i])), 40),
    gown,
  );
  const veilMesh = mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.8, 20, 1, true, Math.PI / 2, Math.PI), veil, 0, 1.3, -0.06); // back half only, hanging from the bun
  const bArmUp = limb(0.4, 0.045, skin, skin, 0.16, 1.37);
  const bArmRest = limb(0.38, 0.045, skin, skin, -0.16, 1.37);
  bArmUp.rotation.set(-0.4, 0, 1.25); // left hand raised to his
  bArmRest.rotation.set(-1.55, 0, 0.2); // right hand on his shoulder
  const sash = mesh(new THREE.TorusGeometry(0.118, 0.022, 8, 32), accent, 0, 1.0);
  sash.rotation.x = Math.PI / 2;
  bride.add(
    skirt,
    sash,
    mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.38, 20), gown, 0, 1.18),
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 12), skin, 0, 1.43),
    head(1.6, 0.12),
    mesh(new THREE.SphereGeometry(0.07, 12, 10), hair, 0, 1.66, -0.12), // bun
    veilMesh,
    bArmUp,
    bArmRest,
  );
  bride.position.x = 0.23;
  bride.rotation.y = -Math.PI / 2;

  const pair = new THREE.Group();
  pair.add(groom, bride);
  const group = new THREE.Group();
  group.add(pair, mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.05, 48), accent, 0, -0.03)); // gold dance floor, cake-topper style
  group.visible = false;

  return {
    group,
    /** `show` 0..1 fades the couple in/out by scale; t is elapsed seconds. */
    update(t: number, show: number) {
      group.visible = show > 0.01;
      group.scale.setScalar(show * 1.6);
      if (!group.visible || reduced) return;
      // Waltz: one bar of 1-2-3 every ~1.2 s, down on the 1 and rising through 2-3, turning as they travel a small circle.
      const bar = ((t / 1.2) % 1) * Math.PI * 2;
      pair.position.set(Math.cos(t * 0.35) * 0.3, (1 - Math.cos(bar)) * 0.03, Math.sin(t * 0.35) * 0.3);
      pair.rotation.set(0, t * 0.9, Math.sin(bar) * 0.04);
      skirt.scale.set(1 + Math.sin(bar) * 0.05, 1, 1 + Math.cos(bar) * 0.05);
      veilMesh.rotation.x = -0.25 - Math.sin(bar) * 0.08;
    },
    setAccent: (c: THREE.Color) => void accent.color.copy(c),
    dispose() {
      geos.forEach((g) => g.dispose());
      [skin, suit, hair, shirt, gown, veil, accent].forEach((m) => m.dispose());
    },
  };
}
