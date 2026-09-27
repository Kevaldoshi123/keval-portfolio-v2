import * as THREE from 'three';
import { globalUniforms, displacementShaderChunk } from '../GlobalUniforms';

export const createStitchMaterial = () => {
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.9, 
    metalness: 0.0, 
    color: new THREE.Color(0xffffff), 
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
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
      	mvPosition = instanceMatrix * mvPosition;
      #endif
      
      // Because the instanced mesh itself is at the origin with no rotation/scale,
      // mvPosition is effectively world space here before modelViewMatrix is applied.
      float disp = getDisplacement(mvPosition.xy, uCursor.xy, uCursorVelocity.xy, uDeformRadius, uDeformDepth);
      
      // Apply physical Z displacement in world space, not local thread space!
      mvPosition.z += disp;
      
      // Continue with normal projection
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  
  return mat;
};
