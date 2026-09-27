import { useMemo } from 'react';
import * as THREE from 'three';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import type { StitchSegment } from '../embroidery/types';
import { createStitchMaterial } from '../embroidery/StitchMaterial';

interface OrbitalSystemProps {
  cx?: number;
  cy?: number;
  cz?: number;
  radiusX?: number;
  radiusY?: number;
  rotation?: number;
  stitchColor?: THREE.Color | string;
  thickness?: number;
  irregularity?: number;
  seed?: number;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function OrbitalSystem({
  cx = 0,
  cy = 0,
  cz = -2.9, // Slightly raised above the fabric (-3.0)
  radiusX = 5,
  radiusY = 2.5,
  rotation = 0,
  stitchColor = '#5D78A2',
  thickness = 0.012,
  irregularity = 0.1,
  seed = 12345
}: OrbitalSystemProps) {
  
  const { stitches, material } = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024 && !isMobile;
    
    // Estimate perimeter for stitch count
    const perimeter = 2 * Math.PI * Math.sqrt((radiusX * radiusX + radiusY * radiusY) / 2);
    
    // Increase density significantly so it looks like continuous thread, not dashed lines
    let density = 60;
    if (isTablet) density = 40;
    if (isMobile) density = 25;
    
    const numStitches = Math.floor(perimeter * density);
    const stitchSegments: StitchSegment[] = [];
    const color = new THREE.Color(stitchColor);
    
    let currentSeed = seed;

    for (let i = 0; i < numStitches; i++) {
      if (i > numStitches * 0.96) continue; // Small gap

      const t1 = (i / numStitches) * Math.PI * 2;
      // Stitches now slightly overlap (1.1) to form continuous braided thread
      const t2 = ((i + 1.1) / numStitches) * Math.PI * 2; 

      // Low-frequency noise for organic ellipse shape
      const noise1 = (Math.sin(t1 * 3) + Math.cos(t1 * 5)) * irregularity;
      const noise2 = (Math.sin(t2 * 3) + Math.cos(t2 * 5)) * irregularity;

      const rX1 = radiusX + noise1;
      const rY1 = radiusY + noise1;
      const rX2 = radiusX + noise2;
      const rY2 = radiusY + noise2;

      // Local elliptical coordinates
      let lx1 = Math.cos(t1) * rX1;
      let ly1 = Math.sin(t1) * rY1;
      let lx2 = Math.cos(t2) * rX2;
      let ly2 = Math.sin(t2) * rY2;

      // Apply rotation
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);
      
      let wx1 = cx + lx1 * cosRot - ly1 * sinRot;
      let wy1 = cy + lx1 * sinRot + ly1 * cosRot;
      let wx2 = cx + lx2 * cosRot - ly2 * sinRot;
      let wy2 = cy + lx2 * sinRot + ly2 * cosRot;

      // Calculate tangent/normal to create zigzag embroidery overlap
      const dx = wx2 - wx1;
      const dy = wy2 - wy1;
      const len = Math.sqrt(dx*dx + dy*dy);
      // Normal vector (perpendicular to tangent)
      const nx = -dy / len;
      const ny = dx / len;
      
      // Zigzag alternating direction
      const dir = (i % 2 === 0) ? 1 : -1;
      const offsetMag = thickness * 0.6; // Subtle zigzag width
      
      wx1 += nx * offsetMag * dir;
      wy1 += ny * offsetMag * dir;
      wx2 += nx * -offsetMag * dir;
      wy2 += ny * -offsetMag * dir;

      // Deterministic micro-jitter
      const jitterX = (seededRandom(currentSeed++) - 0.5) * 0.015;
      const jitterY = (seededRandom(currentSeed++) - 0.5) * 0.015;
      const jitterZ = (seededRandom(currentSeed++) - 0.5) * 0.01;
      
      const localThickness = thickness * (0.8 + seededRandom(currentSeed++) * 0.4);

      stitchSegments.push({
        start: new THREE.Vector3(wx1 + jitterX, wy1 + jitterY, cz + jitterZ),
        end: new THREE.Vector3(wx2 + jitterX, wy2 + jitterY, cz + jitterZ),
        color: color.clone(),
        thickness: localThickness
      });
    }
    
    // We reuse the standard stitch material.
    // It DOES NOT have mouse-push logic, which means it will stay anchored
    // to the fabric and perfectly ride the fabric deformation wave!
    const mat = createStitchMaterial();
    mat.roughness = 0.9;
    mat.metalness = 0.1;

    return { stitches: stitchSegments, material: mat };
  }, [cx, cy, cz, radiusX, radiusY, rotation, stitchColor, thickness, irregularity, seed]);

  if (stitches.length === 0) return null;

  return (
    <EmbroideryEngine 
      stitches={stitches} 
      customMaterial={material} 
      castShadow={false} // Disabled to remove heavy dark shadow. Depth comes from shading.
    />
  );
}
