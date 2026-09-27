import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import type { StitchSegment } from '../embroidery/types';
import { createStitchMaterial } from '../embroidery/StitchMaterial';
import { globalUniforms } from '../GlobalUniforms';

export type PlanetType = 'striped' | 'cratered' | 'warm' | 'solid' | 'jupiter' | 'saturn' | 'uranus';

export interface MoonConfig {
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  color: string;
  type?: PlanetType | 'crescent';
  inclination?: number;
}

interface EmbroideredPlanetProps {
  position?: [number, number, number];
  scale?: number;
  driftAmplitude?: number;
  seed?: number;
  palette?: string[];
  ringColor?: string | null;
  depthLayer?: 'background' | 'midground' | 'foreground';
  moons?: MoonConfig[];
  planetType?: PlanetType;
  innerRef?: React.Ref<THREE.Object3D>;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function EmbroideredPlanet({
  position = [-2.6, 1.1, -2.8],
  scale = 1.0,
  driftAmplitude = 0.05,
  seed = 42,
  palette = ['#E8D2AE', '#A06B50', '#D49A6A', '#5D78A2', '#8B9C8A'],
  ringColor = '#E8D2AE',
  depthLayer = 'midground',
  moons = [],
  planetType = 'striped',
  innerRef
}: EmbroideredPlanetProps) {
  const localRef = useRef<THREE.Group>(null);
  
  // Expose the group reference if provided
  useEffect(() => {
    if (innerRef) {
      if (typeof innerRef === 'function') {
        innerRef(localRef.current);
      } else {
        (innerRef as React.MutableRefObject<THREE.Group | null>).current = localRef.current;
      }
    }
  }, [innerRef]);
  
  const groupRef = localRef;
  const moonGroupRefs = useRef<(THREE.Group | null)[]>([]);
  
  const { planetStitches, ringStitches, moonStitchesList, material, motionConfig, moonsMotion } = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024 && !isMobile;
    
    let densityMult = isMobile ? 0.4 : isTablet ? 0.7 : 1.0;
    if (depthLayer === 'background') densityMult *= 0.5;
    
    let currentSeed = seed;
    const rnd = () => {
      const val = seededRandom(currentSeed++);
      return val;
    };
    
    const radius = 0.6 * scale;
    const domeDepth = 0.15 * scale;
    const planetSegs: StitchSegment[] = [];
    
    // --- 1. PLANET BODY ---
    const numRows = Math.floor(120 * radius * densityMult);
    
    // Setup for striped / jupiter / saturn
    const numBands = (planetType === 'jupiter' || planetType === 'saturn') ? 8 + Math.floor(rnd() * 4) : 3 + Math.floor(rnd() * 3);
    const bandThresholds: number[] = [];
    for(let i=1; i<numBands; i++) {
      bandThresholds.push((i / numBands) + (rnd() - 0.5) * 0.1);
    }
    
    // Setup for cratered
    const craters: {cx: number, cy: number, r: number, color: string}[] = [];
    if (planetType === 'cratered') {
      const numCraters = 4 + Math.floor(rnd() * 4);
      for(let i=0; i<numCraters; i++) {
        const cx = (rnd() * 2 - 1) * radius * 0.7;
        const cy = (rnd() * 2 - 1) * radius * 0.7;
        const r = (0.1 + rnd() * 0.25) * radius;
        // The last color in palette is the crater color for more dynamic variation
        craters.push({cx, cy, r, color: palette[palette.length - 1] || '#1B263B'}); 
      }
    }
    
    // Jupiter storm spot
    let jupiterSpot = { cx: 0, cy: 0, rx: 0, ry: 0, color: '' };
    if (planetType === 'jupiter') {
      jupiterSpot = {
        cx: radius * 0.3,
        cy: -radius * 0.2,
        rx: radius * 0.35,
        ry: radius * 0.2,
        color: palette[palette.length - 1] // Last color should be rust/red
      };
    }
    
    for (let i = 0; i <= numRows; i++) {
      const t = i / numRows; 
      const y = (t * 2 - 1) * radius;
      const w = Math.sqrt(radius * radius - y * y);
      
      let rowBaseColor = palette[0];
      if (planetType === 'striped' || planetType === 'jupiter' || planetType === 'saturn' || planetType === 'uranus') {
        let colorIdx = 0;
        for(let b=0; b<bandThresholds.length; b++) {
          if (t > bandThresholds[b]) colorIdx = b + 1;
        }
        rowBaseColor = palette[colorIdx % (palette.length - (planetType === 'jupiter' ? 1 : 0))]; 
      }
      
      const chordLen = w * 2;
      const stitchLen = 0.05 + rnd() * 0.02;
      const numStitchesInRow = Math.max(2, Math.floor((chordLen / stitchLen) * densityMult));
      
      for (let j = 0; j < numStitchesInRow; j++) {
        const u1 = j / numStitchesInRow;
        const u2 = (j + 0.95) / numStitchesInRow; 
        
        const x1 = -w + u1 * chordLen;
        const x2 = -w + u2 * chordLen;
        
        const midX = (x1 + x2) / 2;
        const midY = y;
        
        let stitchColorHex = rowBaseColor;
        let zOffset = 0;
        
        if (planetType === 'warm') {
          const noise = Math.sin(midX * 10 * scale) * Math.cos(midY * 10 * scale);
          const colorIdx = Math.floor(Math.abs(noise) * palette.length);
          stitchColorHex = palette[colorIdx % palette.length];
        } else if (planetType === 'cratered') {
          for (const c of craters) {
            const dist = Math.sqrt((midX - c.cx)**2 + (midY - c.cy)**2);
            if (dist < c.r) {
              stitchColorHex = c.color;
              zOffset = -0.04 * scale;
              break;
            }
          }
        } else if (planetType === 'jupiter') {
          // Check if inside oval storm
          const dx = midX - jupiterSpot.cx;
          const dy = midY - jupiterSpot.cy;
          if ((dx*dx)/(jupiterSpot.rx*jupiterSpot.rx) + (dy*dy)/(jupiterSpot.ry*jupiterSpot.ry) <= 1.0) {
            stitchColorHex = jupiterSpot.color;
            zOffset = 0.02 * scale; // slightly raised storm
          }
        }
        
        const r1 = Math.sqrt(x1*x1 + y*y) / radius;
        const r2 = Math.sqrt(x2*x2 + y*y) / radius;
        const z1 = (1 - r1*r1) * domeDepth + zOffset;
        const z2 = (1 - r2*r2) * domeDepth + zOffset;
        
        const jx = (rnd() - 0.5) * 0.01;
        const jy = (rnd() - 0.5) * 0.01;
        const jz = (rnd() - 0.5) * 0.01;
        
        planetSegs.push({
          start: new THREE.Vector3(x1 + jx, y + jy, z1 + jz),
          end: new THREE.Vector3(x2 + jx, y + jy, z2 + jz),
          color: new THREE.Color(stitchColorHex),
          thickness: 0.025 * scale * (0.8 + rnd() * 0.4)
        });
      }
    }
    
    // For cratered planets, draw circular raised stitches around the craters
    if (planetType === 'cratered') {
      for (const c of craters) {
        const ringStitches = Math.floor(20 * c.r * densityMult);
        for (let k = 0; k < ringStitches; k++) {
          const t1 = (k / ringStitches) * Math.PI * 2;
          const t2 = ((k + 0.9) / ringStitches) * Math.PI * 2;
          
          const x1 = c.cx + Math.cos(t1) * c.r;
          const y1 = c.cy + Math.sin(t1) * c.r;
          const x2 = c.cx + Math.cos(t2) * c.r;
          const y2 = c.cy + Math.sin(t2) * c.r;
          
          if (x1*x1 + y1*y1 < radius*radius * 0.9 && x2*x2 + y2*y2 < radius*radius * 0.9) {
            const z1 = (1 - (x1*x1 + y1*y1)/(radius*radius)) * domeDepth + 0.02 * scale;
            const z2 = (1 - (x2*x2 + y2*y2)/(radius*radius)) * domeDepth + 0.02 * scale;
            
            planetSegs.push({
              start: new THREE.Vector3(x1, y1, z1),
              end: new THREE.Vector3(x2, y2, z2),
              color: new THREE.Color(palette[0]), 
              thickness: 0.02 * scale
            });
          }
        }
      }
    }
    
    // --- 2. PLANET RING ---
    const ringSegs: StitchSegment[] = [];
    if (ringColor || planetType === 'saturn' || planetType === 'uranus') {
      const numRings = planetType === 'saturn' ? 3 : 1;
      
      for (let rIdx = 0; rIdx < numRings; rIdx++) {
        let currentRingColor = ringColor || palette[0];
        let ringRx = radius * 2.2;
        let ringRy = radius * 0.8;
        let ringTilt = Math.PI / 6;
        let ringThickness = 0.02 * scale;
        let offsetMag = 0.03 * scale;
        
        if (planetType === 'saturn') {
          // Inner, middle, outer rings
          ringRx = radius * (1.6 + rIdx * 0.4);
          ringRy = radius * (0.5 + rIdx * 0.15);
          ringTilt = Math.PI / 8; // shallower tilt
          
          // Different colors for each Saturn ring
          const ringColors = ['#E8D2AE', '#A06B50', '#8B9C8A'];
          currentRingColor = ringColors[rIdx % ringColors.length];
          
          ringThickness = 0.015 * scale;
          offsetMag = 0.02 * scale;
        } else if (planetType === 'uranus') {
          // One very thin, highly tilted ring
          ringRx = radius * 1.8;
          ringRy = radius * 1.2; // more circular due to tilt
          ringTilt = Math.PI / 2.5; // nearly vertical
          currentRingColor = '#7BA0C0';
          ringThickness = 0.008 * scale;
          offsetMag = 0.01 * scale;
        }
        
        const ringPerimeter = 2 * Math.PI * Math.sqrt((ringRx*ringRx + ringRy*ringRy)/2);
        const ringStitchCount = Math.floor(ringPerimeter * 40 * densityMult);
        const rColor = new THREE.Color(currentRingColor);
        
        for (let i = 0; i < ringStitchCount; i++) {
          const t1 = (i / ringStitchCount) * Math.PI * 2;
          const t2 = ((i + 1.1) / ringStitchCount) * Math.PI * 2; 
          
          const noise1 = (Math.sin(t1 * 4) + Math.cos(t1 * 7)) * 0.04 * scale;
          const noise2 = (Math.sin(t2 * 4) + Math.cos(t2 * 7)) * 0.04 * scale;
          
          let lx1 = Math.cos(t1) * (ringRx + noise1);
          let ly1 = Math.sin(t1) * (ringRy + noise1);
          let lx2 = Math.cos(t2) * (ringRx + noise2);
          let ly2 = Math.sin(t2) * (ringRy + noise2);
          
          const cosT = Math.cos(ringTilt);
          const sinT = Math.sin(ringTilt);
          
          let wx1 = lx1 * cosT - ly1 * sinT;
          let wy1 = lx1 * sinT + ly1 * cosT;
          let wx2 = lx2 * cosT - ly2 * sinT;
          let wy2 = lx2 * sinT + ly2 * cosT;
          
          const dx = wx2 - wx1;
          const dy = wy2 - wy1;
          const len = Math.sqrt(dx*dx + dy*dy);
          const nx = -dy / len;
          const ny = dx / len;
          
          const dir = (i % 2 === 0) ? 1 : -1;
          
          wx1 += nx * offsetMag * dir;
          wy1 += ny * offsetMag * dir;
          wx2 += nx * -offsetMag * dir;
          wy2 += ny * -offsetMag * dir;
          
          const zTilt = Math.PI / 8;
          const wz1 = -ly1 * Math.sin(zTilt) + domeDepth * 0.5;
          const wz2 = -ly2 * Math.sin(zTilt) + domeDepth * 0.5;
          
          const jx = (rnd() - 0.5) * 0.015;
          const jy = (rnd() - 0.5) * 0.015;
          const jz = (rnd() - 0.5) * 0.01;
          
          ringSegs.push({
            start: new THREE.Vector3(wx1 + jx, wy1 + jy, wz1 + jz),
            end: new THREE.Vector3(wx2 + jx, wy2 + jy, wz2 + jz),
            color: rColor.clone(),
            thickness: ringThickness * (0.8 + rnd() * 0.4)
          });
        }
      }
    }

    // --- 3. MOONS (SIMPLIFIED PATCHES) ---
    const allMoonStitches: StitchSegment[][] = [];
    moons.forEach((moon) => {
      const moonSegs: StitchSegment[] = [];
      const mRadius = moon.radius * scale;
      const mNumRows = Math.floor(40 * mRadius * densityMult);
      
      const mCraters: {cx: number, cy: number, r: number, color: string}[] = [];
      if (moon.type === 'cratered') {
        const numCraters = 2 + Math.floor(rnd() * 2);
        for(let i=0; i<numCraters; i++) {
          mCraters.push({
            cx: (rnd() * 2 - 1) * mRadius * 0.6,
            cy: (rnd() * 2 - 1) * mRadius * 0.6,
            r: (0.15 + rnd() * 0.2) * mRadius,
            color: '#1B263B'
          });
        }
      }
      
      for (let i = 0; i <= mNumRows; i++) {
        const t = i / mNumRows; 
        const y = (t * 2 - 1) * mRadius;
        const w = Math.sqrt(mRadius * mRadius - y * y);
        
        let chordLen = w * 2;
        let startX = -w;
        
        if (moon.type === 'crescent') {
          // Create a crescent shape by subtracting an offset inner circle
          const innerOffset = mRadius * 0.4;
          const rInner = mRadius * 0.95;
          const innerY2 = rInner * rInner - y * y;
          if (innerY2 > 0) {
            const innerBound = innerOffset + Math.sqrt(innerY2);
            // If the inner circle cuts into the left side of our chord
            if (innerBound > -w) {
              startX = innerBound;
            }
          }
          chordLen = w - startX;
          if (chordLen <= 0) continue; // Skip empty rows
        }

        const stitchLen = 0.04;
        const numStitchesInRow = Math.max(1, Math.floor((chordLen / stitchLen) * densityMult));
        
        for (let j = 0; j < numStitchesInRow; j++) {
          const u1 = j / numStitchesInRow;
          const u2 = (j + 1.0) / numStitchesInRow; 
          
          const x1 = startX + u1 * chordLen;
          const x2 = startX + u2 * chordLen;
          
          const midX = (x1 + x2) / 2;
          
          let stitchColorHex = moon.color;
          let zOffset = 0;
          if (moon.type === 'cratered') {
            for (const c of mCraters) {
              const dist = Math.sqrt((midX - c.cx)**2 + (y - c.cy)**2);
              if (dist < c.r) {
                stitchColorHex = c.color;
                zOffset = -0.02 * scale;
                break;
              }
            }
          }
          
          const z1 = (1 - (x1*x1 + y*y)/(mRadius*mRadius)) * 0.05 + zOffset;
          const z2 = (1 - (x2*x2 + y*y)/(mRadius*mRadius)) * 0.05 + zOffset;
          
          moonSegs.push({
            start: new THREE.Vector3(x1, y, z1),
            end: new THREE.Vector3(x2, y, z2),
            color: new THREE.Color(stitchColorHex),
            thickness: 0.015 * scale
          });
        }
      }
      allMoonStitches.push(moonSegs);
    });
    
    const mat = createStitchMaterial();
    mat.roughness = 0.9;
    mat.metalness = 0.1;
    
    // Precompute motion parameters for extreme performance
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionScale = isReduced ? 0.05 : 1.0;
    
    const motionConfig = {
      // Small/Medium/Large scale handled partially by driftAmplitude.
      // Increased amplitude by ~25-30% to make it 20-30% more noticeable while keeping speed frequency calm.
      ampX: driftAmplitude * (1.25 + rnd() * 1.8) * motionScale,
      ampY: driftAmplitude * 0.8 * (1.25 + rnd() * 1.5) * motionScale,
      ampZ: driftAmplitude * 0.4 * (1.25 + rnd() * 1.0) * motionScale,
      // Target: 0.035 - 0.055
      speedX: (0.035 + rnd() * 0.02) * motionScale,
      speedY: (0.025 + rnd() * 0.025) * motionScale,
      speedZ: (0.035 + rnd() * 0.02) * motionScale,
      phase: seed * 1.3,
      phase2: seed * 2.7,
      rotSpeed: (0.003 + rnd() * 0.012) * motionScale
    };
    
    const moonsMotion = moons.map((m, idx) => ({
      ...m,
      tinyAmpX: 0.02 * (0.5 + rnd() * 0.5) * motionScale,
      tinyAmpY: 0.02 * (0.5 + rnd() * 0.5) * motionScale,
      tinyPhase: seed + idx * 4.2
    }));
    
    return { planetStitches: planetSegs, ringStitches: ringSegs, moonStitchesList: allMoonStitches, material: mat, motionConfig, moonsMotion };
  }, [scale, seed, palette, ringColor, depthLayer, moons, driftAmplitude]);

  useFrame(() => {
    const t = globalUniforms.uTime.value;
    const cursor = globalUniforms.uCursor.value;
    
    const parallaxMult = depthLayer === 'foreground' ? 0.045 : depthLayer === 'midground' ? 0.025 : 0.01;
    
    if (groupRef.current) {
      const mc = motionConfig;
      
      const driftX = Math.sin(t * mc.speedX + mc.phase) * mc.ampX;
      const driftY = Math.cos(t * mc.speedY + mc.phase) * mc.ampY;
      const driftZ = Math.sin(t * mc.speedZ + mc.phase2) * mc.ampZ;
      
      groupRef.current.position.x = position[0] - (cursor.x * parallaxMult) + driftX;
      groupRef.current.position.y = position[1] - (cursor.y * parallaxMult) + driftY;
      groupRef.current.position.z = position[2] + driftZ;
      
      groupRef.current.rotation.z = Math.sin(t * mc.rotSpeed + mc.phase) * 0.05;
      groupRef.current.rotation.x = Math.cos(t * mc.rotSpeed * 0.8 + mc.phase2) * 0.02;
    }
    
    moonsMotion.forEach((moon, idx) => {
      const mRef = moonGroupRefs.current[idx];
      if (mRef) {
        const orbitX = Math.cos(t * moon.orbitSpeed + moon.phase) * moon.orbitRadius;
        const orbitY = Math.sin(t * moon.orbitSpeed + moon.phase) * moon.orbitRadius * 0.5;
        const orbitZ = Math.sin(t * moon.orbitSpeed + moon.phase) * moon.orbitRadius * 0.2; // Add natural depth
        
        // Apply independent inclination
        const inc = moon.inclination || 0;
        const cosI = Math.cos(inc);
        const sinI = Math.sin(inc);
        
        const rotatedY = orbitY * cosI - orbitZ * sinI;
        const rotatedZ = orbitY * sinI + orbitZ * cosI;
        
        const tinyDriftX = Math.sin(t * 0.5 + moon.tinyPhase) * moon.tinyAmpX;
        const tinyDriftY = Math.cos(t * 0.4 + moon.tinyPhase) * moon.tinyAmpY;
        
        mRef.position.x = orbitX + tinyDriftX;
        mRef.position.y = rotatedY + tinyDriftY;
        mRef.position.z = rotatedZ;
        mRef.rotation.z = Math.sin(t * 0.1 + moon.tinyPhase) * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      <EmbroideryEngine stitches={planetStitches} customMaterial={material} castShadow={true} />
      {ringStitches.length > 0 && (
        <EmbroideryEngine stitches={ringStitches} customMaterial={material} castShadow={true} />
      )}
      {moonStitchesList.map((moonStitches, idx) => (
        <group key={`moon-${idx}`} ref={(el) => (moonGroupRefs.current[idx] = el)}>
          <EmbroideryEngine stitches={moonStitches} customMaterial={material} castShadow={false} />
        </group>
      ))}
    </group>
  );
}
