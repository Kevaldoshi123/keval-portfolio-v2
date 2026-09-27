import React, { useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function EmbroideryLayer() {
  const artwork = useTexture('/embroidery/hero-embroidery.png');
  const { camera, viewport } = useThree();
  const zPosition = -2.9;

  // 1. Scale the PLANE to always exactly fill the viewport (plus a 5% buffer for parallax bleed)
  // This guarantees the physical 3D mesh is always FULL-BLEED.
  const planeScale = React.useMemo(() => {
    const vp = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, zPosition));
    return [vp.width * 1.05, vp.height * 1.05, 1];
  }, [viewport, camera]);

  // 2. Scale the TEXTURE UVs to ensure the entire composition fits inside the plane
  // without cropping the important top/bottom UI elements.
  useEffect(() => {
    artwork.colorSpace = THREE.SRGBColorSpace;
    artwork.anisotropy = 16;
    artwork.minFilter = THREE.LinearMipmapLinearFilter;

    // We calculate how the artwork's aspect ratio compares to the plane's aspect ratio
    const planeAspect = planeScale[0] / planeScale[1];
    const image = artwork.image as any;
    const texAspect = image.width / image.height;

    let repeatX = 1;
    let repeatY = 1;

    // Implement "contain" style scaling within the UV coordinates:
    if (planeAspect > texAspect) {
      // Desktop: Screen is wider than the image.
      // To ensure the top/bottom are NOT cropped, we fit the height exactly.
      // We increase repeatX > 1 to squeeze the image horizontally into the safe center.
      repeatX = planeAspect / texAspect;
    } else {
      // Mobile: Screen is taller than the image.
      // To ensure left/right are not completely lost, we fit the width exactly.
      repeatY = texAspect / planeAspect;
    }

    // Apply the repeat
    artwork.repeat.set(repeatX, repeatY);
    
    // Center the image by offsetting half of the repeated space
    artwork.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);
    
    // We use EdgeWrapping so the image seamlessly extends across the plane's margins
    artwork.wrapS = THREE.ClampToEdgeWrapping;
    artwork.wrapT = THREE.ClampToEdgeWrapping;
    artwork.needsUpdate = true; // Crucial for WebGL to apply wrap changes to uploaded textures!

  }, [artwork, planeScale]);

  return (
    <mesh position={[0, 0, zPosition]} scale={[planeScale[0], planeScale[1], 1]} castShadow receiveShadow>
      <planeGeometry args={[1, 1, 64, 64]} />
      <meshStandardMaterial
        map={artwork}
        bumpMap={artwork}
        bumpScale={0.02} 
        roughness={0.9} 
        metalness={0.0}
      />
    </mesh>
  );
}
