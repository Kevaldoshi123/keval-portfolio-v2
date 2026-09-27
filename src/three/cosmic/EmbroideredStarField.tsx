import { useMemo } from 'react';
import * as THREE from 'three';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import { StitchUtils } from '../embroidery/StitchUtils';
import type { StitchSegment, ThreadOptions } from '../embroidery/types';
import { globalUniforms, displacementShaderChunk } from '../GlobalUniforms';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function createMasterStarStitches(): StitchSegment[] {
  let stitches: StitchSegment[] = [];
  const r = 0.15;
  const starCurves = [
    new THREE.LineCurve3(new THREE.Vector3(-r, 0, 0), new THREE.Vector3(r, 0, 0)),
    new THREE.LineCurve3(new THREE.Vector3(0, -r, 0), new THREE.Vector3(0, r, 0)),
    new THREE.LineCurve3(new THREE.Vector3(-r*0.7, -r*0.7, 0), new THREE.Vector3(r*0.7, r*0.7, 0)),
    new THREE.LineCurve3(new THREE.Vector3(-r*0.7, r*0.7, 0), new THREE.Vector3(r*0.7, -r*0.7, 0))
  ];

  const masterOpts: ThreadOptions = {
    color: '#ffffff',
    thickness: 0.012,
    elevation: 0, 
    stitchLength: 0.04,
    stitchSpacing: 0.002,
    pattern: 'RUNNING',
    rowCount: 4, 
    rowSpacing: 0.004,
    jitter: 0.002
  };

  starCurves.forEach(curve => {
    stitches = stitches.concat(StitchUtils.generateStitchesFromCurve(curve, masterOpts));
  });

  return stitches;
}

// 1. Create a specialized Interactive Material that runs proximity physics on the GPU!
const createInteractiveStarMaterial = () => {
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
    shader.uniforms.uTime = globalUniforms.uTime; // Pass time for drift!
    
    // We calculate interaction strength purely in the shader based on the star's Z elevation!
    shader.vertexShader = `
      uniform float uTime;
      ${displacementShaderChunk}
      ${shader.vertexShader}
    `;
    
    // Completely hijack the vertex projection to apply world-space displacement and mouse push
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
      	mvPosition = instanceMatrix * mvPosition;
      #endif
      
      // Calculate Interaction Strength based on depth (Tiny stars at z=-2.97 react less than Hero stars at z=-2.5)
      // Normalize z between -2.97 and -2.5
      float zNorm = clamp((mvPosition.z + 2.97) / 0.47, 0.0, 1.0);
      float interactionStrength = mix(0.01, 0.15, zNorm);
      
      // ORGANIC DRIFT
      // Only medium/large stars should drift noticeably. 
      // zNorm is ~0.0 for TINY, ~0.08 for SMALL, ~0.25 for MEDIUM, ~0.57 for LARGE.
      // Use smoothstep to isolate the drift to larger stars.
      float driftMask = smoothstep(0.15, 0.6, zNorm); 
      
      // Use the star's initial world X/Y as a deterministic phase offset
      float phase = mvPosition.x * 2.1 + mvPosition.y * 1.7;
      
      // Very slow, calm, organic movement (drift distance scales with driftMask)
      float driftX = sin(uTime * 0.2 + phase) * 0.4 * driftMask;
      float driftY = cos(uTime * 0.15 + phase * 0.8) * 0.4 * driftMask;
      
      // Apply drift before cursor interaction
      mvPosition.x += driftX;
      mvPosition.y += driftY;
      
      // Fabric Wave Deformation
      float disp = getDisplacement(mvPosition.xy, uCursor.xy, uCursorVelocity.xy, uDeformRadius, uDeformDepth);
      
      // Proximity Push (Push away from cursor)
      vec2 dir = mvPosition.xy - uCursor.xy;
      float dist = length(dir);
      float influence = 1.5;
      
      if (dist < influence && dist > 0.001) {
          float force = (1.0 - (dist / influence)) * interactionStrength;
          // Smoothly push away in XY
          mvPosition.xy += (dir / dist) * force;
          // Subtly lift in Z
          mvPosition.z += force * 0.5;
      }
      
      // Apply Fabric Wave Z displacement
      mvPosition.z += disp;
      
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  return mat;
};

export function EmbroideredStarField() {
  const { starStitches, customMaterial } = useMemo(() => {
    const masterStitches = createMasterStarStitches();
    const allStitches: StitchSegment[] = [];
    
    const LAYER_TINY = -2.97;
    const LAYER_SMALL = -2.93;
    const LAYER_MEDIUM = -2.85;
    const LAYER_LARGE = -2.7;
    const LAYER_HERO = -2.5;

    const colors = [
      new THREE.Color('#E8D2AE'), // warm ivory
      new THREE.Color('#F0E6D2'), // cream
      new THREE.Color('#A8C5E6'), // muted blue
      new THREE.Color('#8DAFCF')  // slightly dimmer blue
    ];
    
    let seed = 554433;
    const defaultThickness = 0.012;
    
    // Create stars
    
    const placeStar = (cx: number, cy: number) => {
      const scaleRoll = seededRandom(seed++);
      let scale = 1.0;
      let z = LAYER_TINY;
      let type = 'TINY';
      
      if (scaleRoll > 0.99) { scale = 2.0; z = LAYER_HERO; type = 'HERO'; }
      else if (scaleRoll > 0.95) { scale = 1.2; z = LAYER_LARGE; type = 'LARGE'; }
      else if (scaleRoll > 0.85) { scale = 0.7; z = LAYER_MEDIUM; type = 'MEDIUM'; }
      else if (scaleRoll > 0.60) { scale = 0.4; z = LAYER_SMALL; type = 'SMALL'; }
      else { scale = 0.15; z = LAYER_TINY; type = 'TINY'; }
      
      const rot = seededRandom(seed++) * Math.PI * 2;
      let color = colors[Math.floor(seededRandom(seed++) * colors.length)];
      if (type === 'HERO' || type === 'LARGE') color = colors[2];
      
      const thickness = Math.max(defaultThickness * 0.4, defaultThickness * scale * 0.8);
      
      masterStitches.forEach(seg => {
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        
        const transformPoint = (p: THREE.Vector3) => {
          const sx = p.x * scale;
          const sy = p.y * scale;
          const rx = sx * cosR - sy * sinR;
          const ry = sx * sinR + sy * cosR;
          return new THREE.Vector3(cx + rx, cy + ry, z + p.z * scale);
        };
        
        allStitches.push({
          start: transformPoint(seg.start),
          end: transformPoint(seg.end),
          color: color.clone(),
          thickness: thickness
        });
      });
    };

    // Helper to create organic pockets (simulating nebulae/clusters)
    const organicMask = (x: number, y: number) => {
      const v = Math.sin(x * 0.4) * Math.cos(y * 0.4) + Math.sin(x * 0.15 + y * 0.25);
      return v > -0.3; 
    };

    // 1. Centralized General Field
    // Creates a smooth gradient: dense around the perimeter of the name, fading out to sparse edges
    let placed = 0;
    let attempts = 0;
    while (placed < 220 && attempts < 10000) {
      attempts++;
      // Generate a point clustered toward the center using power distribution
      const r = Math.pow(seededRandom(seed++), 1.3) * 16.0; 
      const angle = seededRandom(seed++) * Math.PI * 2;
      
      const cx = Math.cos(angle) * r;
      const cy = Math.sin(angle) * r;
      
      // TIGHT exclusion zone to protect KEVAL DOSHI readability
      const inExclusion = (cx*cx)/(3.2*3.2) + (cy*cy)/(1.8*1.8) < 1.0;
      
      if (!inExclusion && (organicMask(cx, cy) || seededRandom(seed++) > 0.85)) {
        placeStar(cx, cy);
        placed++;
      }
    }

    // 2. Dense Clusters / Milky Way feeling
    const clusters = [
      { x: -3, y: 2, angle: -Math.PI/6, length: 6, width: 1.5, density: 40 },
      { x: 4, y: -2, angle: Math.PI/4, length: 7, width: 2.0, density: 60 },
      { x: -6, y: -4, angle: 0, length: 4, width: 1.0, density: 25 }
    ];

    clusters.forEach(c => {
      for(let i = 0; i < c.density; i++) {
        const u = (seededRandom(seed++) - 0.5) * 2.0;
        const v = (seededRandom(seed++) + seededRandom(seed++) - 1.0); 
        
        const localX = u * c.length;
        const localY = v * c.width;
        const worldX = c.x + localX * Math.cos(c.angle) - localY * Math.sin(c.angle);
        const worldY = c.y + localX * Math.sin(c.angle) + localY * Math.cos(c.angle);
        
        if ((worldX*worldX)/(3.2*3.2) + (worldY*worldY)/(1.8*1.8) > 1.0) {
          placeStar(worldX, worldY);
        }
      }
    });

    const mat = createInteractiveStarMaterial();
    
    // We need a way to pass the aInteractionStrength attribute to the InstancedMesh.
    // However, since we don't have direct access to the geometry inside useMemo without refactoring EmbroideryEngine again,
    // and because all star interaction strengths are generally close, we can just simplify it and pass a global average
    // or modify EmbroideryEngine to accept custom attributes. 
    // To keep it clean and robust, we can actually just calculate strength purely in the shader based on mvPosition.z!
    
    return { starStitches: allStitches, customMaterial: mat };
  }, []);
  
  return <EmbroideryEngine stitches={starStitches} customMaterial={customMaterial} castShadow={false} />;
}
