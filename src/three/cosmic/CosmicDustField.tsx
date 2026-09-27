import { useMemo } from 'react';
import * as THREE from 'three';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import type { StitchSegment } from '../embroidery/types';
import { createStitchMaterial } from '../embroidery/StitchMaterial';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function CosmicDustField() {
  const { dustStitches, dustMaterial } = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024 && !isMobile;
    
    // Scale density based on device
    let baseCount = 2000;
    if (isTablet) baseCount = 1000;
    if (isMobile) baseCount = 400;

    const stitches: StitchSegment[] = [];
    let seed = 998877;
    
    // Low contrast, subtle colors
    const colors = [
      new THREE.Color('#3A5B8C'), // subtle light navy
      new THREE.Color('#4A6B9C'), // visible muted blue
      new THREE.Color('#223B6C'), // dark navy/shadow thread
      new THREE.Color('#5D78A2'), // dusty blue
      new THREE.Color('#8DAFCF')  // very rare bright dust
    ];

    const LAYER_Z = -2.98; // Very close to the fabric (-3.0)

    const placeDust = (cx: number, cy: number, lengthScale = 1.0) => {
      // Dust is just a single tiny straight stitch
      const length = (0.01 + seededRandom(seed++) * 0.03) * lengthScale;
      const angle = seededRandom(seed++) * Math.PI * 2;
      
      const startX = cx - Math.cos(angle) * (length / 2);
      const startY = cy - Math.sin(angle) * (length / 2);
      
      const endX = cx + Math.cos(angle) * (length / 2);
      const endY = cy + Math.sin(angle) * (length / 2);
      
      const colorRoll = seededRandom(seed++);
      let colorIndex = 0;
      if (colorRoll > 0.98) colorIndex = 4; // 2% bright
      else if (colorRoll > 0.8) colorIndex = 3; // 18% dusty
      else if (colorRoll > 0.5) colorIndex = 1; // 30% visible
      else if (colorRoll > 0.2) colorIndex = 0; // 30% light navy
      else colorIndex = 2; // 20% dark shadow thread

      // Extremely thin
      const thickness = 0.003 + seededRandom(seed++) * 0.004;

      stitches.push({
        start: new THREE.Vector3(startX, startY, LAYER_Z),
        end: new THREE.Vector3(endX, endY, LAYER_Z),
        color: colors[colorIndex].clone(),
        thickness: thickness
      });
    };

    // Helper to create organic pockets (simulating nebulae/clusters)
    const organicMask = (x: number, y: number) => {
      const v = Math.sin(x * 0.4) * Math.cos(y * 0.4) + Math.sin(x * 0.15 + y * 0.25);
      return v > -0.3; // Creates organic empty pockets where v is low
    };

    // 1. Centralized Cosmic Field
    // Creates a smooth gradient: very dense around the perimeter of the name, fading out to sparse edges
    let placed = 0;
    let attempts = 0;
    while (placed < baseCount * 0.7 && attempts < 15000) {
      attempts++;
      // Generate a point clustered toward the center using power distribution
      const r = Math.pow(seededRandom(seed++), 1.5) * 16.0; 
      const angle = seededRandom(seed++) * Math.PI * 2;
      
      const cx = Math.cos(angle) * r;
      const cy = Math.sin(angle) * r;
      
      // TIGHT exclusion zone to protect KEVAL DOSHI readability
      const inExclusion = (cx*cx)/(3.2*3.2) + (cy*cy)/(1.8*1.8) < 1.0;
      
      // Keep if outside exclusion AND falls inside our organic density mask (or occasionally ignore mask for isolated dust)
      if (!inExclusion && (organicMask(cx, cy) || seededRandom(seed++) > 0.8)) {
        placeDust(cx, cy);
        placed++;
      }
    }

    // 2. Subtle denser bands (Milky Way dust lanes)
    const dustClouds = [
      { x: -3, y: 2, angle: -Math.PI/6, length: 7, width: 2.0, density: baseCount * 0.15 },
      { x: 4, y: -2, angle: Math.PI/4, length: 8, width: 2.5, density: baseCount * 0.15 }
    ];

    dustClouds.forEach(c => {
      for(let i = 0; i < c.density; i++) {
        const u = (seededRandom(seed++) - 0.5) * 2.0;
        const v = (seededRandom(seed++) + seededRandom(seed++) - 1.0); 
        
        const localX = u * c.length;
        const localY = v * c.width;
        const worldX = c.x + localX * Math.cos(c.angle) - localY * Math.sin(c.angle);
        const worldY = c.y + localX * Math.sin(c.angle) + localY * Math.cos(c.angle);
        
        if ((worldX*worldX)/(3.2*3.2) + (worldY*worldY)/(1.8*1.8) > 1.0) {
          // Dust in clouds is slightly longer/thicker occasionally
          placeDust(worldX, worldY, 1.2);
        }
      }
    });
    
    // We reuse the standard stitch material.
    // Standard stitch material already has world-space displacement logic hooked up!
    // It DOES NOT have mouse-push logic, which is exactly what we want for dust.
    const mat = createStitchMaterial();
    
    // Make dust highly rough and non-metallic so it blends into fabric
    mat.roughness = 1.0;

    return { dustStitches: stitches, dustMaterial: mat };
  }, []);

  if (dustStitches.length === 0) return null;

  return (
    <EmbroideryEngine 
      stitches={dustStitches} 
      customMaterial={dustMaterial} 
      castShadow={false} // NEVER cast shadows for dust!
    />
  );
}
