import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import type { StitchSegment } from '../embroidery/types';
import { createStitchMaterial } from '../embroidery/StitchMaterial';

export interface EmbroideredRocketProps {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  palette?: {
    body?: string;
    nose?: string;
    fins?: string;
    window?: string;
    windowBorder?: string;
    flame?: string;
  };
  driftAmplitude?: number;
  onClick?: () => void;
}

export function EmbroideredRocket({
  position = [0, 0, 0],
  scale = 1.0,
  rotation = [0, 0, 0],
  palette = {
    body: '#E8D2AE',
    nose: '#C85A3F',
    fins: '#C85A3F',
    window: '#5D78A2',
    windowBorder: '#1B263B',
    flame: '#D49A6A'
  },
  driftAmplitude = 0.03,
  onClick
}: EmbroideredRocketProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const { rocketStitches, material } = useMemo(() => {
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
        
        const stitchLen = 0.04;
        const numStitches = Math.max(1, Math.floor((endX - startX) / stitchLen));
        const actualLen = (endX - startX) / numStitches;
        
        for (let j = 0; j < numStitches; j++) {
          const sx = startX + j * actualLen;
          const ex = sx + actualLen;
          const jitterY = (Math.random() - 0.5) * 0.01;
          const domeZ = zOffset + Math.sin((j / numStitches) * Math.PI) * r * 0.5;
          
          segments.push({
            start: new THREE.Vector3(sx, y + jitterY, domeZ),
            end: new THREE.Vector3(ex, y + jitterY, domeZ),
            color: new THREE.Color(color),
            thickness: 0.015 * scale
          });
        }
      }
    };

    // 1. Rocket Body (Oval-ish)
    const bodyHeight = 1.2;
    const bodyWidth = 0.4;
    const bodyRows = Math.floor(80 * bodyHeight * densityMult);
    for (let i = 0; i < bodyRows; i++) {
      const y = -bodyHeight/2 + (bodyHeight * i) / bodyRows;
      // Oval profile
      const normalizedY = y / (bodyHeight / 2);
      const currentWidth = bodyWidth * Math.cos(normalizedY * 1.2);
      
      if (currentWidth <= 0) continue;
      
      const startX = -currentWidth;
      const endX = currentWidth;
      const stitchLen = 0.05;
      const numStitches = Math.max(1, Math.floor((endX - startX) / stitchLen));
      const actualLen = (endX - startX) / numStitches;
      
      for (let j = 0; j < numStitches; j++) {
        const sx = startX + j * actualLen;
        const ex = sx + actualLen;
        const domeZ = 0.05 + Math.sin((j / numStitches) * Math.PI) * currentWidth * 0.8;
        
        segments.push({
          start: new THREE.Vector3(sx, y, domeZ),
          end: new THREE.Vector3(ex, y, domeZ),
          color: new THREE.Color(palette.body),
          thickness: 0.015 * scale
        });
      }
    }

    // 2. Nose Cone
    const noseBase = bodyHeight / 2 - 0.1;
    const noseHeight = 0.6;
    const noseRows = Math.floor(30 * noseHeight * densityMult);
    for (let i = 0; i < noseRows; i++) {
      const y = noseBase + (noseHeight * i) / noseRows;
      const progress = i / noseRows;
      const currentWidth = bodyWidth * Math.cos((noseBase / (bodyHeight / 2)) * 1.2) * (1 - progress);
      
      if (currentWidth <= 0.01) continue;
      
      const startX = -currentWidth;
      const endX = currentWidth;
      const stitchLen = 0.04;
      const numStitches = Math.max(1, Math.floor((endX - startX) / stitchLen));
      const actualLen = (endX - startX) / numStitches;
      
      for (let j = 0; j < numStitches; j++) {
        const sx = startX + j * actualLen;
        const ex = sx + actualLen;
        const domeZ = 0.06 + Math.sin((j / numStitches) * Math.PI) * currentWidth * 0.8;
        
        segments.push({
          start: new THREE.Vector3(sx, y, domeZ),
          end: new THREE.Vector3(ex, y, domeZ),
          color: new THREE.Color(palette.nose),
          thickness: 0.012 * scale
        });
      }
    }
    
    // 3. Fins (Left and Right)
    const finHeight = 0.5;
    const finBaseY = -bodyHeight/2 - 0.1;
    const finRows = Math.floor(25 * finHeight * densityMult);
    for (let i = 0; i < finRows; i++) {
      const y = finBaseY + (finHeight * i) / finRows;
      const progress = i / finRows; // 0 to 1
      const innerX = bodyWidth * Math.cos((y / (bodyHeight / 2)) * 1.2) - 0.05;
      const outerX = innerX + 0.4 * (1 - progress);
      
      if (outerX > innerX) {
        // Left fin
        segments.push({
          start: new THREE.Vector3(-outerX, y, 0.02),
          end: new THREE.Vector3(-innerX, y, 0.02),
          color: new THREE.Color(palette.fins),
          thickness: 0.015 * scale
        });
        // Right fin
        segments.push({
          start: new THREE.Vector3(innerX, y, 0.02),
          end: new THREE.Vector3(outerX, y, 0.02),
          color: new THREE.Color(palette.fins),
          thickness: 0.015 * scale
        });
      }
    }
    
    // 4. Window
    addFilledCircle(0, 0.2, 0.2, palette.window!, 0.12);
    // Window border
    const borderSteps = 30;
    const borderR = 0.22;
    for (let i=0; i<borderSteps; i++) {
      const a1 = (i / borderSteps) * Math.PI * 2;
      const a2 = ((i + 1) / borderSteps) * Math.PI * 2;
      segments.push({
        start: new THREE.Vector3(Math.cos(a1)*borderR, 0.2 + Math.sin(a1)*borderR, 0.15),
        end: new THREE.Vector3(Math.cos(a2)*borderR, 0.2 + Math.sin(a2)*borderR, 0.15),
        color: new THREE.Color(palette.windowBorder),
        thickness: 0.02 * scale
      });
    }

    // 5. Flames (zigzag stitches at the bottom)
    const flameBase = -bodyHeight/2;
    for(let i=0; i<8; i++) {
      const xStart = -0.2 + (i/8)*0.4;
      const xEnd = -0.2 + ((i+1)/8)*0.4;
      const yTip = flameBase - 0.3 - Math.random() * 0.3;
      segments.push({
        start: new THREE.Vector3(xStart, flameBase, 0.05),
        end: new THREE.Vector3((xStart+xEnd)/2, yTip, 0.05),
        color: new THREE.Color(palette.flame),
        thickness: 0.012 * scale
      });
      segments.push({
        start: new THREE.Vector3((xStart+xEnd)/2, yTip, 0.05),
        end: new THREE.Vector3(xEnd, flameBase, 0.05),
        color: new THREE.Color(palette.flame),
        thickness: 0.012 * scale
      });
    }

    const mat = createStitchMaterial();
    mat.roughness = 0.9;
    mat.metalness = 0.1;
    
    return { rocketStitches: segments, material: mat };
  }, [scale, palette]);

  useFrame((state) => {
    if (groupRef.current && driftAmplitude > 0) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2) * driftAmplitude;
      groupRef.current.position.x = position[0] + Math.cos(t * 0.8) * (driftAmplitude * 0.5);
      groupRef.current.rotation.z = rotation[2] + Math.sin(t * 0.5) * 0.05;
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
      <EmbroideryEngine stitches={rocketStitches} customMaterial={material} />
    </group>
  );
}
