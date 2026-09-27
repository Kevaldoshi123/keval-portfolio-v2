import * as THREE from 'three';

// Shared uniforms to synchronize fabric deformation across different materials
export const globalUniforms = {
  uCursor: { value: new THREE.Vector3(0, 0, 0) },
  uCursorVelocity: { value: new THREE.Vector3(0, 0, 0) },
  uDeformRadius: { value: 2.2 }, // Slightly smaller localized area
  uDeformDepth: { value: -0.22 }, // Reduced by ~25% for a heavier, restrained feel
  uTime: { value: 0.0 }
};

/**
 * Shader injection string to calculate physical cursor displacement.
 * This is injected into the vertex shader of any material that needs to deform
 * with the fabric (e.g. FabricSurface and EmbroideryEngine).
 */
export const displacementShaderChunk = `
  uniform vec3 uCursor;
  uniform vec3 uCursorVelocity;
  uniform float uDeformRadius;
  uniform float uDeformDepth;

  float getDisplacement(vec2 pos2d, vec2 cursor2d, vec2 velocity2d, float radius, float depth) {
    // Distance to cursor
    float dist = distance(pos2d, cursor2d);
    
    // We add a subtle drag/wake effect based on velocity
    // Vector from cursor to vertex
    vec2 dir = pos2d - cursor2d;
    float dirLen = length(dir);
    float dotVel = 0.0;
    if (dirLen > 0.001) {
       dotVel = dot(dir / dirLen, velocity2d);
    }
    
    // Normalized distance
    float normDist = dist / radius;
    
    // Damped wave: creates a depression at center, and a subtle raised ridge around it.
    float wave = cos(normDist * 3.14159);
    
    // Exponential falloff - tightened to 4.0 for a heavier cloth that resists distant motion
    float falloff = exp(-(normDist * normDist) * 4.0);
    
    // Base static depression + ridge
    float disp = depth * wave * falloff;
    
    // Add a trailing wake: heavily reduced so it's a subtle follow-through
    float wake = 0.0;
    if (dotVel < 0.0) {
        float wakeFalloff = exp(-(normDist * normDist) * 3.0);
        wake = sin(normDist * 6.0) * depth * 0.05 * wakeFalloff * length(velocity2d);
    }
    
    return disp + wake;
  }

  vec3 computeDeformedNormal(vec2 pos2d, vec2 cursor2d, vec2 velocity2d, float radius, float depth, vec3 originalNormal) {
    float epsilon = 0.05;
    
    float d0 = getDisplacement(pos2d, cursor2d, velocity2d, radius, depth);
    float dx = getDisplacement(pos2d + vec2(epsilon, 0.0), cursor2d, velocity2d, radius, depth);
    float dy = getDisplacement(pos2d + vec2(0.0, epsilon), cursor2d, velocity2d, radius, depth);
    
    float dzdx = (dx - d0) / epsilon;
    float dzdy = (dy - d0) / epsilon;
    
    // The perturbed surface normal
    vec3 waveNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
    
    // Blend with original geometry normal (crucial for preserving 3D stitch shading)
    // For the flat fabric plane, originalNormal is (0,0,1), so blending is perfect.
    // For stitches, this slightly bends their normals along the wave.
    return normalize(originalNormal + vec3(-dzdx, -dzdy, 0.0));
  }

  void applyCursorDeformation(inout vec3 pos, inout vec3 objNormal) {
    float disp = getDisplacement(pos.xy, uCursor.xy, uCursorVelocity.xy, uDeformRadius, uDeformDepth);
    objNormal = computeDeformedNormal(pos.xy, uCursor.xy, uCursorVelocity.xy, uDeformRadius, uDeformDepth, objNormal);
    pos.z += disp;
  }
`;
