import type { BlockType } from "./store";

export const CHUNK_SIZE = 16;
export const MAX_HEIGHT = 8;

export interface BlockData {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export interface ChunkData {
  blocks: BlockData[];
  key: string;
}

// Simple deterministic hash function (no external noise lib)
function hash(n: number): number {
  let x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

function hash2d(x: number, z: number): number {
  return hash(x * 127.1 + z * 311.7);
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  // Smoothstep
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const v00 = hash2d(ix, iz);
  const v10 = hash2d(ix + 1, iz);
  const v01 = hash2d(ix, iz + 1);
  const v11 = hash2d(ix + 1, iz + 1);

  return (
    v00 * (1 - ux) * (1 - uz) +
    v10 * ux * (1 - uz) +
    v01 * (1 - ux) * uz +
    v11 * ux * uz
  );
}

function getTerrainHeight(wx: number, wz: number): number {
  // Multi-octave noise for interesting terrain
  const scale1 = 0.08;
  const scale2 = 0.2;
  const scale3 = 0.5;

  const n1 = smoothNoise(wx * scale1, wz * scale1);
  const n2 = smoothNoise(wx * scale2, wz * scale2) * 0.5;
  const n3 = smoothNoise(wx * scale3, wz * scale3) * 0.25;

  const combined = (n1 + n2 + n3) / 1.75;
  // Map to 1-MAX_HEIGHT range
  return Math.max(1, Math.floor(combined * MAX_HEIGHT));
}

// Height map cache for terrain queries
const heightMapCache = new Map<string, number>();

export function getTerrainHeightAt(wx: number, wz: number): number {
  const key = `${Math.round(wx)}_${Math.round(wz)}`;
  if (heightMapCache.has(key)) {
    return heightMapCache.get(key)!;
  }
  const h = getTerrainHeight(wx, wz);
  heightMapCache.set(key, h);
  return h;
}

// Check if a tree should spawn at this world position
function shouldSpawnTree(wx: number, wz: number): boolean {
  const v = hash2d(wx * 7.3 + 13.7, wz * 9.1 + 5.3);
  return v > 0.88;
}

// Chunk cache
const chunkCache = new Map<string, ChunkData>();

export function generateChunk(cx: number, cz: number): ChunkData {
  const key = `${cx}_${cz}`;
  if (chunkCache.has(key)) {
    return chunkCache.get(key)!;
  }

  const blocks: BlockData[] = [];
  const startX = cx * CHUNK_SIZE;
  const startZ = cz * CHUNK_SIZE;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = startX + lx;
      const wz = startZ + lz;
      const terrainH = getTerrainHeight(wx, wz);

      // Cache height for player collision
      const hKey = `${wx}_${wz}`;
      if (!heightMapCache.has(hKey)) {
        heightMapCache.set(hKey, terrainH);
      }

      for (let y = 0; y <= terrainH; y++) {
        let blockType: BlockType;

        if (y === terrainH) {
          // Surface layer
          if (terrainH <= 1) {
            blockType = "sand";
          } else {
            blockType = "grass";
          }
        } else if (y >= terrainH - 2) {
          blockType = "dirt";
        } else {
          blockType = "stone";
        }

        blocks.push({ x: wx, y, z: wz, type: blockType });
      }

      // Spawn trees
      if (terrainH > 2 && shouldSpawnTree(wx, wz)) {
        const trunkHeight = 3 + Math.floor(hash2d(wx + 0.5, wz + 0.5) * 2);

        // Trunk
        for (let ty = 1; ty <= trunkHeight; ty++) {
          blocks.push({ x: wx, y: terrainH + ty, z: wz, type: "wood" });
        }

        // Leaves crown
        const leafY = terrainH + trunkHeight;
        for (let ldy = -1; ldy <= 1; ldy++) {
          for (let ldx = -2; ldx <= 2; ldx++) {
            for (let ldz = -2; ldz <= 2; ldz++) {
              if (Math.abs(ldx) + Math.abs(ldz) + Math.abs(ldy) <= 3) {
                if (ldx === 0 && ldz === 0 && ldy <= 0) continue;
                blocks.push({
                  x: wx + ldx,
                  y: leafY + ldy,
                  z: wz + ldz,
                  type: "leaves",
                });
              }
            }
          }
        }
      }
    }
  }

  const chunk: ChunkData = { blocks, key };
  chunkCache.set(key, chunk);
  return chunk;
}

export function getChunkCoords(
  wx: number,
  wz: number,
): { cx: number; cz: number } {
  return {
    cx: Math.floor(wx / CHUNK_SIZE),
    cz: Math.floor(wz / CHUNK_SIZE),
  };
}

// Remove a block from the chunk cache (for harvesting)
export function removeBlockFromCache(wx: number, wy: number, wz: number): void {
  const { cx, cz } = getChunkCoords(wx, wz);
  const key = `${cx}_${cz}`;
  const chunk = chunkCache.get(key);
  if (!chunk) return;

  chunk.blocks = chunk.blocks.filter(
    (b) => !(b.x === wx && b.y === wy && b.z === wz),
  );

  // Update height map
  const remaining = chunk.blocks.filter(
    (b) => b.x === wx && b.z === wz && b.type !== "empty",
  );
  const newHeight = remaining.reduce((max, b) => Math.max(max, b.y), 0);
  heightMapCache.set(`${wx}_${wz}`, newHeight);
}

// Add a block to the chunk cache (for placing)
export function addBlockToCache(
  wx: number,
  wy: number,
  wz: number,
  type: BlockType,
): void {
  const { cx, cz } = getChunkCoords(wx, wz);
  const key = `${cx}_${cz}`;
  let chunk = chunkCache.get(key);
  if (!chunk) {
    chunk = { blocks: [], key };
    chunkCache.set(key, chunk);
  }

  // Remove existing block at this position if any
  chunk.blocks = chunk.blocks.filter(
    (b) => !(b.x === wx && b.y === wy && b.z === wz),
  );
  chunk.blocks.push({ x: wx, y: wy, z: wz, type });

  // Update height map
  const currentH = heightMapCache.get(`${wx}_${wz}`) || 0;
  if (wy > currentH) {
    heightMapCache.set(`${wx}_${wz}`, wy);
  }
}

export function clearChunkCache(): void {
  chunkCache.clear();
  heightMapCache.clear();
}
