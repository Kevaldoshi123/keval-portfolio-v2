import * as THREE from 'three';

let cachedDiffuse: THREE.CanvasTexture | null = null;
let cachedBump: THREE.CanvasTexture | null = null;
let cachedRoughness: THREE.CanvasTexture | null = null;

// Helper for simple noise
function smoothNoise(x: number, y: number): number {
  return Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(x * 0.05 + y * 0.05);
}

export function getFabricTextures() {
  if (cachedDiffuse && cachedBump && cachedRoughness) {
    return { diffuse: cachedDiffuse, bump: cachedBump, roughness: cachedRoughness };
  }

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;

  // Base Dark Charcoal/Navy
  ctx.fillStyle = '#181a1e';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#C0C0C0';
  rctx.fillRect(0, 0, size, size);

  const threadSpacing = 12; // Larger spacing for better internal detail
  const threadCount = Math.ceil(size / threadSpacing);

  // Pre-calculate thread properties to keep them consistent across their length
  const warpThreads = Array.from({ length: threadCount }, () => ({
    thickness: threadSpacing * (0.75 + Math.random() * 0.15),
    brightness: Math.random() * 0.04,
    jitter: (Math.random() - 0.5) * 1.5
  }));

  const weftThreads = Array.from({ length: threadCount }, () => ({
    thickness: threadSpacing * (0.8 + Math.random() * 0.15),
    brightness: Math.random() * 0.05,
    jitter: (Math.random() - 0.5) * 1.5
  }));

  // Draw Plain Weave
  for (let yIdx = 0; yIdx < threadCount; yIdx++) {
    for (let xIdx = 0; xIdx < threadCount; xIdx++) {
      const isWarpOver = (xIdx + yIdx) % 2 === 0;

      const warp = warpThreads[xIdx];
      const weft = weftThreads[yIdx];

      const x = xIdx * threadSpacing;
      const y = yIdx * threadSpacing;

      // Micro-jitter for organic feel
      const jx = x + warp.jitter + smoothNoise(x, y) * 2;
      const jy = y + weft.jitter + smoothNoise(y, x) * 2;

      // Draw Weft (Horizontal)
      if (!isWarpOver) {
        // Color
        ctx.fillStyle = `rgba(255, 255, 255, ${0.04 + weft.brightness})`;
        ctx.fillRect(jx - 2, jy + (threadSpacing - weft.thickness)/2, threadSpacing + 4, weft.thickness);
        
        // Bump (horizontal cylinder)
        const grad = bctx.createLinearGradient(0, jy, 0, jy + threadSpacing);
        grad.addColorStop(0, '#505050');
        grad.addColorStop(0.5, '#E0E0E0');
        grad.addColorStop(1, '#505050');
        bctx.fillStyle = grad;
        bctx.fillRect(jx - 1, jy, threadSpacing + 2, threadSpacing);

        // Roughness
        rctx.fillStyle = `rgba(180, 180, 180, 1)`;
        rctx.fillRect(jx, jy, threadSpacing, threadSpacing);
      } 
      // Draw Warp (Vertical)
      else {
        // Color
        ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + warp.brightness})`;
        ctx.fillRect(jx + (threadSpacing - warp.thickness)/2, jy - 2, warp.thickness, threadSpacing + 4);
        
        // Bump (vertical cylinder)
        const grad = bctx.createLinearGradient(jx, 0, jx + threadSpacing, 0);
        grad.addColorStop(0, '#505050');
        grad.addColorStop(0.5, '#D0D0D0'); // Slightly less prominent than weft
        grad.addColorStop(1, '#505050');
        bctx.fillStyle = grad;
        bctx.fillRect(jx, jy - 1, threadSpacing, threadSpacing + 2);

        // Roughness
        rctx.fillStyle = `rgba(160, 160, 160, 1)`;
        rctx.fillRect(jx, jy, threadSpacing, threadSpacing);
      }
    }
  }

  // Macro surface variation (broad dark/light patches)
  const macroGrad = ctx.createRadialGradient(size/2, size/2, size/10, size/2, size/2, size);
  macroGrad.addColorStop(0, 'rgba(0,0,0,0)');
  macroGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = macroGrad;
  ctx.fillRect(0,0,size,size);

  // Micro fibers (fuzz/imperfections)
  for (let i = 0; i < 80000; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const length = Math.random() * 3 + 1;
    const isLight = Math.random() > 0.4; // More light fuzz
    const vertical = Math.random() > 0.5;
    
    ctx.fillStyle = isLight ? `rgba(255,255,255, ${0.03 + Math.random()*0.05})` : 'rgba(0,0,0,0.2)';
    ctx.fillRect(rx, ry, vertical ? 1 : length, vertical ? length : 1);
    
    // Fuzz affects bump slightly
    bctx.fillStyle = isLight ? '#A0A0A0' : '#606060';
    bctx.fillRect(rx, ry, 1, 1);
  }

  cachedDiffuse = new THREE.CanvasTexture(canvas);
  cachedDiffuse.wrapS = THREE.RepeatWrapping;
  cachedDiffuse.wrapT = THREE.RepeatWrapping;
  cachedDiffuse.anisotropy = 8;
  cachedDiffuse.colorSpace = THREE.SRGBColorSpace;
  cachedDiffuse.minFilter = THREE.LinearMipmapLinearFilter;

  cachedBump = new THREE.CanvasTexture(bumpCanvas);
  cachedBump.wrapS = THREE.RepeatWrapping;
  cachedBump.wrapT = THREE.RepeatWrapping;
  cachedBump.anisotropy = 8;
  cachedBump.minFilter = THREE.LinearMipmapLinearFilter;

  cachedRoughness = new THREE.CanvasTexture(roughCanvas);
  cachedRoughness.wrapS = THREE.RepeatWrapping;
  cachedRoughness.wrapT = THREE.RepeatWrapping;
  cachedRoughness.anisotropy = 8;
  cachedRoughness.minFilter = THREE.LinearMipmapLinearFilter;

  return { diffuse: cachedDiffuse, bump: cachedBump, roughness: cachedRoughness };
}
