import * as THREE from 'three';

export type StitchPattern = 'RUNNING' | 'BACKSTITCH' | 'CROSS';

export interface ThreadOptions {
  color: string;
  thickness: number;
  elevation: number;
  stitchLength: number;
  stitchSpacing: number;
  pattern: StitchPattern;
  rowCount?: number; // Number of parallel rows for thick strokes
  rowSpacing?: number; // Distance between rows
  jitter?: number; // Subtle handmade imperfection amount
}

export interface StitchSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: THREE.Color;
  thickness: number;
}
