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

  const sealMat = new THREE.MeshStandardMaterial({ color: 0x7a1424, roughness: 0.7, envMapIntensity: 0.15, emissive: 0x2a0408, emissiveIntensity: 0.5 });
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.05, 32), sealMat);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, -0.82, 0.03);
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
      [back, sides, sides2, bottom, flap, seal, letter].forEach((m) => m.geometry.dispose());
      [paper, paperDark, inside, sealMat, letterMat].forEach((m) => m.dispose());
      letterTex.dispose();
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
