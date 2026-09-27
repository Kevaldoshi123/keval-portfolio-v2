import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { globalUniforms } from '../GlobalUniforms';

export interface SuspendedObjectProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  floatSpeed?: number;
  floatIntensity?: number;
  swaySpeed?: number;
  swayIntensity?: number;
  timeOffset?: number; 
  children: React.ReactNode;
}

export function SuspendedObject({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  floatSpeed = 1.0,
  floatIntensity = 0.05,
  swaySpeed = 0.5,
  swayIntensity = 0.03,
  timeOffset = 0,
  children
}: SuspendedObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  // We use a spring-like dampener to smooth the cursor reaction
  const cursorOffset = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const t = state.clock.getElapsedTime() + timeOffset;
    
    // Base physical animation
    const floatOffset = Math.sin(t * floatSpeed) * floatIntensity;
    const swayX = Math.sin(t * swaySpeed * 1.1) * swayIntensity;
    const swayY = Math.cos(t * swaySpeed * 1.3) * swayIntensity;
    const rotX = Math.sin(t * swaySpeed * 0.9) * swayIntensity * 0.2;
    const rotY = Math.cos(t * swaySpeed * 1.2) * swayIntensity * 0.2;
    const rotZ = Math.sin(t * swaySpeed * 0.7) * swayIntensity * 0.1;

    // Cursor interaction (suspended objects sway slightly away from cursor)
    const cursor = globalUniforms.uCursor.value;
    const dist = Math.hypot(position[0] - cursor.x, position[1] - cursor.y);
    
    // If cursor is within 2.0 units, push away slightly
    const pushStrength = Math.max(0, 1.0 - dist / 2.0) * 0.15; 
    const dx = position[0] - cursor.x;
    const dy = position[1] - cursor.y;
    const dirLength = Math.hypot(dx, dy) || 1;
    
    const targetOffsetX = (dx / dirLength) * pushStrength;
    const targetOffsetY = (dy / dirLength) * pushStrength;
    
    cursorOffset.current.x += (targetOffsetX - cursorOffset.current.x) * 0.1;
    cursorOffset.current.y += (targetOffsetY - cursorOffset.current.y) * 0.1;

    // Apply combined
    groupRef.current.position.set(
      position[0] + swayX + cursorOffset.current.x,
      position[1] + swayY + cursorOffset.current.y,
      position[2] + floatOffset
    );

    // Lean slightly based on cursor push
    groupRef.current.rotation.set(
      rotation[0] + rotX - cursorOffset.current.y * 0.5,
      rotation[1] + rotY + cursorOffset.current.x * 0.5,
      rotation[2] + rotZ
    );
  });

  return (
    <group ref={groupRef} scale={scale}>
      {children}
    </group>
  );
}
