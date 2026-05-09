"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBeeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Light
    const light = new THREE.PointLight(0xfacc15, 2);
    light.position.set(2, 2, 5);
    scene.add(light);

    // Bee body (simple sphere)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.6,
      roughness: 0.2,
    });

    const bee = new THREE.Mesh(geometry, material);
    scene.add(bee);

    // Coins (torus)
    const coinGeometry = new THREE.TorusGeometry(0.4, 0.1, 16, 100);
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.8,
      roughness: 0.1,
    });

    const coins: THREE.Mesh[] = [];

    for (let i = 0; i < 5; i++) {
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(
        Math.random() * 4 - 2,
        Math.random() * 4 - 2,
        Math.random() * 2 - 1
      );
      scene.add(coin);
      coins.push(coin);
    }

    // Mouse parallax
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Animation
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Bee motion
      bee.rotation.y += 0.01;
      bee.position.y = Math.sin(Date.now() * 0.002) * 0.5;

      // Coins rotation
      coins.forEach((coin, i) => {
        coin.rotation.x += 0.01;
        coin.rotation.y += 0.02;
        coin.position.y += Math.sin(Date.now() * 0.002 + i) * 0.002;
      });

      // Camera parallax
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
    />
  );
}