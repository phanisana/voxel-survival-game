import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import Enemy from "./Enemy";
import { useGameStore } from "./store";
import type { EnemyState } from "./store";

const MAX_ENEMIES = 8;
const SPAWN_INTERVAL = 8; // seconds
const MIN_SPAWN_DIST = 15;
const MAX_SPAWN_DIST = 25;

let idCounter = 0;
function generateId(): string {
  return `enemy_${++idCounter}_${Date.now()}`;
}

export default function EnemyManager() {
  const spawnTimer = useRef(0);
  const bossSpawned = useRef(false);

  const enemies = useGameStore((s) => s.enemies);
  const playerPos = useGameStore((s) => s.playerPos);
  const bossActive = useGameStore((s) => s.bossActive);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const addEnemy = useGameStore((s) => s.addEnemy);
  const spawnBoss = useGameStore((s) => s.spawnBoss);

  // Reset boss spawned tracker when boss is defeated
  useEffect(() => {
    if (!bossActive) {
      bossSpawned.current = false;
    }
  }, [bossActive]);

  // Spawn boss when bossActive becomes true and boss not in enemies
  useEffect(() => {
    if (bossActive && !bossSpawned.current) {
      const hasBoss = enemies.some((e) => e.id === "boss");
      if (!hasBoss) {
        bossSpawned.current = true;
        spawnBoss();
      }
    }
  }, [bossActive, enemies, spawnBoss]);

  useFrame((_, delta) => {
    if (gamePhase !== "playing") return;

    const dt = Math.min(delta, 0.1);
    spawnTimer.current += dt;

    if (spawnTimer.current >= SPAWN_INTERVAL) {
      spawnTimer.current = 0;

      // Count non-boss enemies
      const regularCount = enemies.filter((e) => !e.isBoss).length;

      if (regularCount < MAX_ENEMIES) {
        // Spawn a new enemy at random position around player
        const angle = Math.random() * Math.PI * 2;
        const dist =
          MIN_SPAWN_DIST + Math.random() * (MAX_SPAWN_DIST - MIN_SPAWN_DIST);

        const spawnX = playerPos[0] + Math.cos(angle) * dist;
        const spawnZ = playerPos[2] + Math.sin(angle) * dist;

        const newEnemy: EnemyState = {
          id: generateId(),
          pos: [spawnX, playerPos[1], spawnZ],
          hp: 500,
          maxHp: 500,
          isBoss: false,
          state: "patrol",
          lastAttackTime: 0,
        };

        addEnemy(newEnemy);
      }
    }
  });

  return (
    <>
      {enemies.map((enemy) => (
        <Enemy key={enemy.id} enemy={enemy} />
      ))}
    </>
  );
}
