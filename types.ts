import { Vector3 } from 'three';

export enum AppState {
  CLOSED = 'CLOSED',       // Gift box shape
  SCATTERED = 'SCATTERED', // Floating particles
  FOCUSED = 'FOCUSED',     // Single photo enlarged
}

export enum ParticleType {
  SPHERE = 'SPHERE',
  CUBE = 'CUBE',
  BOW = 'BOW',
  PHOTO = 'PHOTO',
}

export interface ParticleData {
  id: string;
  type: ParticleType;
  position: Vector3;       // Current target position used for calc
  targetPosition: Vector3; // Where it wants to go
  color: string;
  scale: number;
  photoUrl?: string;       // Only for PHOTO type
  phaseOffset: number;     // For floating animation
  history: Vector3[];      // Trail history
}

export interface HandGesture {
  isFist: boolean;
  isOpen: boolean;
  isPinch: boolean;
  isVictory: boolean;      // Peace sign (2 fingers)
  isOne: boolean;          // Index finger up (1 finger)
  rotation: { x: number; y: number };
  detected: boolean;
}