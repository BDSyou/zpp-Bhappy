import { Vector3, MathUtils } from 'three';
import { ParticleData, ParticleType } from '../types';

export const generateBoxPositions = (count: number, size: number): Vector3[] => {
  const positions: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    // Generate points on the surface of a cube
    const axis = Math.floor(Math.random() * 3);
    const sign = Math.random() < 0.5 ? -1 : 1;
    
    const x = axis === 0 ? sign * size : (Math.random() - 0.5) * 2 * size;
    const y = axis === 1 ? sign * size : (Math.random() - 0.5) * 2 * size;
    const z = axis === 2 ? sign * size : (Math.random() - 0.5) * 2 * size;
    
    positions.push(new Vector3(x, y, z));
  }
  return positions;
};

export const generateBowPositions = (count: number, size: number): Vector3[] => {
  const positions: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    // Simple parametric loops for a bow on top (y = size)
    const t = (i / count) * Math.PI * 4;
    const x = Math.sin(t) * (size * 0.8) * Math.cos(t * 0.5);
    const z = Math.cos(t) * (size * 0.8) * Math.cos(t * 0.5);
    const y = size + Math.abs(Math.sin(t * 2)) * (size * 0.5);
    positions.push(new Vector3(x, y, z));
  }
  return positions;
};

export const generateScatterPosition = (radius: number): Vector3 => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos((Math.random() * 2) - 1);
  const r = Math.cbrt(Math.random()) * radius; // Uniform distribution in sphere
  
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new Vector3(x, y, z);
};

export const getColor = (type: ParticleType): string => {
  if (type === ParticleType.CUBE) return '#b91c1c'; // Christmas Red
  if (type === ParticleType.SPHERE) return '#d4af37'; // Metal Gold
  if (type === ParticleType.BOW) return '#d4af37'; // Gold Ribbon
  return '#ffffff';
};