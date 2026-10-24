import * as THREE from "three";
import { wedding } from "@/lib/wedding";
import { noiseTexture } from "./textures";

// Procedural vintage kraft envelope with wax seal and a letter card inside. Dimensions in scene units.
export function buildEnvelope() {
  // Speckled grain multiplied into the kraft colour gives the aged-paper look.
  const grain = noiseTexture(256, 205);
  grain.repeat.set(1, 1);
  const kraft = { roughness: 1, envMapIntensity: 0.1, map: grain };
  const paper = new THREE.MeshStandardMaterial({ ...kraft, color: 0x8f6a44 });
  const paperDark = new THREE.MeshStandardMaterial({ ...kraft, color: 0x7a5836, side: THREE.DoubleSide });
  const inside = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1, envMapIntensity: 0.05 });
  const tri = (pts: [number, number][]) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));

  const group = new THREE.Group();
  // Hollow shell (back panel + front pocket + flap); the letter sits inside it and the shell drops away on open.
  const shell = new THREE.Group();
  group.add(shell);

  // Back panel; its inner (+z) face is shadowed paper, seen through the V once the flap lifts.
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.02), [paper, paper, paper, paper, inside, paper]);
  back.position.z = -0.03;
  back.castShadow = back.receiveShadow = true;
  shell.add(back);

  // Front pocket: side folds plus a bottom fold laid over them, leaving the top V open.
  const sides = new THREE.Mesh(tri([[-1.3, -0.85], [0, 0], [-1.3, 0.85]]), paperDark);
  const sides2 = new THREE.Mesh(tri([[1.3, -0.85], [1.3, 0.85], [0, 0]]), paperDark);
  const bottom = new THREE.Mesh(tri([[-1.3, -0.85], [1.3, -0.85], [0, 0.05]]), paper);
  sides.position.z = sides2.position.z = 0.03;
  bottom.position.z = 0.036;
  bottom.castShadow = true;
  shell.add(sides, sides2, bottom);

  // Flap hangs from the top edge; rotating the pivot opens it.
  const flap = new THREE.Mesh(tri([[-1.3, 0], [1.3, 0], [0, -1.0]]), paperDark);
  flap.castShadow = true;
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, 0.85, 0.045);
  flapPivot.add(flap);
  shell.add(flapPivot);

  // Wax seal: wobbly poured-wax blob with a pressed stamp face carrying the couple's initials.
  const wax = { color: 0x5c0c18, roughness: 0.7, envMapIntensity: 0.1, emissive: 0x1a0205, emissiveIntensity: 0.4 };
  const sealMat = new THREE.MeshStandardMaterial(wax);
  const blob = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 0.2 + 0.012 * Math.sin(a * 5) + 0.008 * Math.sin(a * 11 + 1);
    if (i) blob.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else blob.moveTo(r, 0);
  }
  const sealGeo = new THREE.ExtrudeGeometry(blob, { depth: 0.02, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 1 });
  const seal = new THREE.Mesh(sealGeo, sealMat);
  seal.castShadow = true;
  const stampTex = stampTexture();
  const stampMat = new THREE.MeshStandardMaterial({ ...wax, map: stampTex, bumpMap: stampTex, bumpScale: 3 });
  const stamp = new THREE.Mesh(new THREE.CircleGeometry(0.15, 48), stampMat);
  stamp.position.z = 0.036; // just above the bevelled front face
  seal.add(stamp);
  seal.position.set(0, -0.82, 0.016);
  flapPivot.add(seal);

  // Letter card between back panel and pocket (hidden until it slides up).
  // Unlit on purpose: lit paper blew out as it passed the orbiting point lights near the camera.
  const letterTex = letterTexture();
  const letterMat = new THREE.MeshBasicMaterial({ map: letterTex, color: 0xfaf4ea, transparent: true });
  const letter = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), letterMat);
  letter.position.set(0, -0.05, 0);
  group.add(letter);

  return {
    group,
    shell,
    flapPivot,
    seal,
    letter,
    dispose() {
      [back, sides, sides2, bottom, flap, seal, stamp, letter].forEach((m) => m.geometry.dispose());
      [paper, paperDark, inside, sealMat, stampMat, letterMat].forEach((m) => m.dispose());
      [letterTex, stampTex].forEach((t) => t.dispose());
      grain.dispose();
    },
  };
}

function letterTexture() {
  const w = 1024;
  const h = 668;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    ctx.fillStyle = "#cdbd9c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c9a74a";
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, w - 104, h - 104);
    ctx.textAlign = "center";
    ctx.fillStyle = "#9a7a2a";
    ctx.font = '500 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillText("YOU ARE INVITED TO THE WEDDING OF", w / 2, 190);
    ctx.fillStyle = "#1c1428";
    // Shrink the names until they fit inside the inner border.
    const names = `${wedding.couple.a} & ${wedding.couple.b}`;
    let size = 150;
    do ctx.font = `italic 300 ${size}px "Cormorant Garamond", Georgia, serif`;
    while (ctx.measureText(names).width > w - 180 && (size -= 6) > 40);
    ctx.fillText(names, w / 2, 370);
    ctx.fillStyle = "#6a5a3a";
    ctx.font = 'italic 400 44px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(
      new Date(wedding.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      w / 2,
      470,
    );
    ctx.font = '400 30px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(wedding.venue.name, w / 2, 530);
    tex.needsUpdate = true;
  };
  draw();
  // Redraw once the web font is in, so the card does not keep the Georgia fallback.
  document.fonts?.load('italic 300 150px "Cormorant Garamond"').then(draw).catch(() => {});
  return tex;
}

// Greyscale stamp face (tinted by the wax colour, doubles as the bump map): sunken ring + raised initials.
function stampTexture() {
  const n = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    ctx.fillStyle = "#d8d8d8";
    ctx.fillRect(0, 0, n, n);
    ctx.strokeStyle = "#8a8a8a";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(n / 2, n / 2, n / 2 - 14, 0, Math.PI * 2);
    ctx.stroke();
    if (logo.complete && logo.naturalWidth) {
      // Fit the logo inside the ring; same dark-under-light trick for the relief.
      const s = (n - 80) / Math.max(logo.naturalWidth, logo.naturalHeight);
      const lw = logo.naturalWidth * s;
      const lh = logo.naturalHeight * s;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(logo, (n - lw) / 2 + 3, (n - lh) / 2 + 4, lw, lh);
      ctx.globalAlpha = 1;
      ctx.filter = "invert(1)";
      ctx.drawImage(logo, (n - lw) / 2, (n - lh) / 2, lw, lh);
      ctx.filter = "none";
      tex.needsUpdate = true;
      return;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'italic 500 100px "Cormorant Garamond", Georgia, serif';
    const initials = `${wedding.couple.a[0]}&${wedding.couple.b[0]}`;
    // Dark offset under light text reads as an embossed relief.
    ctx.fillStyle = "#6a6a6a";
    ctx.fillText(initials, n / 2 + 3, n / 2 + 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(initials, n / 2, n / 2 + 2);
    tex.needsUpdate = true;
  };
  const logo = new Image();
  if (wedding.sealLogo) {
    logo.onload = draw;
    logo.src = wedding.sealLogo;
  }
  draw();
  document.fonts?.load('italic 500 100px "Cormorant Garamond"').then(draw).catch(() => {});
  return tex;
}
