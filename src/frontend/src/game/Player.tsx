import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { WEAPON_DAMAGE, useGameStore } from "./store";
import { getTerrainHeightAt } from "./worldGen";

interface PlayerProps {
  attackRef: React.MutableRefObject<boolean>;
  jumpRef: React.MutableRefObject<boolean>;
}

const PLAYER_SPEED = 5;
const GRAVITY = -18;
const JUMP_VELOCITY = 9;
const ATTACK_RANGE = 2.5;
const ATTACK_COOLDOWN = 600;

export default function Player({ attackRef, jumpRef }: PlayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocityY = useRef(0);
  const onGround = useRef(false);
  const lastAttackTime = useRef(0);

  const joystick = useGameStore((s) => s.joystick);
  const setPlayerPos = useGameStore((s) => s.setPlayerPos);
  const weaponTier = useGameStore((s) => s.weaponTier);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const enemies = useGameStore((s) => s.enemies);
  const setEnemyHP = useGameStore((s) => s.setEnemyHP);
  const killEnemy = useGameStore((s) => s.killEnemy);

  const { camera } = useThree();

  // Camera setup
  useEffect(() => {
    camera.near = 0.1;
    camera.far = 200;
    (camera as THREE.PerspectiveCamera).fov = 75;
    camera.updateProjectionMatrix();
  }, [camera]);

  const pos = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 0));
  const prevJump = useRef(false);

  useFrame((_, delta) => {
    if (gamePhase !== "playing") return;
    if (!meshRef.current) return;

    const dt = Math.min(delta, 0.1);

    // Movement from joystick
    const jx = joystick.x;
    const jz = joystick.y; // forward/back is Z axis

    if (jx !== 0 || jz !== 0) {
      // Move relative to camera direction (horizontal only)
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

      pos.current.x += (camDir.x * -jz + right.x * jx) * PLAYER_SPEED * dt;
      pos.current.z += (camDir.z * -jz + right.z * jx) * PLAYER_SPEED * dt;
    }

    // Jump
    const jumpPressed = jumpRef.current;
    if (jumpPressed && !prevJump.current && onGround.current) {
      velocityY.current = JUMP_VELOCITY;
      onGround.current = false;
    }
    prevJump.current = jumpPressed;

    // Gravity
    velocityY.current += GRAVITY * dt;
    pos.current.y += velocityY.current * dt;

    // Terrain collision
    const groundH = getTerrainHeightAt(
      Math.round(pos.current.x),
      Math.round(pos.current.z),
    );
    const playerGroundY = groundH + 0.9; // half player height (1.8 / 2)

    if (pos.current.y <= playerGroundY) {
      pos.current.y = playerGroundY;
      velocityY.current = 0;
      onGround.current = true;
    } else {
      onGround.current = false;
    }

    // Clamp position
    pos.current.x = Math.max(-150, Math.min(150, pos.current.x));
    pos.current.z = Math.max(-150, Math.min(150, pos.current.z));

    // Update mesh position
    meshRef.current.position.copy(pos.current);

    // Update store
    setPlayerPos([pos.current.x, pos.current.y, pos.current.z]);

    // Third-person camera: follow from behind/above
    const camOffset = new THREE.Vector3(0, 8, 12);
    const targetCamPos = pos.current.clone().add(camOffset);
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(pos.current.x, pos.current.y + 1, pos.current.z);

    // Attack
    if (attackRef.current) {
      const now = performance.now();
      if (now - lastAttackTime.current >= ATTACK_COOLDOWN) {
        lastAttackTime.current = now;

        const damage = WEAPON_DAMAGE[weaponTier];
        let closestEnemy: (typeof enemies)[number] | null = null;
        let closestDist = ATTACK_RANGE;

        for (const enemy of enemies) {
          const dx = enemy.pos[0] - pos.current.x;
          const dy = enemy.pos[1] - pos.current.y;
          const dz = enemy.pos[2] - pos.current.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < closestDist) {
            closestDist = dist;
            closestEnemy = enemy;
          }
        }

        if (closestEnemy !== null) {
          const newHP = closestEnemy.hp - damage;
          if (newHP <= 0) {
            killEnemy(closestEnemy.id);
          } else {
            setEnemyHP(closestEnemy.id, newHP);
          }
        }
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 5, 0]}>
      <boxGeometry args={[0.8, 1.8, 0.8]} />
      <meshStandardMaterial color="#FF6B35" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}
