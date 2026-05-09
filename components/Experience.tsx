"use client";

import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';

// --- 3D COMPONENTS ---
const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function BeeHero() {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const { mouse, clock } = state;
    if (groupRef.current) {
      // Smoothly tilt and follow mouse with 'lerp' for an expensive feel
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * 0.4, 0.1);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -mouse.y * 0.4, 0.1);
      // Cinematic floating hover
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 1.5) * 0.3;
    }
    if (leftWingRef.current && rightWingRef.current) {
      // Realistic high-speed wing flapping
      const flap = Math.sin(clock.elapsedTime * 25) * 0.6;
      leftWingRef.current.rotation.z = flap;
      rightWingRef.current.rotation.z = -flap;
    }
  });

  return (
    <group ref={groupRef} scale={1.8}>
      {/* Bee Body */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
          color="#FFD700" 
          metalness={0.8} 
          roughness={0.1} 
          emissive="#FFAA00" 
          emissiveIntensity={0.5} 
        />
      </mesh>
      
      {/* Wings */}
      <mesh ref={leftWingRef} position={[-0.25, 0.15, 0]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={rightWingRef} position={[0.25, 0.15, 0]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <Sparkles count={40} scale={2} size={2} speed={0.4} color="#FFD700" />
    </group>
  );
}

function FloatingCoins() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Defined as explicit tuple [number, number, number] to fix the Type Error
  const coins = useMemo(() => Array.from({ length: 12 }).map((_, index) => ({
    pos: [
      (seededRandom(index + 1) - 0.5) * 12,
      (seededRandom(index + 31) - 0.5) * 6,
      seededRandom(index + 61) - 5,
    ] as [number, number, number],
    speed: 0.5 + seededRandom(index + 91),
  })), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        child.position.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
        child.rotation.y += 0.01 * (coins[i]?.speed || 1);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {coins.map((coin, i) => (
        <mesh key={i} position={coin.pos}>
          <cylinderGeometry args={[0.15, 0.15, 0.04, 24]} />
          <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// --- MAIN PAGE ---

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#050505] text-white overflow-hidden">
      
      {/* 3D CANVAS LAYER */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ fov: 45, position: [0, 0, 10] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#FFD700" />
          <Environment preset="city" />
          
          <Suspense fallback={null}>
            <BeeHero />
            <FloatingCoins />
            <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={15} blur={2.5} />
          </Suspense>
        </Canvas>
      </div>

      {/* OVERLAY CONTENT */}
      <div className="relative z-10">
        <nav className="flex justify-between items-center p-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 text-black px-3 py-1 rounded-lg font-black italic text-xl">TB</div>
            <span className="text-2xl font-black tracking-tighter uppercase">Tax<span className="text-yellow-400">Bee</span></span>
          </div>
          <div className="flex gap-8 items-center font-bold text-sm text-gray-400 uppercase tracking-widest">
            <Link href="#" className="hover:text-yellow-400 transition-colors">Process</Link>
            <Link href="#" className="hover:text-yellow-400 transition-colors">Pricing</Link>
            <button className="bg-yellow-400 text-black px-6 py-2 rounded-full hover:scale-105 transition-all">Start Filing</button>
          </div>
        </nav>

        <section className="h-[75vh] flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none mix-blend-difference">
            WEALTH <br /> <span className="text-yellow-400 italic">AUTOMATION</span>
          </h1>
          <p className="mt-8 text-gray-400 max-w-xl text-lg">
            No manual entry. No stress. <br /> Precision tax filing powered by autonomous AI.
          </p>
        </section>

        {/* Dashboard Stats */}
        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 px-6 pb-20">
          <StatBox label="Efficiency" value="99.8%" detail="AI Accuracy" />
          <StatBox label="Income" value="₹12.4L" detail="Extracted" />
          <StatBox label="Deductions" value="₹2.1L" detail="Optimized" />
          <StatBox label="Time" value="< 2m" detail="Avg. Filing" />
        </section>
      </div>
      
      {/* Cinematic Film Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </main>
  );
}

function StatBox({ label, value, detail }: { label: string, value: string, detail: string }) {
  return (
    <div className="backdrop-blur-2xl bg-white/5 border border-white/10 p-8 rounded-[32px] hover:bg-white/10 transition-all group">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-black my-2 group-hover:text-yellow-400 transition-colors">{value}</p>
      <p className="text-sm text-gray-400">{detail}</p>
    </div>
  );
}
