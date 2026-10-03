import type { PlanetType } from '../three/navigation/NavigationPlanet';

export type DestinationId = 'ABOUT' | 'PROJECTS' | 'EXPERIENCE' | 'SERVICES' | 'EDUCATION' | 'CONTACT';

export interface Destination {
  id: DestinationId;
  title: string;
  planetType: PlanetType;
  palette: string[];
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'ABOUT',
    title: 'ABOUT',
    planetType: 'cratered',
    palette: ['#D4C4A8', '#C4B498', '#A89F91', '#3A3631'] // Cream/tan base, charcoal craters
  },
  {
    id: 'PROJECTS',
    title: 'PROJECTS',
    planetType: 'warm',
    palette: ['#A0522D', '#CD5C5C', '#8B3A3A', '#602020'] // Red/burgundy rocky planet
  },
  {
    id: 'EXPERIENCE',
    title: 'EXPERIENCE',
    planetType: 'earthlike',
    palette: ['#2F4F4F', '#5D8B6C'] // Deep blue/slate water, muted green land
  },
  {
    id: 'SERVICES',
    title: 'SERVICES',
    planetType: 'small_ring',
    palette: ['#D49A6A', '#C87E4A', '#B06535', '#E8D2AE'] // Orange base, cream subtle ring
  },
  {
    id: 'EDUCATION',
    title: 'EDUCATION',
    planetType: 'spiral',
    palette: ['#5E4B8C', '#9D82D3'] // Indigo base, lighter violet spiral
  },
  {
    id: 'CONTACT',
    title: 'CONTACT',
    planetType: 'striped',
    palette: ['#5D8B6C', '#4A7056', '#35543D', '#243A29'] // Olive/forest green bands
  }
];
