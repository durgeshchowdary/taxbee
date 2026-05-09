"use client";

import { Canvas } from "@react-three/fiber";

export default function Home() {
  console.log("React version check:", typeof React);
  
  return (
    <div style={{ width: "100%", height: "100vh", background: "#0f172a" }}>
      <h1 style={{ color: "white", textAlign: "center", paddingTop: "20px" }}>TaxBee - Testing 3D</h1>
      <div style={{ width: "100%", height: "80vh" }}>
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#FBBF24" />
          </mesh>
        </Canvas>
      </div>
    </div>
  );
}
