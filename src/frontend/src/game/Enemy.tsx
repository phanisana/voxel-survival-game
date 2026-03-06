import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "./store";
import type { EnemyState } from "./store";
import { getTerrainHeightAt } from "./worldGen";

interface EnemyProps {
  enemy: EnemyState;
}

const DETECTION_RADIUS = 12;
const CHASE_SPEED_NORMAL = 2;
const CHASE_SPEED_BOSS = 3.5;
const PATROL_SPEED = 1;
const ATTACK_RANGE = 1.5;
const NORMAL_ATTACK_DAMAGE = 25;
const BOSS_ATTACK_DAMAGE = 60;
const ATTACK_COOLDOWN = 1500; // ms

export default function Enemy({ enemy }: EnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const patrolTarget = useRef<THREE.Vector3>(
    new THREE.Vector3(
      enemy.pos[0] + (Math.random() - 0.5) * 10,
      enemy.pos[1],
      enemy.pos[2] + (Math.random() - 0.5) * 10,
    ),
  );
  const patrolTimer = useRef(Math.random() * 2 + 1);
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3(...enemy.pos));
  const lastAttack = useRef(0);

  const playerPos = useGameStore((s) => s.playerPos);
  const takeDamage = useGameStore((s) => s.takeDamage);
  const updateEnemy = useGameStore((s) => s.updateEnemy);

  const scale = enemy.isBoss ? 1.5 : 1;
  const color = enemy.isBoss ? "#7B2D8B" : "#CC2222";

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.1);

    const pPos = new THREE.Vector3(...playerPos);
    const ePos = currentPos.current;
    const distToPlayer = ePos.distanceTo(pPos);

    let newState = enemy.state;

    // State machine
    if (distToPlayer <= ATTACK_RANGE) {
      newState = "attack";
    } else if (distToPlayer <= DETECTION_RADIUS || enemy.isBoss) {
      newState = "chase";
    } else {
      newState = "patrol";
    }

    const speed = enemy.isBoss ? CHASE_SPEED_BOSS : CHASE_SPEED_NORMAL;

    if (newState === "attack") {
      // Attack player
      const now = performance.now();
      if (now - lastAttack.current >= ATTACK_COOLDOWN) {
        lastAttack.current = now;
        const dmg = enemy.isBoss ? BOSS_ATTACK_DAMAGE : NORMAL_ATTACK_DAMAGE;
        takeDamage(dmg);
      }
    } else if (newState === "chase") {
      // Move toward player
      const dir = pPos.clone().sub(ePos).normalize();
      dir.y = 0;
      ePos.addScaledVector(dir, speed * dt);
    } else {
      // Patrol
      patrolTimer.current -= dt;
      if (patrolTimer.current <= 0) {
        const spawnX = enemy.pos[0];
        const spawnZ = enemy.pos[2];
        patrolTarget.current.set(
          spawnX + (Math.random() - 0.5) * 16,
          0,
          spawnZ + (Math.random() - 0.5) * 16,
        );
        patrolTimer.current = Math.random() * 2 + 1.5;
      }

      const target = patrolTarget.current;
      const dir = target.clone().sub(ePos);
      dir.y = 0;
      const distToTarget = dir.length();
      if (distToTarget > 0.5) {
        dir.normalize();
        ePos.addScaledVector(dir, PATROL_SPEED * dt);
      }
    }

    // Gravity / terrain snap
    const groundH = getTerrainHeightAt(Math.round(ePos.x), Math.round(ePos.z));
    ePos.y = groundH + (enemy.isBoss ? 1.2 : 0.8);

    // Apply position to mesh
    meshRef.current.position.copy(ePos);

    // Update store position (not every frame to save perf - every 10 frames)
    if (Math.random() < 0.1) {
      updateEnemy(enemy.id, {
        pos: [ePos.x, ePos.y, ePos.z],
        state: newState,
      });
    }
  });

  const hpPercent = enemy.hp / enemy.maxHp;
  const hpColor =
    hpPercent > 0.5 ? "#44BB44" : hpPercent > 0.25 ? "#FFAA00" : "#FF3333";

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[...enemy.pos]}
        scale={[scale, scale, scale]}
      >
        <boxGeometry args={[0.8, 1.6, 0.8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={enemy.isBoss ? 0.4 : 0.1}
          emissive={enemy.isBoss ? "#3A0A5A" : "#440000"}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* HP Bar */}
      <Html
        position={[
          enemy.pos[0],
          enemy.pos[1] + (enemy.isBoss ? 2.5 : 1.8),
          enemy.pos[2],
        ]}
        center
        occlude={false}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            width: enemy.isBoss ? 80 : 50,
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 3,
            padding: "2px",
            transform: "translateY(-50%)",
          }}
        >
          <div
            style={{
              height: 5,
              width: `${Math.max(0, hpPercent * 100)}%`,
              background: hpColor,
              borderRadius: 2,
              transition: "width 0.1s",
            }}
          />
          {enemy.isBoss && (
            <div
              style={{
                color: "#FF88FF",
                fontSize: 9,
                textAlign: "center",
                fontFamily: "monospace",
                fontWeight: "bold",
                marginTop: 1,
              }}
            >
              BOSS {enemy.hp}/{enemy.maxHp}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
