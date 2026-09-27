import * as THREE from 'three';
import type { ThreadOptions, StitchSegment } from './types';

export class StitchUtils {
  
  /**
   * Generates individual stitch segments along a THREE.Curve.
   * This handles breaking a continuous mathematical curve into discrete physical thread segments.
   */
  static generateStitchesFromCurve(
    curve: THREE.Curve<THREE.Vector3>,
    options: ThreadOptions
  ): StitchSegment[] {
    const segments: StitchSegment[] = [];
    const totalLength = curve.getLength();
    
    // We walk along the curve generating stitches
    const { stitchLength, stitchSpacing, elevation, color, thickness, pattern, rowCount = 1, rowSpacing = thickness, jitter = 0 } = options;
    const stride = stitchLength + stitchSpacing;
    const stitchCount = Math.floor(totalLength / stride);
    const c = new THREE.Color(color);

    for (let i = 0; i < stitchCount; i++) {
      const uStart = (i * stride) / totalLength;
      
      if (pattern === 'RUNNING') {
        const uEnd = uStart + (stitchLength / totalLength);
        if (uEnd > 1.0) break;
        
        const ptStartBase = curve.getPointAt(uStart);
        const ptEndBase = curve.getPointAt(uEnd);
        
        // Calculate tangent for offset
        const tangent = curve.getTangentAt(uStart + (stitchLength / 2) / totalLength);
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        
        // Generate parallel rows
        for (let row = 0; row < rowCount; row++) {
          const ptStart = ptStartBase.clone();
          const ptEnd = ptEndBase.clone();
          
          // Row offset (center the rows along the curve)
          const rowOffsetMag = (row - (rowCount - 1) / 2) * rowSpacing;
          const rowOffset = normal.clone().multiplyScalar(rowOffsetMag);
          
          // True zig-zag offset
          const offsetMag = thickness * 0.6;
          // Alternate direction based on both stitch index and row index
          const dir = (i + row) % 2 === 0 ? 1 : -1;
          
          const offsetStart = normal.clone().multiplyScalar(offsetMag * dir);
          const offsetEnd = normal.clone().multiplyScalar(-offsetMag * dir);
          
          ptStart.add(rowOffset).add(offsetStart);
          ptEnd.add(rowOffset).add(offsetEnd);
          
          // Apply handmade jitter if requested
          let zElev = elevation;
          if (jitter > 0) {
            ptStart.x += (Math.random() - 0.5) * jitter;
            ptStart.y += (Math.random() - 0.5) * jitter;
            ptEnd.x += (Math.random() - 0.5) * jitter;
            ptEnd.y += (Math.random() - 0.5) * jitter;
            // Slight height variation (some stitches pulled tighter than others)
            zElev += (Math.random() - 0.5) * jitter * 0.5;
          }
          
          ptStart.z = zElev;
          ptEnd.z = zElev;
          
          segments.push({ start: ptStart, end: ptEnd, color: c, thickness });
        }
      } 
      else if (pattern === 'BACKSTITCH') {
        // Backstitch slightly overlaps for a continuous line look without gaps
        const uEnd = uStart + ((stitchLength * 1.5) / totalLength);
        if (uEnd > 1.0) break;
        
        const ptStart = curve.getPointAt(uStart);
        const ptEnd = curve.getPointAt(uEnd);
        
        ptStart.z = elevation;
        ptEnd.z = elevation;
        
        segments.push({ start: ptStart, end: ptEnd, color: c, thickness });
      }
      else if (pattern === 'CROSS') {
        // Generates an X shape
        const uEnd = uStart + (stitchLength / totalLength);
        if (uEnd > 1.0) break;
        
        const ptCenter = curve.getPointAt(uStart + (stitchLength / 2) / totalLength);
        const tangent = curve.getTangentAt(uStart + (stitchLength / 2) / totalLength);
        
        // Orthogonal vector in the XY plane
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(stitchLength / 2);
        const forward = tangent.clone().multiplyScalar(stitchLength / 2);
        
        // Cross stitch comprises two diagonal segments
        const p1 = ptCenter.clone().add(normal).sub(forward);
        const p2 = ptCenter.clone().sub(normal).add(forward);
        
        const p3 = ptCenter.clone().sub(normal).sub(forward);
        const p4 = ptCenter.clone().add(normal).add(forward);
        
        p1.z = p2.z = p3.z = p4.z = elevation;
        
        segments.push({ start: p1, end: p2, color: c, thickness });
        segments.push({ start: p3, end: p4, color: c, thickness });
      }
    }
    
    return segments;
  }
}
