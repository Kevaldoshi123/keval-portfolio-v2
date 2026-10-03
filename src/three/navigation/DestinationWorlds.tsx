import { useState, useMemo } from 'react';
import { DESTINATIONS, type Destination, type DestinationId } from '../../navigation/navigationData';
import { NavigationPlanet } from './NavigationPlanet';
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
    // Maximum possible scale that fits within horizontal boundaries
    const scale = isMobile ? 0.055 : 0.065;
    const letterSpacing = 0.15; // Tight spacing prevents horizontal overlap
    
    const textWidth = dest.title.length * scale + (dest.title.length - 1) * scale * letterSpacing;
    const textStartX = -textWidth / 2;
    const textY = -0.49; // Placed further underneath to clear the now larger planet
    
    const threadOpts: ThreadOptions = {
      color: isActive ? '#F4E7D3' : '#E8D2AE', // Warm cream and ivory
      thickness: 0.005, // Thin thread to preserve negative space inside letters
      elevation: 0.01, // Very subtle lift
      stitchLength: 0.015,
      stitchSpacing: 0.001, // High density along the curve
      pattern: 'RUNNING',
      rowCount: isActive ? 3 : 2, // Minimal rows to prevent stroke bleeding
      rowSpacing: 0.0015,
      jitter: 0.0005 // Minimal jitter for clean letterforms
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
      <NavigationPlanet
        position={[0, 0, 0]}
        scale={isActive ? 0.46 : 0.38}
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
