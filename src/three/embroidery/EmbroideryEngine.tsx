import { useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import type { StitchSegment } from './types';
import { createStitchMaterial } from './StitchMaterial';

export interface EmbroideryEngineProps {
  stitches: StitchSegment[];
  customMaterial?: THREE.Material;
  castShadow?: boolean;
}

export const EmbroideryEngine = forwardRef(({ stitches, customMaterial, castShadow = true }: EmbroideryEngineProps, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useImperativeHandle(ref, () => ({
    get meshRef() { return meshRef; }
  }));
  
  // Create shared geometry and material
  const geometry = useMemo(() => {
    // Heavily optimized CapsuleGeometry for massive instancing.
    // Radial segments reduced from 4 to 3.
    // Length segments reduced from 8 to 2.
    const geom = new THREE.CapsuleGeometry(1, 6, 2, 3);
    geom.translate(0, 3, 0); // Translate by half of Length
    geom.rotateX(Math.PI / 2);
    return geom;
  }, []);
  
  const material = useMemo(() => customMaterial || createStitchMaterial(), [customMaterial]);

  useEffect(() => {
    if (!meshRef.current || stitches.length === 0) return;
    
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    
    stitches.forEach((stitch, i) => {
      // Position at start
      dummy.position.copy(stitch.start);
      
      // Look at end to orient the cylinder
      dummy.lookAt(stitch.end);
      
      // Scale uniformly to prevent spherical caps from distorting into blades!
      // The geometry total length is 8 (2 from radius, 6 from cylinder).
      // If we scale by (distance / 8), the capsule perfectly matches the distance
      // without stretching the caps more than the thickness.
      const distance = stitch.start.distanceTo(stitch.end);
      
      // But we want independent thickness. If we scale X and Y differently than Z, 
      // the caps distort. However, since the thread is very thin, a slight squash 
      // is better than the previous extreme stretch. 
      // We will scale Z by (distance/8) and X/Y by thickness.
      dummy.scale.set(stitch.thickness, stitch.thickness, distance / 8.0);
      
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      
      // Apply per-stitch color
      mesh.setColorAt(i, stitch.color);
    });
    
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    
  }, [stitches]);

  if (stitches.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, stitches.length]}
      castShadow={castShadow}
    />
  );
});
