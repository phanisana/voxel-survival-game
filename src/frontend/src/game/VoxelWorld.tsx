import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlockType } from "./store";
import { useGameStore } from "./store";
import {
  CHUNK_SIZE,
  addBlockToCache,
  generateChunk,
  getChunkCoords,
  getTerrainHeightAt,
  removeBlockFromCache,
} from "./worldGen";
import type { BlockData } from "./worldGen";

// Block colors
const BLOCK_COLORS: Record<BlockType, string> = {
  grass: "#4a7c40",
  dirt: "#8B5E3C",
  stone: "#888888",
  wood: "#8B4513",
  leaves: "#2D7A2D",
  sand: "#C2A04C",
  empty: "#000000",
};

const BLOCK_TYPES: BlockType[] = [
  "grass",
  "dirt",
  "stone",
  "wood",
  "leaves",
  "sand",
];
const MAX_INSTANCES_PER_TYPE = 3000;
const CHUNK_RADIUS = 2; // Render 2 chunks in each direction (5x5 = 25 chunks)

interface InstancedMeshRefs {
  [key: string]: THREE.InstancedMesh | null;
}

interface VoxelWorldProps {
  worldRef?: React.MutableRefObject<{
    getHeightAt: (x: number, z: number) => number;
    removeBlock: (x: number, y: number, z: number, type: BlockType) => void;
    addBlock: (x: number, y: number, z: number, type: BlockType) => void;
  } | null>;
}

export default function VoxelWorld({ worldRef }: VoxelWorldProps) {
  const meshRefs = useRef<InstancedMeshRefs>({});
  const currentChunks = useRef<Set<string>>(new Set());
  const blocksByType = useRef<Map<BlockType, BlockData[]>>(new Map());
  const dummy = useRef(new THREE.Object3D());
  const lastPlayerChunk = useRef({ cx: 9999, cz: 9999 });
  const needsUpdate = useRef(false);

  const { buildMode, selectedBuildBlock } = useGameStore((s) => ({
    buildMode: s.buildMode,
    selectedBuildBlock: s.selectedBuildBlock,
  }));
  const harvestBlock = useGameStore((s) => s.harvestBlock);
  const placeBlock = useGameStore((s) => s.placeBlock);
  const inventory = useGameStore((s) => s.inventory);
  const playerPos = useGameStore((s) => s.playerPos);

  // Expose world API
  useEffect(() => {
    if (worldRef) {
      worldRef.current = {
        getHeightAt: (x: number, z: number) =>
          getTerrainHeightAt(Math.round(x), Math.round(z)),
        removeBlock: (x: number, y: number, z: number, type: BlockType) => {
          removeBlockFromCache(x, y, z);
          harvestBlock(type);
          needsUpdate.current = true;
        },
        addBlock: (x: number, y: number, z: number, type: BlockType) => {
          addBlockToCache(x, y, z, type);
          needsUpdate.current = true;
        },
      };
    }
  }, [worldRef, harvestBlock]);

  const collectBlocksAroundPlayer = useCallback((px: number, pz: number) => {
    const { cx, cz } = getChunkCoords(px, pz);

    const newChunkKeys = new Set<string>();
    const allBlocks: Map<BlockType, BlockData[]> = new Map();

    for (const type of BLOCK_TYPES) {
      allBlocks.set(type, []);
    }

    for (let dcx = -CHUNK_RADIUS; dcx <= CHUNK_RADIUS; dcx++) {
      for (let dcz = -CHUNK_RADIUS; dcz <= CHUNK_RADIUS; dcz++) {
        const chunkX = cx + dcx;
        const chunkZ = cz + dcz;
        const key = `${chunkX}_${chunkZ}`;
        newChunkKeys.add(key);

        const chunk = generateChunk(chunkX, chunkZ);
        for (const block of chunk.blocks) {
          if (block.type !== "empty") {
            const arr = allBlocks.get(block.type);
            if (arr) arr.push(block);
          }
        }
      }
    }

    currentChunks.current = newChunkKeys;
    blocksByType.current = allBlocks;
  }, []);

  const updateInstances = useCallback(() => {
    const d = dummy.current;

    for (const type of BLOCK_TYPES) {
      const mesh = meshRefs.current[type];
      if (!mesh) continue;

      const blocks = blocksByType.current.get(type) || [];
      const count = Math.min(blocks.length, MAX_INSTANCES_PER_TYPE);

      for (let i = 0; i < count; i++) {
        const b = blocks[i];
        d.position.set(b.x, b.y, b.z);
        d.scale.setScalar(1);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }

      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, []);

  // Initial generation and chunk tracking
  useFrame(() => {
    const px = playerPos[0];
    const pz = playerPos[2];
    const { cx, cz } = getChunkCoords(px, pz);

    if (
      cx !== lastPlayerChunk.current.cx ||
      cz !== lastPlayerChunk.current.cz ||
      needsUpdate.current
    ) {
      lastPlayerChunk.current = { cx, cz };
      needsUpdate.current = false;
      collectBlocksAroundPlayer(px, pz);
      updateInstances();
    }
  });

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <group>
      {BLOCK_TYPES.map((type) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh interaction doesn't support keyboard events
        <instancedMesh
          key={type}
          ref={(ref) => {
            meshRefs.current[type] = ref;
          }}
          args={[geometry, undefined, MAX_INSTANCES_PER_TYPE]}
          castShadow={false}
          receiveShadow={false}
          onClick={(e) => {
            e.stopPropagation();
            const instanceId = e.instanceId;
            if (instanceId === undefined) return;

            const blocks = blocksByType.current.get(type) || [];
            const block = blocks[instanceId];
            if (!block) return;

            if (!buildMode) {
              // Harvest mode
              removeBlockFromCache(block.x, block.y, block.z);
              harvestBlock(type);
              collectBlocksAroundPlayer(playerPos[0], playerPos[2]);
              updateInstances();
            }
          }}
        >
          <meshStandardMaterial color={BLOCK_COLORS[type]} />
        </instancedMesh>
      ))}

      {/* Ground plane for placing blocks in build mode */}
      {buildMode && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh interaction doesn't support keyboard events
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.5, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (!buildMode) return;
            if ((inventory[selectedBuildBlock] || 0) <= 0) return;

            const point = e.point;
            const bx = Math.round(point.x);
            const by = Math.round(point.y + 0.5);
            const bz = Math.round(point.z);

            addBlockToCache(bx, by, bz, selectedBuildBlock);
            placeBlock(selectedBuildBlock);
            collectBlocksAroundPlayer(playerPos[0], playerPos[2]);
            updateInstances();
          }}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}
