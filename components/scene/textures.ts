import * as THREE from "three";

// Procedural textures so the site ships with zero binary assets. See threejs-textures skill.

export function sparkleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // soft 4-point star cross
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(size / 2 - 1, 4, 2, size - 8);
  ctx.fillRect(4, size / 2 - 1, size - 8, 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function petalTexture() {
  const w = 128;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#ffd6e3");
  g.addColorStop(0.6, "#f58fb0");
  g.addColorStop(1, "#c94f7c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.bezierCurveTo(w - 6, h * 0.3, w - 10, h * 0.8, w / 2, h - 4);
  ctx.bezierCurveTo(10, h * 0.8, 6, h * 0.3, w / 2, 4);
  ctx.fill();
  // vein
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 10);
  ctx.quadraticCurveTo(w / 2 + 6, h / 2, w / 2, h - 10);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Grayscale noise used as a roughnessMap so the gold reads as brushed, not CG-clean.
export function noiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + Math.random() * 105;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.needsUpdate = true;
  return tex;
}
