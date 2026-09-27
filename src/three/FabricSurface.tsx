import { useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { globalUniforms, displacementShaderChunk } from './GlobalUniforms';

export function FabricSurface() {
  const [colorMap, normalMap, roughnessMap, aoMap, displacementMap] = useTexture([
    '/textures/fabric/Fabric030_1K-JPG_Color.jpg',
    '/textures/fabric/Fabric030_1K-JPG_NormalGL.jpg',
    '/textures/fabric/Fabric030_1K-JPG_Roughness.jpg',
    '/textures/fabric/Fabric030_1K-JPG_AmbientOcclusion.jpg',
    '/textures/fabric/Fabric030_1K-JPG_Displacement.jpg',
  ]);

  useEffect(() => {
    // We include displacementMap here so it gets the exact same repeat and filtering
    const maps = [colorMap, normalMap, roughnessMap, aoMap, displacementMap];
    
    // Scale 30 provides the exact physical thread size seen in the approved reference
    const repeatScale = 30; 
    
    maps.forEach((map) => {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(repeatScale, repeatScale);
      map.anisotropy = 16;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.generateMipmaps = true;
    });
    
    colorMap.colorSpace = THREE.SRGBColorSpace;
  }, [colorMap, normalMap, roughnessMap, aoMap, displacementMap]);

  return (
    <mesh position={[0, 0, -3]} receiveShadow>
      <planeGeometry args={[50, 50, 256, 256]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        aoMap={aoMap}
        // Applying the displacement map as a bump map gives sub-geometry depth 
        // without requiring millions of vertices.
        bumpMap={displacementMap}
        bumpScale={0.015}
        
        aoMapIntensity={1.2}
        color="#182845" // LOCKED COLOR
        
        // 0.8 roughness is physically accurate for cloth.
        // It provides a wide, extremely subtle specular spread that reveals the normal map
        // without creating an artificial "shiny/glossy" mirror spot.
        roughness={0.8} 
        
        metalness={0.0}
        
        // Exaggerated normal scale (5.0) is necessary to force the normal map ridges 
        // to catch directional light when the base color is this dark.
        normalScale={new THREE.Vector2(5.0, 5.0)} 
        
        onBeforeCompile={(shader) => {
          shader.uniforms.uCursor = globalUniforms.uCursor;
          shader.uniforms.uCursorVelocity = globalUniforms.uCursorVelocity;
          shader.uniforms.uDeformRadius = globalUniforms.uDeformRadius;
          shader.uniforms.uDeformDepth = globalUniforms.uDeformDepth;
          
          shader.vertexShader = `
            ${displacementShaderChunk}
            ${shader.vertexShader}
          `;
          
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            // objectNormal is available in Three.js standard materials before projection
            applyCursorDeformation(transformed, objectNormal);
            `
          );
        }}
      />
    </mesh>
  );
}
