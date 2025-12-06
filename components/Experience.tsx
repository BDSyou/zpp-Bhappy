import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Stars, Float, Image as DreiImage, Edges } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppState, ParticleData, ParticleType, HandGesture } from '../types';
import { generateBoxPositions, generateBowPositions, generateScatterPosition, getColor } from '../utils/math';

interface ExperienceProps {
  appState: AppState;
  photos: string[];
  gesture: HandGesture;
  setAppState: (s: AppState) => void;
}

const ParticleSystem: React.FC<ExperienceProps> = ({ appState, photos, gesture, setAppState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Configuration 
  const PARTICLE_COUNT = 600;
  const BOX_SIZE = 0.5;
  const SCATTER_RADIUS = 2.0;
  
  // Trail Config
  const TRAIL_LENGTH = 4; // Number of trailing ghosts
  const TRAIL_INTENSITY = 0.6; // Scale multiplier for trails
  
  // Active Photo State
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const lastSwitchTime = useRef(0);

  // Sound for switching
  const switchSound = useMemo(() => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'); // Reuse pop
      audio.volume = 0.2;
      return audio;
  }, []);

  // Initialize Particles
  const particles = useMemo(() => {
    const data: ParticleData[] = [];
    
    // 1. Create Box Structure
    const boxPositions = generateBoxPositions(PARTICLE_COUNT * 0.7, BOX_SIZE);
    const bowPositions = generateBowPositions(PARTICLE_COUNT * 0.3, BOX_SIZE);
    
    // Fill particle data
    [...boxPositions, ...bowPositions].forEach((pos, i) => {
        const isBow = i >= boxPositions.length;
        const type = isBow ? ParticleType.BOW : ParticleType.SPHERE;
        
        data.push({
            id: `p-${i}`,
            type,
            position: pos.clone(),
            targetPosition: pos.clone(),
            color: getColor(type),
            scale: isBow ? 0.04 : (Math.random() * 0.05 + 0.015),
            phaseOffset: Math.random() * 100,
            history: Array(TRAIL_LENGTH).fill(null).map(() => pos.clone())
        });
    });
    
    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Determine scatter positions constrained to center area
  const homePositions = useMemo(() => particles.map(p => p.position.clone()), [particles]);
  const scatterPositions = useMemo(() => particles.map(() => {
      const pos = generateScatterPosition(SCATTER_RADIUS);
      pos.multiply(new THREE.Vector3(1.1, 1.0, 0.5)); 
      return pos;
  }), [particles]);
  
  // Frame Loop
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Handle Group Rotation
    if (groupRef.current) {
        if (appState === AppState.SCATTERED) {
            if (gesture.detected) {
                // Hand Controlled Rotation
                const targetRotY = gesture.rotation.x * 2;
                const targetRotX = gesture.rotation.y * 2;
                
                groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2);
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2);
            } else {
                // Auto Rotation
                groupRef.current.rotation.y += delta * 0.15;
                groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta);
            }
        } else {
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta);
        }
    }

    if (!meshRef.current) return;
    
    // Update Particles
    particles.forEach((p, i) => {
        // --- TRAIL LOGIC START ---
        // 1. Recycle the oldest history vector
        const recycledPos = p.history[TRAIL_LENGTH - 1];
        // 2. Copy current state to it BEFORE updating current state
        recycledPos.copy(p.position);
        // 3. Move it to front of history
        p.history.pop();
        p.history.unshift(recycledPos);
        // --- TRAIL LOGIC END ---

        let target = new THREE.Vector3();
        
        if (appState === AppState.CLOSED) {
            target.copy(homePositions[i]);
        } else if (appState === AppState.SCATTERED || appState === AppState.FOCUSED) {
            target.copy(scatterPositions[i]);
            target.y += Math.sin(t + p.phaseOffset) * 0.2;
            target.x += Math.cos(t * 0.5 + p.phaseOffset) * 0.1;
        }

        const speed = appState === AppState.CLOSED ? 4 : 2;
        p.position.lerp(target, delta * speed);

        // Render Head
        dummy.position.copy(p.position);
        
        const twinkle = 1 + Math.sin(t * 3 + p.phaseOffset) * 0.15;
        const currentScale = (appState === AppState.CLOSED) ? 0 : (p.scale * twinkle);
        
        dummy.scale.setScalar(currentScale);
        dummy.updateMatrix();
        
        if (meshRef.current) meshRef.current.setMatrixAt(i, dummy.matrix);

        // Render Trails
        for (let j = 0; j < TRAIL_LENGTH; j++) {
            const trailPos = p.history[j];
            dummy.position.copy(trailPos);
            // Trail gets smaller further back in history
            const trailScale = currentScale * (1 - (j + 1) / (TRAIL_LENGTH + 1)) * TRAIL_INTENSITY;
            dummy.scale.setScalar(trailScale);
            dummy.updateMatrix();
            // Map to extended instance slots
            // Head is at i
            // Trail j is at PARTICLE_COUNT * (j + 1) + i
            meshRef.current.setMatrixAt(PARTICLE_COUNT * (j + 1) + i, dummy.matrix);
        }
    });
    
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Photo Activation Logic - "Peace" gesture
  useEffect(() => {
      if (gesture.isVictory && appState === AppState.SCATTERED) {
          const randomIndex = Math.floor(Math.random() * (photos.length || 1));
          setActivePhotoIndex(randomIndex);
          setAppState(AppState.FOCUSED);
      }
  }, [gesture.isVictory, appState, photos.length, setAppState]);

  // Photo Switch Logic - "One" gesture
  useFrame((state) => {
      if (appState === AppState.FOCUSED && gesture.isOne) {
          const now = state.clock.getElapsedTime();
          if (now - lastSwitchTime.current > 1.0) { // 1 second debounce
              setActivePhotoIndex(prev => (prev + 1) % photos.length);
              lastSwitchTime.current = now;
          }
      }
  });

  // Play sound on photo switch
  useEffect(() => {
    if (appState === AppState.FOCUSED) {
        switchSound.currentTime = 0;
        switchSound.play().catch(() => {});
    }
  }, [activePhotoIndex, appState, switchSound]);

  // Slideshow Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (appState === AppState.FOCUSED && photos.length > 1) {
        interval = setInterval(() => {
            setActivePhotoIndex(prev => (prev + 1) % photos.length);
        }, 5000); // 5 seconds
    }
    return () => clearInterval(interval);
  }, [appState, photos.length]);

  return (
    <group ref={groupRef}>
        {/* Box is always present, but changes appearance */}
        <GiftBox appState={appState} size={BOX_SIZE * 2} />

        {/* Increase args count to accommodate trails */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length * (TRAIL_LENGTH + 1)]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial 
                color={getColor(ParticleType.SPHERE)} 
                emissive={getColor(ParticleType.SPHERE)}
                emissiveIntensity={0.8}
                roughness={0.1}
                metalness={1}
            />
        </instancedMesh>

        {photos.map((url, i) => (
            <PhotoPlane 
                key={url} 
                url={url} 
                index={i} 
                total={photos.length} 
                appState={appState} 
                isActive={i === activePhotoIndex}
            />
        ))}
    </group>
  );
};

const GiftBox: React.FC<{ appState: AppState, size: number }> = ({ appState, size }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((state, delta) => {
        if (!groupRef.current) return;
        // When closed, size is full. When open, size shrinks to 0.
        const targetScale = appState === AppState.CLOSED ? 1 : 0;
        groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 4);
    });

    const isClosed = appState === AppState.CLOSED;

    return (
        <group ref={groupRef}>
            {/* Main Box Body */}
            <mesh>
                <boxGeometry args={[size * 0.9, size * 0.9, size * 0.9]} />
                <meshStandardMaterial 
                    color="#0f3d2e" // Matte Green
                    roughness={0.7} 
                    metalness={0.1}
                />
                {/* Glowing Edges */}
                <Edges
                    scale={1}
                    threshold={15} // Display edges only at sharp angles
                    color="#d4af37" // Metal Gold
                >
                     <meshBasicMaterial color="#d4af37" transparent opacity={isClosed ? 1 : 0} />
                </Edges>
            </mesh>
            
            {/* Ribbon Vertical */}
            <mesh scale={[1.01, 1.01, 1.01]}>
                <boxGeometry args={[size * 0.15, size * 0.92, size * 0.92]} />
                <meshStandardMaterial 
                    color="#b91c1c" 
                    emissive="#500000"
                    roughness={0.3} 
                    metalness={0.4}
                />
            </mesh>

             {/* Ribbon Horizontal */}
             <mesh scale={[1.01, 1.01, 1.01]}>
                <boxGeometry args={[size * 0.92, size * 0.92, size * 0.15]} />
                <meshStandardMaterial 
                    color="#b91c1c"
                    emissive="#500000"
                    roughness={0.3} 
                    metalness={0.4}
                />
            </mesh>

            {/* Bow / Knot */}
            <mesh position={[0, size * 0.45, 0]} rotation={[0, Math.PI / 4, 0]}>
                <torusKnotGeometry args={[size * 0.15, size * 0.05, 64, 8]} />
                <meshStandardMaterial 
                    color="#d4af37"
                    emissive="#d4af37"
                    emissiveIntensity={0.5}
                    roughness={0.2} 
                    metalness={0.9}
                />
            </mesh>
        </group>
    );
};

const PhotoPlane: React.FC<{ url: string; index: number; total: number; appState: AppState; isActive: boolean }> = 
({ url, index, total, appState, isActive }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const homePos = useMemo(() => {
        const p = generateScatterPosition(2.0);
        p.multiply(new THREE.Vector3(1.1, 1.0, 0.5));
        return p;
    }, []);
    
    const { camera } = useThree();
    const [hovered, setHover] = useState(false);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const t = state.clock.getElapsedTime();
        
        let targetPos = new THREE.Vector3();
        let targetScale = new THREE.Vector3(1, 1, 1);

        if (appState === AppState.CLOSED) {
            targetPos.set(0, 0, 0);
            targetScale.setScalar(0);
        } else if (appState === AppState.SCATTERED) {
            targetPos.copy(homePos);
            targetPos.y += Math.sin(t + index) * 0.3;
            targetScale.setScalar(0.8); 
            mesh.current.lookAt(camera.position); 
        } else if (appState === AppState.FOCUSED) {
            if (isActive) {
                targetPos.set(0, 0, 4.5);
                const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
                const distance = camera.position.distanceTo(targetPos);
                const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
                const desiredHeight = visibleHeight * 0.48;
                const scaleFactor = hovered ? 1.1 : 1.0;
                targetScale.set(desiredHeight * scaleFactor, desiredHeight * scaleFactor, 1); 
                mesh.current.lookAt(camera.position);
            } else {
                targetPos.copy(homePos).multiplyScalar(1.5);
                targetScale.setScalar(0);
            }
        }

        mesh.current.position.lerp(targetPos, delta * 3);
        mesh.current.scale.lerp(targetScale, delta * 3);
        
        if (appState === AppState.SCATTERED) {
           mesh.current.rotation.z = Math.sin(t * 0.5 + index) * 0.1;
        } else if (isActive && appState === AppState.FOCUSED) {
           mesh.current.rotation.z = 0;
        }
    });

    const glowColor = useMemo(() => {
        return (hovered && isActive && appState === AppState.FOCUSED)
            ? new THREE.Color(1.5, 1.5, 1.5)
            : new THREE.Color(1, 1, 1);
    }, [hovered, isActive, appState]);

    return (
        <DreiImage 
            ref={mesh} 
            url={url} 
            transparent 
            opacity={1} 
            side={THREE.DoubleSide} 
            color={glowColor}
            toneMapped={false}
            onPointerOver={(e) => {
                if (isActive && appState === AppState.FOCUSED) {
                    e.stopPropagation();
                    setHover(true);
                    document.body.style.cursor = 'zoom-in';
                }
            }}
            onPointerOut={() => {
                setHover(false);
                document.body.style.cursor = 'auto';
            }}
        />
    );
};

const Experience: React.FC<ExperienceProps> = (props) => {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas shadows camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 5, 20]} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={15} castShadow shadow-mapSize={[2048, 2048]} color="#d4af37" />
        <pointLight position={[-10, -5, -10]} intensity={8} color="#b91c1c" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
             <ParticleSystem {...props} />
        </Float>
        
        <Environment preset="city" />
        
        <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
            <Noise opacity={0.02} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
        
        <OrbitControls enableZoom={false} enablePan={false} enabled={props.appState === AppState.SCATTERED} />
      </Canvas>
    </div>
  );
};

export default Experience;