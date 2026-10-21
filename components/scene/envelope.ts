import * as THREE from "three";
import { wedding } from "@/lib/wedding";

// Procedural paper envelope with wax seal and a letter card inside. Dimensions in scene units.
export function buildEnvelope() {
  const paper = new THREE.MeshStandardMaterial({ color: 0xbfae8c, roughness: 1, envMapIntensity: 0.1 });
  const paperDark = new THREE.MeshStandardMaterial({ color: 0xa8957a, roughness: 1, envMapIntensity: 0.1, side: THREE.DoubleSide });

  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.06), paper);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Front "V" pocket overlay: left, right, bottom triangles meeting at the centre.
  const pocket = new THREE.Shape();
  pocket.moveTo(-1.3, -0.85);
  pocket.lineTo(1.3, -0.85);
  pocket.lineTo(0, 0);
  pocket.lineTo(1.3, 0.85);
  pocket.lineTo(1.3, -0.85);
  pocket.moveTo(-1.3, -0.85);
  pocket.lineTo(-1.3, 0.85);
  pocket.lineTo(0, 0);
  const pocketMesh = new THREE.Mesh(new THREE.ShapeGeometry(pocket), paperDark);
  pocketMesh.position.z = 0.035;
  group.add(pocketMesh);

  // Flap hangs from the top edge; rotating the pivot opens it.
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-1.3, 0);
  flapShape.lineTo(1.3, 0);
  flapShape.lineTo(0, -1.0);
  const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapShape), paperDark);
  flap.castShadow = true;
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, 0.85, 0.04);
  flapPivot.add(flap);
  group.add(flapPivot);

  const sealMat = new THREE.MeshStandardMaterial({ color: 0x8b1a2b, roughness: 0.45, emissive: 0x3a0510, emissiveIntensity: 0.4 });
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.05, 32), sealMat);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, -0.82, 0.03);
  flapPivot.add(seal);

  // Letter card inside the body (hidden until it slides up).
  const letterTex = letterTexture();
  const letterMat = new THREE.MeshStandardMaterial({ map: letterTex, roughness: 1, envMapIntensity: 0.1, transparent: true });
  const letter = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), letterMat);
  letter.position.set(0, -0.05, 0);
  group.add(letter);

  return {
    group,
    body,
    flapPivot,
    seal,
    letter,
    dispose() {
      [body, pocketMesh, flap, seal, letter].forEach((m) => m.geometry.dispose());
      [paper, paperDark, sealMat, letterMat].forEach((m) => m.dispose());
      letterTex.dispose();
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
    ctx.font = 'italic 300 150px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${wedding.couple.a} & ${wedding.couple.b}`, w / 2, 370);
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
