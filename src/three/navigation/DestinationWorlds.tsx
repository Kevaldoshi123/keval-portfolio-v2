import { useState, useMemo } from 'react';
import { DESTINATIONS, type Destination, type DestinationId } from '../../navigation/navigationData';
import { EmbroideredPlanet } from '../cosmic/EmbroideredPlanet';
import { EmbroideryEngine } from '../embroidery/EmbroideryEngine';
import { StitchUtils } from '../embroidery/StitchUtils';
import { getTextCurves } from '../embroidery/TextStrokes';
import type { ThreadOptions, StitchSegment } from '../embroidery/types';

interface DestinationGroupProps {
  dest: Destination;
  isActive: boolean;
  x: number;
  y: number;
  isMobile: boolean;
  onClick: () => void;
}

function DestinationGroup({ dest, isActive, x, y, isMobile, onClick }: DestinationGroupProps) {
  const textStitches = useMemo(() => {
    // Increased scale for absolute readability, keeping spacing tight
    const scale = isMobile ? 0.055 : 0.062;
    const letterSpacing = 0.22; // Tighter spacing to allow larger scale
    
    const textWidth = dest.title.length * scale + (dest.title.length - 1) * scale * letterSpacing;
    const textStartX = -textWidth / 2;
    const textY = -0.32; // Placed underneath the object
    
    const threadOpts: ThreadOptions = {
      color: isActive ? '#E8D2AE' : '#D4C4A8', // Warm cream and ivory, same family as KEVAL DOSHI
      thickness: 0.016, // Very thick strokes for maximum small-text readability
      elevation: 0.02, // Slightly lifted to avoid sinking into fabric
      stitchLength: 0.025,
      stitchSpacing: 0.001, // Highly dense stitches
      pattern: 'RUNNING',
      rowCount: isActive ? 5 : 4, // More rows for solidity
      rowSpacing: 0.004,
      jitter: 0.001
    };
    
    const curves = getTextCurves(dest.title, textStartX, textY, scale, letterSpacing);
    let stitches: StitchSegment[] = [];
    curves.forEach(curve => {
      stitches = stitches.concat(StitchUtils.generateStitchesFromCurve(curve, threadOpts));
    });
    return stitches;
  }, [dest, isActive, isMobile]);

  return (
    <group 
      position={[x, y, -2.95]} 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <EmbroideredPlanet
        position={[0, 0, 0]}
        scale={isActive ? 0.20 : 0.14}
        planetType={dest.planetType}
        palette={dest.palette}
        driftAmplitude={isActive ? 0.03 : 0.015}
        seed={1000 + dest.title.length}
        depthLayer="foreground"
      />
      <EmbroideryEngine stitches={textStitches} />
    </group>
  );
}

export function DestinationWorlds() {
  const [activeId, setActiveId] = useState<DestinationId | null>(null);

  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

  const layout = useMemo(() => {
    return DESTINATIONS.map((dest, index) => {
      let x = 0;
      let y = 0;
      
      if (isMobile || isTablet) {
        const row = Math.floor(index / 3);
        const col = index % 3;
        
        y = row === 0 ? -1.3 : -1.8;
        x = col === 0 ? -1.6 : col === 1 ? 0 : 1.6;
      } else {
        // Desktop positions mapped to ~10%, 26%, 42%, 58%, 74%, 90%
        // Assumes visible width at Z=-3 is approx 4.6 (X from -2.3 to 2.3)
        const desktopX = [-1.84, -1.10, -0.36, 0.36, 1.10, 1.84];
        // Moved up ~8% (from -1.25 average to -1.05 average), keeping natural variation
        const desktopY = [-0.95, -1.10, -0.90, -1.20, -1.00, -1.15];
        
        x = desktopX[index];
        y = desktopY[index];
      }
      
      return { dest, x, y };
    });
  }, [isMobile, isTablet]);

  return (
    <group>
      {layout.map(({ dest, x, y }) => (
        <DestinationGroup
          key={dest.id}
          dest={dest}
          isActive={activeId === dest.id}
          x={x}
          y={y}
          isMobile={isMobile}
          onClick={() => setActiveId(dest.id)}
        />
      ))}
    </group>
  );
}
