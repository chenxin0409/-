
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureState } from '../types';
import { createParticleTexture } from '../utils/textures';

// --- Configuration ---
const CONFIG = {
  shardCount: 30000,    
  petalCount: 20000,    
  coreCount: 15000,     
  contourCount: 400,    
  debrisCount: 1500,    
  baseCount: 20000,     
  fireflyCount: 400,    
  roseStormCount: 6000, // Doubled count for massive storm
  shootingStarCount: 80,// More meteors
  colors: {
    shardInner: new THREE.Color(0xff0033),
    shardOuter: new THREE.Color(0xff2244),
    petalInner: new THREE.Color(0xcc0022), 
    petalOuter: new THREE.Color(0xff5577), 
    core: new THREE.Color(0xff0011),       
    contour: new THREE.Color(0xff99aa),
    blueBase: new THREE.Color(0x0066ff),
    firefly: new THREE.Color(0xeaff30),    
    whiteStream: new THREE.Color(0xffffff),
    meteor: new THREE.Color(0xe0ffff),     // Brighter Cyan-white
    flyingRose: new THREE.Color(0xff0033), 
  },
};

// --- Hook: Heart Geometry Generator ---
const useHeartGeometry = (count: number, colorInner: THREE.Color, colorOuter: THREE.Color, sizeBase: number, sizeVar: number, isCore: boolean = false) => {
  return useMemo(() => {
    const pos = [];
    const col = [];
    const siz = [];
    const basePos = [];
    const baseSiz = [];
    
    let attempts = 0;
    const maxAttempts = count * 5;
    let c = 0;

    while (c < count && attempts < maxAttempts) {
      attempts++;
      let t = Math.random() * Math.PI * 2;
      
      let r = isCore 
        ? Math.pow(Math.random(), 0.5) * 1.0  
        : Math.pow(Math.random(), 0.33) * 1.55; 

      let x = 16 * Math.pow(Math.sin(t), 3);
      let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      let z = (Math.random() - 0.5) * 8 * (1 - Math.abs(t - Math.PI) / Math.PI);
      
      if (isCore) {
          x *= 0.8; y *= 0.8; z *= 0.6; 
      }

      x *= r; y *= r; z *= r;

      pos.push(x, y, z);
      basePos.push(x, y, z);

      const dist = Math.sqrt(x*x + y*y + z*z);
      const mixRatio = Math.min(dist / 22, 1);
      const finalColor = colorInner.clone().lerp(colorOuter, mixRatio);
      
      col.push(finalColor.r, finalColor.g, finalColor.b);
      
      const s = sizeBase + Math.random() * sizeVar;
      siz.push(s);
      baseSiz.push(s);
      
      c++;
    }
    
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      sizes: new Float32Array(siz),
      baseSizes: new Float32Array(baseSiz),
      basePositions: new Float32Array(basePos)
    };
  }, [count, colorInner, colorOuter, sizeBase, sizeVar, isCore]);
};

// --- Component: Heart Layer ---
interface HeartLayerProps {
  gestureRef: React.MutableRefObject<GestureState>;
  type: 'shard' | 'petal' | 'spark';
  count: number;
  colorIn: THREE.Color;
  colorOut: THREE.Color;
  sizeBase: number;
  sizeVar: number;
  opacity: number;
  isCore?: boolean;
}

const HeartLayer: React.FC<HeartLayerProps> = ({ gestureRef, type, count, colorIn, colorOut, sizeBase, sizeVar, opacity, isCore = false }) => {
  const meshRef = useRef<THREE.Points>(null);
  const tex = useMemo(() => createParticleTexture(type), [type]);
  const { positions, colors, sizes, baseSizes, basePositions } = useHeartGeometry(count, colorIn, colorOut, sizeBase, sizeVar, isCore);
  
  const animState = useRef({ explode: 0, rotationY: 0, rotationX: 0, jumpScale: 1 });

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();
    const gesture = gestureRef.current;

    animState.current.rotationY += (gesture.rotationTargetY - animState.current.rotationY) * 0.05;
    animState.current.rotationX += (gesture.rotationTargetX - animState.current.rotationX) * 0.05;
    meshRef.current.rotation.y = animState.current.rotationY + time * 0.1;
    meshRef.current.rotation.x = animState.current.rotationX;

    const pArray = meshRef.current.geometry.attributes.position.array as Float32Array;
    
    // Beat & Jump Logic
    let beat = 0;
    let jumpTarget = 1.0;
    if (!gesture.isOpen) {
        beat = Math.pow(Math.sin(time * 6), 63) * 0.8;
        jumpTarget = 1.0 - (beat * 0.08); 
    } else {
        beat = Math.sin(time) * 0.05; 
        jumpTarget = 1.0;
    }
    animState.current.jumpScale += (jumpTarget - animState.current.jumpScale) * 0.2;
    meshRef.current.scale.setScalar(animState.current.jumpScale);

    // Expand Logic
    const targetExplode = gesture.isOpen ? 1.0 : 0; 
    animState.current.explode += (targetExplode - animState.current.explode) * 0.05;
    const spread = animState.current.explode * 5 * (type === 'petal' ? 2.0 : 1.0);

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const bx = basePositions[ix];
      const by = basePositions[ix + 1];
      const bz = basePositions[ix + 2];
      const dist = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const nx = bx / dist;
      const ny = by / dist;
      const nz = bz / dist;

      const noise = Math.sin(time * 1.5 + i) * 0.05;
      const turbulence = gesture.isOpen ? Math.sin(time + bx * 0.2) * 0.3 : 0;
      const beatOffset = beat * 2; 

      pArray[ix] = bx + nx * (beatOffset + spread) + noise + turbulence;
      pArray[ix + 1] = by + ny * (beatOffset + spread) + noise + turbulence;
      pArray[ix + 2] = bz + nz * (beatOffset + spread) + noise;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        vertexColors
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
        alphaTest={0.01}
      />
    </points>
  );
}

// --- Component: Rose Storm (Enhanced) ---
const RoseStorm = ({ gestureRef }: { gestureRef: React.MutableRefObject<GestureState> }) => {
    const meshRef = useRef<THREE.Points>(null);
    const tex = useMemo(() => createParticleTexture('petal'), []);
    
    // Massive count
    const count = CONFIG.roseStormCount;
    
    const { positions, initialAngles, radii, speeds, randomOffsets, sizes } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const ang = new Float32Array(count);
        const rad = new Float32Array(count);
        const spd = new Float32Array(count);
        const ro = new Float32Array(count);
        const sz = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Spawn deep in the back, widely distributed
            pos[i * 3] = (Math.random() - 0.5) * 100; 
            pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 2] = -250 - Math.random() * 200; 
            
            ang[i] = Math.random() * Math.PI * 2;
            rad[i] = 10 + Math.random() * 80; // Large spiral radius
            spd[i] = 1.5 + Math.random() * 3.0; // Varied speed for layering
            ro[i] = Math.random();
            
            // Varied sizes: Some big flowers, some small petals
            sz[i] = Math.random() > 0.8 ? 3.0 + Math.random() * 1.5 : 1.0 + Math.random();
        }
        return { positions: pos, initialAngles: ang, radii: rad, speeds: spd, randomOffsets: ro, sizes: sz };
    }, []);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const time = clock.getElapsedTime();
        const p = meshRef.current.geometry.attributes.position.array as Float32Array;
        const isActive = gestureRef.current.isFingerHeart; // Using ThumbsUp Trigger

        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            
            if (isActive) {
                // Move towards camera
                p[ix + 2] += speeds[i];

                const zPosition = p[ix + 2];
                
                // Enhanced Spiral Logic
                // Angle accelerates as it gets closer
                const angle = initialAngles[i] + time * (1 + speeds[i] * 0.2) + zPosition * 0.01;
                
                // Radius pulses with wind
                const windWobble = Math.sin(time * 3 + randomOffsets[i] * 10) * 8;
                const r = radii[i] + windWobble;

                p[ix] = Math.cos(angle) * r;
                p[ix + 1] = Math.sin(angle) * r;

                // Reset
                if (p[ix + 2] > 60) {
                    p[ix + 2] = -250 - Math.random() * 100;
                    initialAngles[i] = Math.random() * Math.PI * 2; // New angle
                }
            } else {
                // Retreat gently
                p[ix + 2] -= 0.5; 
                // Disperse
                p[ix] *= 1.02;
                p[ix+1] *= 1.02;
                
                if (p[ix + 2] < -400) p[ix + 2] = -400; 
            }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
            </bufferGeometry>
            <pointsMaterial
                map={tex}
                color={CONFIG.colors.flyingRose}
                transparent
                opacity={gestureRef.current.isFingerHeart ? 1.0 : 0.0}
                blending={THREE.NormalBlending}
                depthWrite={false}
                sizeAttenuation={true}
            />
        </points>
    );
};

// --- Component: Shooting Stars (Larger & Longer) ---
const ShootingStars = () => {
    const meshRef = useRef<THREE.Points>(null);
    const tex = useMemo(() => createParticleTexture('meteor'), []); 

    const { positions, velocities, offsets } = useMemo(() => {
        const count = CONFIG.shootingStarCount;
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count);
        const off = new Float32Array(count);

        for(let i=0; i<count; i++) {
            // Spawn area: Top Right mostly
            pos[i*3] = Math.random() * 300 - 50;  
            pos[i*3+1] = Math.random() * 200 + 50; 
            pos[i*3+2] = -150 - Math.random() * 150; 
            
            vel[i] = 4 + Math.random() * 5; // Fast
            off[i] = Math.random() * 1000;
        }
        return { positions: pos, velocities: vel, offsets: off };
    }, []);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const p = meshRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < CONFIG.shootingStarCount; i++) {
            const ix = i * 3;
            // Move diagonally Down-Left
            p[ix] -= velocities[i] * 1.5; 
            p[ix + 1] -= velocities[i];

            // Reset loop
            if (p[ix + 1] < -150 || p[ix] < -300) {
                // Respawn Top Right
                p[ix] = 100 + Math.random() * 250;
                p[ix + 1] = 100 + Math.random() * 200;
                p[ix + 2] = -150 - Math.random() * 150;
                velocities[i] = 4 + Math.random() * 5;
            }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                map={tex}
                color={CONFIG.colors.meteor}
                size={25.0} // Significantly larger size to show the long tail texture
                transparent
                opacity={0.9} // Brighter
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation={true} 
            />
        </points>
    );
};

// --- Component: Fireflies (Optimized) ---
const FireflyParticles = () => {
  const meshRef = useRef<THREE.Points>(null);
  const tex = useMemo(() => createParticleTexture('glow'), []);
  
  const { positions, sizes, speeds, offsets } = useMemo(() => {
    const pos = [];
    const siz = [];
    const spd = [];
    const off = [];

    for (let i = 0; i < CONFIG.fireflyCount; i++) {
      pos.push((Math.random() - 0.5) * 180, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80);
      siz.push(1.0);
      spd.push(Math.random() * 0.1 + 0.05);
      off.push(Math.random() * 100);
    }
    
    return {
      positions: new Float32Array(pos),
      sizes: new Float32Array(siz),
      speeds: new Float32Array(spd),
      offsets: new Float32Array(off)
    };
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();
    const p = meshRef.current.geometry.attributes.position.array as Float32Array;
    const s = meshRef.current.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < CONFIG.fireflyCount; i++) {
      const ix = i * 3;
      p[ix + 2] += speeds[i]; 
      
      p[ix] += Math.cos(time * 0.5 + offsets[i]) * 0.05;
      p[ix + 1] += Math.sin(time * 0.5 + offsets[i]) * 0.05;

      if (p[ix + 2] > 60) {
        p[ix + 2] = -80;
        p[ix] = (Math.random() - 0.5) * 180;
        p[ix + 1] = (Math.random() - 0.5) * 120;
      }

      const blink = Math.sin(time * 2 + offsets[i]) * 0.3 + 0.7; 
      s[i] = (2.0 * blink); 
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial 
        map={tex} 
        color={CONFIG.colors.firefly} 
        transparent 
        opacity={0.9} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
        sizeAttenuation={true} 
      />
    </points>
  );
};

const HeartMixedSystem = ({ gestureRef }: { gestureRef: React.MutableRefObject<GestureState> }) => {
  return (
    <>
      <HeartLayer 
        gestureRef={gestureRef}
        type="spark"
        count={CONFIG.coreCount}
        colorIn={CONFIG.colors.core}
        colorOut={CONFIG.colors.shardInner}
        sizeBase={0.15}
        sizeVar={0.1}
        opacity={0.95}
        isCore={true}
      />
      <HeartLayer 
        gestureRef={gestureRef}
        type="shard"
        count={CONFIG.shardCount}
        colorIn={CONFIG.colors.shardInner}
        colorOut={CONFIG.colors.shardOuter}
        sizeBase={0.15}
        sizeVar={0.15}
        opacity={0.8}
      />
      <HeartLayer 
        gestureRef={gestureRef}
        type="petal"
        count={CONFIG.petalCount}
        colorIn={CONFIG.colors.petalInner}
        colorOut={CONFIG.colors.petalOuter}
        sizeBase={0.35}
        sizeVar={0.25}
        opacity={0.7}
      />
    </>
  )
}

const StreamRain = () => {
    const meshRef = useRef<THREE.Points>(null);
    const tex = useMemo(() => createParticleTexture('shard'), []);
    const { positions, velocities } = useMemo(() => {
        const count = CONFIG.debrisCount;
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count);
        for(let i=0; i<count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 80; 
            pos[i*3+1] = -10 - Math.random() * 80; 
            pos[i*3+2] = (Math.random() - 0.5) * 50; 
            vel[i] = 0.1 + Math.random() * 0.2; 
        }
        return { positions: pos, velocities: vel };
    }, []);
    useFrame(() => {
        if (!meshRef.current) return;
        const p = meshRef.current.geometry.attributes.position.array as Float32Array;
        for(let i=0; i<CONFIG.debrisCount; i++) {
            const ix = i*3;
            p[ix+1] -= velocities[i];
            if(p[ix+1] < -80) {
                p[ix+1] = -10; 
                p[ix] = (Math.random() - 0.5) * 80; 
            }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });
    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={positions.length/3} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial color={CONFIG.colors.whiteStream} map={tex} size={0.2} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    )
};

const FadePlane = () => {
    const mesh = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    useFrame(() => {
        if (mesh.current) {
            mesh.current.quaternion.copy(camera.quaternion);
            mesh.current.position.copy(camera.position);
            mesh.current.translateZ(-10);
        }
    });
    return (
        <mesh ref={mesh}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial color="black" transparent opacity={0.15} depthTest={false} depthWrite={false} />
        </mesh>
    )
}

export const HologramScene: React.FC<{ gestureRef: React.MutableRefObject<GestureState> }> = ({ gestureRef }) => {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 90], fov: 60 }}
        onCreated={({ gl }) => { gl.autoClear = false; gl.setClearColor('#000000'); }}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 0.01]} />
        <FadePlane />
        <HeartMixedSystem gestureRef={gestureRef} />
        <ShootingStars />
        <RoseStorm gestureRef={gestureRef} />
        <StreamRain />
        <FireflyParticles />
      </Canvas>
    </div>
  );
};
