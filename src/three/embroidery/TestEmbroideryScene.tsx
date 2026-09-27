import { useMemo } from 'react';
import * as THREE from 'three';
import { EmbroideryEngine } from './EmbroideryEngine';
import { StitchUtils } from './StitchUtils';
import { getTextCurves } from './TextStrokes';
import { SuspendedObject } from '../objects/SuspendedObject';
import type { ThreadOptions, StitchSegment } from './types';

export function TestEmbroideryScene() {
  const { baseStitches, suspendedStitches } = useMemo(() => {
    let baseStitches: StitchSegment[] = [];
    let suspendedStitches: StitchSegment[] = [];

    // --- BASE EMBROIDERY (KEVAL DOSHI) ---
    // Remains flat on the fabric surface
    const baseElevation = -2.97; 
    const defaultThickness = 0.012; 
    
    const baseOpts: ThreadOptions = {
      color: '#E8D2AE',
      thickness: defaultThickness,
      elevation: baseElevation,
      stitchLength: 0.04,
      stitchSpacing: 0.002,
      pattern: 'RUNNING',
      rowCount: 7,
      rowSpacing: 0.003,
      jitter: 0.002
    };

    const scale = 0.5;
    const letterSpacing = 0.4;
    
    const kevalCurves = getTextCurves('KEVAL', -1.4, 0.2, scale, letterSpacing);
    kevalCurves.forEach(curve => {
      baseStitches = baseStitches.concat(StitchUtils.generateStitchesFromCurve(curve, baseOpts));
    });

    const doshiCurves = getTextCurves('DOSHI', -1.55, -0.6, scale, letterSpacing);
    doshiCurves.forEach(curve => {
      baseStitches = baseStitches.concat(StitchUtils.generateStitchesFromCurve(curve, baseOpts));
    });

    // --- SUSPENDED TEST OBJECT (SMALL ASTERISK) ---
    const suspendedOpts: ThreadOptions = {
      color: '#A8C5E6', // Bright, cool blue-white thread
      thickness: defaultThickness,
      elevation: 0, 
      stitchLength: 0.04,
      stitchSpacing: 0.002,
      pattern: 'RUNNING',
      rowCount: 4, 
      rowSpacing: 0.004,
      jitter: 0.002
    };

    // Very small asterisk star shape
    const r = 0.15;
    const starCurves = [
      new THREE.LineCurve3(new THREE.Vector3(-r, 0, 0), new THREE.Vector3(r, 0, 0)),
      new THREE.LineCurve3(new THREE.Vector3(0, -r, 0), new THREE.Vector3(0, r, 0)),
      new THREE.LineCurve3(new THREE.Vector3(-r*0.7, -r*0.7, 0), new THREE.Vector3(r*0.7, r*0.7, 0)),
      new THREE.LineCurve3(new THREE.Vector3(-r*0.7, r*0.7, 0), new THREE.Vector3(r*0.7, -r*0.7, 0))
    ];
    
    starCurves.forEach(curve => {
      suspendedStitches = suspendedStitches.concat(StitchUtils.generateStitchesFromCurve(curve, suspendedOpts));
    });

    return { baseStitches, suspendedStitches };
  }, []);

  return (
    <>
      {/* The main identity text absolutely flat and static on the fabric */}
      <EmbroideryEngine stitches={baseStitches} />
      
      {/* A tiny test object suspended slightly above the fabric (0.5 units above fabric) */}
      <SuspendedObject position={[0, 1.2, -2.5]} scale={1.0} floatIntensity={0.015} swayIntensity={0.01}>
        <EmbroideryEngine stitches={suspendedStitches} />
      </SuspendedObject>
    </>
  );
}
