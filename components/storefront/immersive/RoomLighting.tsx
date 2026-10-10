"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
// Small generated indoor reflection map; no HDR download or per-frame capture.
export function RoomLighting() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl),
      room = new RoomEnvironment();
    const map = generator.fromScene(room, 0.04, 0.1, 100);
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = map.texture;
    scene.environmentIntensity = 0.35;
    generator.dispose();
    room.dispose();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      map.dispose();
    };
  }, [gl, scene]);
  return null;
}
