import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { globalUniforms, displacementShaderChunk } from './GlobalUniforms';

export function FabricSurface() {
  const [fabricMaterial, setFabricMaterial] = useState<THREE.MeshStandardMaterial | null>(null);

  useEffect(() => {
    console.log('[FABRIC] Rebuilding PBR material via raw loaders...');
    
    const loader = new THREE.TextureLoader();
    
    Promise.all([
      loader.loadAsync('/textures/fabric/Fabric030_1K-JPG_Color.jpg'),
      loader.loadAsync('/textures/fabric/Fabric030_1K-JPG_NormalGL.jpg'),
      loader.loadAsync('/textures/fabric/Fabric030_1K-JPG_Roughness.jpg'),
      loader.loadAsync('/textures/fabric/Fabric030_1K-JPG_AmbientOcclusion.jpg'),
      loader.loadAsync('/textures/fabric/Fabric030_1K-JPG_Displacement.jpg')
    ]).then(([colorTex, normalTex, roughTex, aoTex, dispTex]) => {
      
      // We know 4 was too large. 20 provides a subtle, physically believable dense weave.
      const repeatScale = 20; 
      
      const maps = [colorTex, normalTex, roughTex, aoTex, dispTex];
      
      maps.forEach(tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatScale, repeatScale);
        
        // Re-enable mipmaps now that we have a stable loading pipeline,
        // but use high anisotropy to preserve weave detail at grazing angles.
        tex.anisotropy = 16;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
      });
      
      colorTex.colorSpace = THREE.SRGBColorSpace;
      
      const mat = new THREE.MeshStandardMaterial({
        map: colorTex,
        normalMap: normalTex,
        roughnessMap: roughTex,
        aoMap: aoTex,
        displacementMap: dispTex,
        
        // The raw color map is taupe/gray.
        // If we use #182845 here, multiplying it by the taupe texture yields pure black.
        // We use a brighter steel-blue tint (#4A70A5). When the PBR shader multiplies this
        // by the taupe texture, the final mathematical result is a deep, rich midnight navy.
        color: "#4A70A5",
        
        roughness: 0.9, // Matte cloth, eliminates the artificial bright white glow
        metalness: 0.0,
        
        aoMapIntensity: 1.0,
        normalScale: new THREE.Vector2(1.5, 1.5), // Natural physical bump, not gravel
        displacementScale: 0.02, // Very subtle physical depth
        
        side: THREE.DoubleSide
      });
      
      mat.onBeforeCompile = (shader) => {
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
      };
      
      setFabricMaterial(mat);
      
    }).catch(error => {
      console.error('[FABRIC] PBR LOAD ERROR', error);
    });
    
  }, []);

  return (
    <mesh position={[0, 0, -3]} receiveShadow>
      <planeGeometry args={[50, 50, 256, 256]} />
      {fabricMaterial && (
        <primitive object={fabricMaterial} attach="material" />
      )}
    </mesh>
  );
}
