import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { FabricSurface } from './FabricSurface';
import { TestEmbroideryScene } from './embroidery/TestEmbroideryScene';
import { EmbroideredStarField } from './cosmic/EmbroideredStarField';
import { CosmicDustField } from './cosmic/CosmicDustField';
import { OrbitalSystem } from './cosmic/OrbitalSystem';
import { EmbroideredPlanet } from './cosmic/EmbroideredPlanet';
import { EmbroideredRocket } from './objects/EmbroideredRocket';
import { EmbroideredAstronaut } from './objects/EmbroideredAstronaut';
import { DestinationWorlds } from './navigation/DestinationWorlds';
import * as THREE from 'three';
import { globalUniforms } from './GlobalUniforms';

function InteractionManager() {
  const { camera, pointer, raycaster } = useThree();
  const isMobile = window.innerWidth < 768;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 3); // Z = -3 plane
  const targetVec = new THREE.Vector3();
  const previousCursor = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());

  useFrame(() => {
    if (isMobile) return;
    
    // 1. Camera Parallax (Reduced drastically so the whole scene doesn't move wildly)
    const targetX = pointer.x * 0.1;
    const targetY = pointer.y * 0.1 - 1.2; 
    
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(0, -0.5, -3); 
    
    // 2. Physical Cursor Raycasting
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, targetVec);
    
    // Calculate instantaneous velocity based on target
    velocity.current.subVectors(targetVec, previousCursor.current);
    previousCursor.current.copy(targetVec);
    
    // Smoothly update the shader uniforms for fabric displacement
    // Reduced from 0.15 to 0.08 so the deformation lags slightly behind the mouse, giving the cloth "weight"
    globalUniforms.uCursor.value.lerp(targetVec, 0.08);
    
    // Smooth velocity for the wake effect (fast decay to 0 when stopped)
    // Fast settling time as requested
    globalUniforms.uCursorVelocity.value.lerp(velocity.current, 0.25);
    
    // Global time for GPU-driven animations (drift, etc.)
    globalUniforms.uTime.value += 0.016; // approximate 60fps delta
  });
  
  return null;
}

function StudioLighting() {
  const lightRef = useRef<THREE.PointLight>(null);
  const { size, pointer } = useThree();
  const isMobile = size.width < 768;

  useFrame((state) => {
    if (!lightRef.current) return;
    
    if (isMobile) {
      const t = state.clock.elapsedTime * 0.15;
      lightRef.current.position.x = Math.sin(t) * 1.2;
      lightRef.current.position.y = Math.cos(t) * 1.2;
    } else {
      const targetX = pointer.x * 3;
      const targetY = pointer.y * 3;
      
      lightRef.current.position.x += (targetX - lightRef.current.position.x) * 0.03;
      lightRef.current.position.y += (targetY - lightRef.current.position.y) * 0.03;
    }
  });

  return (
    <>
      {/* Broad soft ambient light gives a base readable level to the entire fabric */}
      <ambientLight intensity={1.2} color="#ffffff" />
      
      {/* Main directional light: Soft broad lighting to create gentle shadows on the weave */}
      <directionalLight 
        position={[-8, 8, 6]} 
        intensity={0.8} 
        color="#ffffff" 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0015} // Increased bias to reduce large disconnected black shadows
      />

      {/* Warm secondary rim light to separate the fabric slightly */}
      <directionalLight 
        position={[6, -6, 4]} 
        intensity={0.4} 
        color="#e8d2ae" 
      />
      
      {/* Cursor Highlight: Made softer and broader so it illuminates a wide area of fabric smoothly */}
      {/* EXTREMELY IMPORTANT PERFORMANCE FIX: Removed castShadow from pointLight. PointLight shadows render 6 times per frame and destroy performance. */}
      <pointLight 
        ref={lightRef} 
        position={[0, 0, 4]} 
        intensity={0.6} 
        color="#ffffff" 
        distance={30} 
        decay={1.5}
      />
    </>
  );
}

export function TextileCanvas() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: -1, background: '#121517' }}>
      <Canvas
        camera={{ position: [0, -2, 5], fov: 30 }}
        dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        shadows // Enable shadow mapping
      >
        <Suspense fallback={null}>
          <InteractionManager />
          <StudioLighting />
          <FabricSurface />
          <CosmicDustField />
          <OrbitalSystem 
            cx={-2.7} 
            cy={0.8} 
            radiusX={0.95} 
            radiusY={0.45} 
            rotation={-Math.PI / 8}
            stitchColor="#5D78A2" // Muted dusty blue, visible but not neon
            thickness={0.014}     // Increased by ~15% for readability
            irregularity={0.02}   // Reduced wobble for a cleaner embroidered ellipse
          />
          {/* UPPER LEFT: Hero Striped Ringed Planet */}
          <EmbroideredPlanet 
            position={[-2.7, 0.8, -2.85]} 
            scale={0.55} 
            planetType="striped"
            palette={['#E8D2AE', '#A06B50', '#D49A6A', '#5D78A2', '#8B9C8A']}
            ringColor="#A06B50"
            depthLayer="foreground"
            driftAmplitude={0.06}
            moons={[
              { radius: 0.15, orbitRadius: 2.0, orbitSpeed: 0.05, phase: 0, color: '#F4E7D3', type: 'crescent', inclination: Math.PI/6 }, // Pale cream crescent, tilted
              { radius: 0.08, orbitRadius: 2.6, orbitSpeed: 0.03, phase: Math.PI, color: '#8B9C8A', type: 'solid', inclination: -Math.PI/8 } // Tiny distant green moon
            ]}
          />

          {/* MID LEFT: Mars */}
          <EmbroideredPlanet 
            position={[-3.2, -0.6, -2.9]} 
            scale={0.35} 
            seed={101}
            planetType="cratered"
            palette={['#8B3A3A', '#A0522D', '#CD5C5C', '#E8D2AE', '#5C2424']} // Rust, terracotta, brick red, cream, dark brown craters
            ringColor={null}
            depthLayer="midground"
            driftAmplitude={0.04}
            moons={[
              { radius: 0.07, orbitRadius: 1.5, orbitSpeed: 0.08, phase: 0, color: '#E8D2AE', type: 'cratered', inclination: Math.PI/12 }, // Textured gray/cream
              { radius: 0.04, orbitRadius: 2.1, orbitSpeed: 0.06, phase: Math.PI, color: '#A0522D', type: 'solid', inclination: -Math.PI/4 } // Tiny distant rust moon
            ]}
          />

          {/* UPPER RIGHT: Neptune */}
          <EmbroideredPlanet 
            position={[3.2, 1.4, -2.92]} 
            scale={0.4} 
            seed={202}
            planetType="striped"
            palette={['#1B263B', '#415A77', '#778DA9', '#E0E1DD']} // Navy, deep blue, dusty cyan, cream
            ringColor={null}
            depthLayer="midground"
            driftAmplitude={0.03}
          />
          
          {/* MID RIGHT: Jupiter */}
          <EmbroideredPlanet 
            position={[2.4, -0.2, -2.9]} 
            scale={0.6} 
            seed={303}
            planetType="jupiter"
            palette={['#E8D2AE', '#D49A6A', '#A06B50', '#C85A3F']} // Cream, tan, brown, rust spot
            ringColor={null}
            depthLayer="foreground"
            driftAmplitude={0.05}
            moons={[
              { radius: 0.1, orbitRadius: 2.2, orbitSpeed: 0.04, phase: Math.PI/2, color: '#F4E7D3', type: 'solid', inclination: Math.PI/4 }, // Pale cream full moon
              { radius: 0.12, orbitRadius: 2.8, orbitSpeed: 0.03, phase: Math.PI/4, color: '#D49A6A', type: 'crescent', inclination: -Math.PI/6 } // Tan crescent
            ]}
          />

          {/* FAR RIGHT: Saturn */}
          <EmbroideredPlanet 
            position={[4.6, -0.8, -2.95]} 
            scale={0.45} 
            seed={404}
            planetType="saturn"
            palette={['#F4E7D3', '#E8D2AE', '#D49A6A', '#A06B50']} // Beige, cream, tan
            ringColor={null} // Generated internally
            depthLayer="background"
            driftAmplitude={0.02}
          />

          {/* FAR BACKGROUND: Uranus */}
          <EmbroideredPlanet 
            position={[1.2, 2.2, -2.98]} 
            scale={0.25} 
            seed={505}
            planetType="uranus"
            palette={['#7BA0C0', '#5D78A2', '#E8D2AE']} // Muted teal/cyan
            ringColor={null} 
            depthLayer="background"
            driftAmplitude={0.01}
          />

          {/* LOWER RIGHT: Small Moon + Planet cluster */}
          <EmbroideredPlanet 
            position={[2.6, -2.0, -2.92]} 
            scale={0.15} 
            seed={606}
            planetType="solid"
            palette={['#5D78A2']}
            ringColor={null}
            depthLayer="midground"
            driftAmplitude={0.03}
            moons={[
              { radius: 0.3, orbitRadius: 2.0, orbitSpeed: 0.06, phase: 0, color: '#E8D2AE', type: 'cratered', inclination: 0 }
            ]}
          />

          {/* LOWER LEFT: Tiny Distant Worlds */}
          <EmbroideredPlanet 
            position={[-1.5, -2.4, -2.98]} 
            scale={0.08} 
            seed={707}
            planetType="solid"
            palette={['#A06B50']}
            ringColor={null} 
            depthLayer="background"
            driftAmplitude={0.01}
          />
          <EmbroideredStarField />
          <TestEmbroideryScene />
          
          {/* NAVIGATION OBJECTS */}
          <EmbroideredRocket 
            position={[-1.6, 1.5, -2.9]} 
            scale={0.25} 
            rotation={[0, 0, Math.PI / 6]} 
          />
          <EmbroideredAstronaut 
            position={[1.5, 0.2, -2.85]} 
            scale={0.2} 
            rotation={[0, 0, -Math.PI / 8]} 
          />
          <DestinationWorlds />
        </Suspense>
      </Canvas>
    </div>
  );
}

