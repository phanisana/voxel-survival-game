import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useActor } from "../hooks/useActor";
import EnemyManager from "./EnemyManager";
import HUD from "./HUD";
import Leaderboard from "./Leaderboard";
import Player from "./Player";
import VirtualJoystick from "./VirtualJoystick";
import VoxelWorld from "./VoxelWorld";
import { useGameStore } from "./store";
import { clearChunkCache } from "./worldGen";

export default function Game() {
  const attackRef = useRef(false);
  const jumpRef = useRef(false);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { actor } = useActor();
  const gamePhase = useGameStore((s) => s.gamePhase);
  const kills = useGameStore((s) => s.kills);
  const survivalTime = useGameStore((s) => s.survivalTime);
  const tickSurvivalTime = useGameStore((s) => s.tickSurvivalTime);
  const spawnBoss = useGameStore((s) => s.spawnBoss);
  const bossActive = useGameStore((s) => s.bossActive);

  // Clear world cache on game start
  const prevPhase = useRef(gamePhase);
  useEffect(() => {
    if (gamePhase === "playing" && prevPhase.current !== "playing") {
      clearChunkCache();
    }
    prevPhase.current = gamePhase;
  }, [gamePhase]);

  // Survival timer (ticks every second)
  useEffect(() => {
    if (gamePhase !== "playing") return;

    const interval = setInterval(() => {
      tickSurvivalTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [gamePhase, tickSurvivalTime]);

  // Boss spawn trigger on time milestone (check every second)
  useEffect(() => {
    if (gamePhase !== "playing") return;
    if (!bossActive && survivalTime > 0 && survivalTime % 180 === 0) {
      spawnBoss();
    }
  }, [survivalTime, gamePhase, bossActive, spawnBoss]);

  // Save score to backend on death
  const handleSaveScore = useCallback(async () => {
    if (!actor) return;
    try {
      await actor.saveScore(BigInt(kills), BigInt(survivalTime));
    } catch (err) {
      console.warn("Failed to save score:", err);
    }
  }, [actor, kills, survivalTime]);

  const handleShowLeaderboard = useCallback(() => {
    setShowLeaderboard(true);
  }, []);

  const handleCloseLeaderboard = useCallback(() => {
    setShowLeaderboard(false);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0e1a",
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        dpr={[1, 1.5]}
        camera={{
          fov: 75,
          near: 0.1,
          far: 200,
          position: [0, 13, 12],
        }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.2}
          castShadow={false}
        />
        <hemisphereLight args={["#87CEEB", "#4a7c40", 0.4]} />

        {/* Sky & Fog */}
        <fog attach="fog" args={["#87CEEB", 40, 120]} />
        <color attach="background" args={["#87CEEB"]} />

        {/* Game objects */}
        {gamePhase === "playing" && (
          <>
            <VoxelWorld />
            <Player attackRef={attackRef} jumpRef={jumpRef} />
            <EnemyManager />
          </>
        )}

        {/* Static world for menu */}
        {gamePhase === "menu" && <VoxelWorld />}
      </Canvas>

      {/* HUD Overlay */}
      <HUD
        attackRef={attackRef}
        jumpRef={jumpRef}
        onSaveScore={handleSaveScore}
        onShowLeaderboard={handleShowLeaderboard}
      />

      {/* Virtual Joystick - only during gameplay */}
      {gamePhase === "playing" && <VirtualJoystick />}

      {/* Leaderboard overlay */}
      {showLeaderboard && <Leaderboard onClose={handleCloseLeaderboard} />}
    </div>
  );
}
