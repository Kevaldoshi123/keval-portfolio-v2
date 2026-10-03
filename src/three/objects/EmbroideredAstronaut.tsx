import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import type { StitchSegment } from '../embroidery/types';
import { createStitchMaterial } from '../embroidery/StitchMaterial';

export interface EmbroideredAstronautProps {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  palette?: {
    suit?: string;
    visor?: string;
    backpack?: string;
    accents?: string;
  };
  driftAmplitude?: number;
  onClick?: () => void;
}

export function EmbroideredAstronaut({
  position = [0, 0, 0],
  scale = 1.0,
  rotation = [0, 0, 0],
  palette = {
    suit: '#F4E7D3', // Creamy white
    visor: '#1B263B', // Dark navy/blue
    backpack: '#D49A6A', // Tan/Orange
    accents: '#8B3A3A' // Red
  },
  driftAmplitude = 0.04,
  onClick
}: EmbroideredAstronautProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const { astronautStitches, material } = useMemo(() => {
    const segments: StitchSegment[] = [];
    const isMobile = window.innerWidth < 768;
    const densityMult = isMobile ? 0.5 : 1.0;
    
    // Helper to add stitched circles (filled)
    const addFilledCircle = (cx: number, cy: number, r: number, color: string, zOffset = 0) => {
      const numRows = Math.floor(40 * r * densityMult);
      for (let i = 0; i < numRows; i++) {
        const y = cy - r + (2 * r * i) / numRows;
        const width = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
        if (width === 0) continue;
        const startX = cx - width;
        const endX = cx + width;
        
        const stitchLen = 0.03;
        const numStitches = Math.max(1, Math.floor((endX - startX) / stitchLen));
        const actualLen = (endX - startX) / numStitches;
        
        for (let j = 0; j < numStitches; j++) {
          const sx = startX + j * actualLen;
          const ex = sx + actualLen;
          const jitterY = (Math.random() - 0.5) * 0.01;
          const domeZ = zOffset + Math.sin((j / numStitches) * Math.PI) * r * 0.6;
          
          segments.push({
            start: new THREE.Vector3(sx, y + jitterY, domeZ),
            end: new THREE.Vector3(ex, y + jitterY, domeZ),
            color: new THREE.Color(color),
            thickness: 0.015 * scale
          });
        }
      }
    };

    // Helper to add a rounded rect (filled)
    const addFilledRect = (cx: number, cy: number, w: number, h: number, color: string, zOffset = 0) => {
      const numRows = Math.floor(40 * h * densityMult);
      for (let i = 0; i < numRows; i++) {
        const y = cy - h/2 + (h * i) / numRows;
        const startX = cx - w/2;
        const endX = cx + w/2;
        
        const stitchLen = 0.04;
        const numStitches = Math.max(1, Math.floor((endX - startX) / stitchLen));
        const actualLen = (endX - startX) / numStitches;
        
        for (let j = 0; j < numStitches; j++) {
          const sx = startX + j * actualLen;
          const ex = sx + actualLen;
          const jitterY = (Math.random() - 0.5) * 0.01;
          const domeZ = zOffset + Math.sin((j / numStitches) * Math.PI) * w * 0.2;
          
          segments.push({
            start: new THREE.Vector3(sx, y + jitterY, domeZ),
            end: new THREE.Vector3(ex, y + jitterY, domeZ),
            color: new THREE.Color(color),
            thickness: 0.015 * scale
          });
        }
      }
    };

    // 1. Backpack (Behind)
    addFilledRect(0, -0.1, 0.5, 0.6, palette.backpack!, 0.02);

    // 2. Body (Suit)
    addFilledRect(0, -0.2, 0.35, 0.45, palette.suit!, 0.06);

    // 3. Helmet / Head
    addFilledCircle(0, 0.25, 0.22, palette.suit!, 0.08);

    // 4. Visor
    addFilledCircle(0, 0.25, 0.14, palette.visor!, 0.12);

    // 5. Arms and Legs (thick lines)
    const addLimb = (x1: number, y1: number, x2: number, y2: number, color: string, z: number) => {
      segments.push({
        start: new THREE.Vector3(x1, y1, z),
        end: new THREE.Vector3(x2, y2, z),
        color: new THREE.Color(color),
        thickness: 0.04 * scale
      });
      segments.push({
        start: new THREE.Vector3(x1, y1 + 0.01, z),
        end: new THREE.Vector3(x2, y2 + 0.01, z),
        color: new THREE.Color(color),
        thickness: 0.04 * scale
      });
    };
    
    // Left arm
    addLimb(-0.15, -0.1, -0.3, -0.2, palette.suit!, 0.07);
    // Right arm (waving)
    addLimb(0.15, -0.1, 0.35, 0.1, palette.suit!, 0.07);
    // Left leg
    addLimb(-0.08, -0.4, -0.15, -0.6, palette.suit!, 0.05);
    // Right leg
    addLimb(0.08, -0.4, 0.15, -0.6, palette.suit!, 0.05);

    // Accent lines on arms/legs
    segments.push({
      start: new THREE.Vector3(-0.25, -0.15, 0.08),
      end: new THREE.Vector3(-0.2, -0.12, 0.08),
      color: new THREE.Color(palette.accents!),
      thickness: 0.02 * scale
    });
    segments.push({
      start: new THREE.Vector3(0.3, 0.05, 0.08),
      end: new THREE.Vector3(0.25, 0.0, 0.08),
      color: new THREE.Color(palette.accents!),
      thickness: 0.02 * scale
    });

    const mat = createStitchMaterial();
    mat.roughness = 0.95;
    mat.metalness = 0.05;
    
    return { astronautStitches: segments, material: mat };
  }, [scale, palette]);

  useFrame((state) => {
    if (groupRef.current && driftAmplitude > 0) {
      const t = state.clock.getElapsedTime();
      // Astronaut floats a bit differently, tumbling slightly
      groupRef.current.position.y = position[1] + Math.cos(t * 1.5) * driftAmplitude;
      groupRef.current.position.x = position[0] + Math.sin(t * 1.1) * (driftAmplitude * 0.8);
      groupRef.current.rotation.z = rotation[2] + Math.sin(t * 0.7) * 0.1;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={new THREE.Vector3(...position)} 
      scale={scale}
      rotation={new THREE.Euler(...rotation)}
      onClick={onClick}
    >
      <EmbroideryEngine stitches={astronautStitches} customMaterial={material} />
    </group>
  );
}
