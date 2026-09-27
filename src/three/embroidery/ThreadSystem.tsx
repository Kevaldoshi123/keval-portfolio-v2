import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createStitchMaterial } from './StitchMaterial';
import { EmbroideryEngine } from './EmbroideryEngine';

export interface ThreadSystemProps {
  start: [number, number, number];
  endRef: React.RefObject<THREE.Object3D | null>;
  color: string;
  thickness?: number;
  spacing?: number;
  sag?: number;
  seed?: number;
}

export function ThreadSystem({
  start,
  endRef,
  color,
  thickness = 0.015,
  spacing = 0.035, // Tighter spacing for physical thread look
  sag = 1.0,
  seed = 42
}: ThreadSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const MAX_STITCHES = 800; // Increased capacity for tighter spacing
  
  const geometry = useMemo(() => {
    const geom = new THREE.CapsuleGeometry(1, 5, 2, 3);
    geom.translate(0, 2.5, 0); 
    geom.rotateX(Math.PI / 2);
    return geom;
  }, []);
  
  const material = useMemo(() => {
    const mat = createStitchMaterial();
    mat.color = new THREE.Color(color);
    mat.roughness = 0.95;
    mat.metalness = 0.05;
    return mat;
  }, [color]);

  // Create a small embroidered anchor at the start point
  const anchorStitches = useMemo(() => {
    const stitches: import('./types').StitchSegment[] = [];
    const radius = 0.04;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const nextAngle = ((i + 1) / count) * Math.PI * 2;
      stitches.push({
        start: new THREE.Vector3(start[0] + Math.cos(angle)*radius, start[1] + Math.sin(angle)*radius, start[2]),
        end: new THREE.Vector3(start[0] + Math.cos(nextAngle)*radius, start[1] + Math.sin(nextAngle)*radius, start[2]),
        color: new THREE.Color(color),
        thickness: thickness * 1.5
      });
      // Cross stitches
      if (i < 4) {
        stitches.push({
          start: new THREE.Vector3(start[0] + Math.cos(angle)*radius, start[1] + Math.sin(angle)*radius, start[2]),
          end: new THREE.Vector3(start[0] - Math.cos(angle)*radius, start[1] - Math.sin(angle)*radius, start[2] + 0.01),
          color: new THREE.Color(color),
          thickness: thickness
        });
      }
    }
    return stitches;
  }, [start, color, thickness]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVec = useMemo(() => new THREE.Vector3(), []);
  const cp1 = useMemo(() => new THREE.Vector3(), []);
  const cp2 = useMemo(() => new THREE.Vector3(), []);
  const localPoint1 = useMemo(() => new THREE.Vector3(), []);
  const localPoint2 = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!meshRef.current || !endRef.current) return;
    
    endRef.current.getWorldPosition(endVec);
    const distance = startVec.distanceTo(endVec);
    
    // Natural catenary droop using Cubic Bezier
    // Thread sinks slightly at the fabric anchor, rises at the planet
    const startDepth = startVec.z - 0.02; // Sink into fabric slightly
    const endDepth = endVec.z + 0.05;     // Rise to meet planet
    
    // Control points drop downward to simulate gravity
    const drop = sag * distance * 0.4;
    const outBias = distance * 0.2;
    
    cp1.copy(startVec);
    cp1.x += outBias * Math.sin(seed);
    cp1.y -= drop;
    cp1.z = startDepth + 0.1; // Thread arches slightly off fabric
    
    cp2.copy(endVec);
    cp2.x -= outBias * Math.cos(seed);
    cp2.y -= drop;
    cp2.z = endDepth - 0.05;
    
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(startVec.x, startVec.y, startDepth),
      cp1,
      cp2,
      new THREE.Vector3(endVec.x, endVec.y, endDepth)
    );
    
    const count = Math.min(Math.floor(curve.getLength() / spacing), MAX_STITCHES - 1);
    
    if (count < 1) {
      meshRef.current.count = 0;
      return;
    }
    
    for (let i = 0; i < count; i++) {
      const u1 = i / count;
      // Slight overlap to prevent dotted-line look
      const u2 = Math.min(1.0, (i + 1.2) / count); 
      
      curve.getPoint(u1, localPoint1);
      curve.getPoint(u2, localPoint2);
      
      dummy.position.copy(localPoint1);
      dummy.lookAt(localPoint2);
      
      const dist = localPoint1.distanceTo(localPoint2);
      
      // Handmade irregularity
      const r = Math.sin(seed + i * 21.3) * 10000;
      const jitter = r - Math.floor(r);
      
      const organicThickness = thickness * (0.85 + jitter * 0.3);
      dummy.scale.set(organicThickness, organicThickness, dist / 5.0);
      
      // Thread twist
      dummy.rotateZ((jitter - 0.5) * 0.5);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <EmbroideryEngine stitches={anchorStitches} customMaterial={material} />
      <instancedMesh ref={meshRef} args={[geometry, material, MAX_STITCHES]} castShadow receiveShadow />
    </group>
  );
}
