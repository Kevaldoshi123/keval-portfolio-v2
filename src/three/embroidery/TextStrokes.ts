import * as THREE from 'three';

/**
 * A manual single-line vector representation of characters.
 * Each letter returns an array of THREE.Curve3 objects.
 * The coordinate system is relative: 0 to 1 in width and height, where (0,0) is bottom-left.
 */

// Helper to create a straight line
const L = (x1: number, y1: number, x2: number, y2: number) => {
  return new THREE.LineCurve3(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0));
};

// Helper to create a CatmullRom curve
const C = (points: [number, number][], closed = false) => {
  const vPoints = points.map(p => new THREE.Vector3(p[0], p[1], 0));
  return new THREE.CatmullRomCurve3(vPoints, closed, 'chordal', 0.5);
};

export const getLetterCurves = (char: string): THREE.Curve<THREE.Vector3>[] => {
  switch (char.toUpperCase()) {
    case 'K':
      return [
        L(0, 1, 0, 0), // Spine
        L(1, 1, 0, 0.4), // Top diagonal
        L(0.3, 0.52, 1, 0) // Bottom diagonal
      ];
    case 'E':
      return [
        L(0, 1, 0, 0), // Spine
        L(0, 1, 1, 1), // Top
        L(0, 0.5, 0.8, 0.5), // Mid
        L(0, 0, 1, 0) // Bottom
      ];
    case 'V':
      return [
        L(0, 1, 0.5, 0),
        L(0.5, 0, 1, 1)
      ];
    case 'A':
      return [
        L(0, 0, 0.5, 1), // Left
        L(0.5, 1, 1, 0), // Right
        L(0.2, 0.4, 0.8, 0.4) // Crossbar
      ];
    case 'L':
      return [
        L(0, 1, 0, 0), // Spine
        L(0, 0, 1, 0) // Bottom
      ];
    case 'D':
      return [
        L(0, 1, 0, 0), // Spine
        C([
          [0, 1],
          [0.8, 1],
          [1, 0.5],
          [0.8, 0],
          [0, 0]
        ])
      ];
    case 'O':
      return [
        C([
          [0.5, 1],
          [0.1, 0.85],
          [0, 0.5],
          [0.1, 0.15],
          [0.5, 0],
          [0.9, 0.15],
          [1, 0.5],
          [0.9, 0.85]
        ], true) // Closed loop
      ];
    case 'S':
      return [
        C([
          [1, 0.85],
          [0.8, 1],
          [0.2, 1],
          [0, 0.8],
          [0.1, 0.6],
          [0.5, 0.5],
          [0.9, 0.4],
          [1, 0.2],
          [0.8, 0],
          [0.2, 0],
          [0, 0.15]
        ])
      ];
    case 'H':
      return [
        L(0, 1, 0, 0), // Left spine
        L(1, 1, 1, 0), // Right spine
        L(0, 0.5, 1, 0.5) // Crossbar
      ];
    case 'I':
      return [
        L(0.5, 1, 0.5, 0) // Spine
      ];
    default:
      return [];
  }
};

/**
 * Converts a string of text into an array of scaled and positioned 3D curves.
 */
export const getTextCurves = (
  text: string, 
  startX: number, 
  startY: number, 
  scale: number, 
  letterSpacing: number
): THREE.Curve<THREE.Vector3>[] => {
  
  const allCurves: THREE.Curve<THREE.Vector3>[] = [];
  let currentX = startX;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === ' ') {
      currentX += scale * letterSpacing;
      continue;
    }

    const curves = getLetterCurves(char);
    
    // Scale and position each curve
    curves.forEach(curve => {
      // Create a transformed curve
      const points = curve.getPoints(20).map(p => {
        return new THREE.Vector3(
          currentX + p.x * scale,
          startY + p.y * scale,
          0
        );
      });
      
      if (curve instanceof THREE.CatmullRomCurve3) {
        allCurves.push(new THREE.CatmullRomCurve3(points, curve.closed, 'chordal', 0.5));
      } else {
        allCurves.push(new THREE.LineCurve3(points[0], points[points.length - 1]));
      }
    });

    // Move cursor for next letter
    // The width of a standard letter is roughly 'scale'. 
    // We add letterSpacing to get to the next origin.
    // Letters like 'I' could ideally use less width, but keeping it monospaced-ish is fine for now.
    currentX += scale * (char === 'I' ? 0.6 : 1.0) + (scale * letterSpacing);
  }

  return allCurves;
};
