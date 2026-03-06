import { create } from "zustand";

export type BlockType =
  | "grass"
  | "dirt"
  | "stone"
  | "wood"
  | "leaves"
  | "sand"
  | "empty";

export type WeaponTier = "Knife" | "Axe" | "Sword" | "BattleAxe" | "MagicStaff";

export interface EnemyState {
  id: string;
  pos: [number, number, number];
  hp: number;
  maxHp: number;
  isBoss: boolean;
  state: "patrol" | "chase" | "attack";
  lastAttackTime: number;
}

export interface GameState {
  playerHP: number;
  kills: number;
  survivalTime: number;
  weaponTier: WeaponTier;
  weaponKillCounter: number;
  inventory: Record<BlockType, number>;
  buildMode: boolean;
  selectedBuildBlock: BlockType;
  gamePhase: "menu" | "playing" | "dead" | "leaderboard";
  bossActive: boolean;
  bossHP: number;
  joystick: { x: number; y: number };
  playerPos: [number, number, number];
  enemies: EnemyState[];

  // Actions
  takeDamage: (amount: number) => void;
  killEnemy: (enemyId: string) => void;
  startGame: () => void;
  endGame: () => void;
  setJoystick: (x: number, y: number) => void;
  setPlayerPos: (pos: [number, number, number]) => void;
  harvestBlock: (type: BlockType) => void;
  placeBlock: (type: BlockType) => void;
  toggleBuildMode: () => void;
  selectBuildBlock: (type: BlockType) => void;
  addEnemy: (enemy: EnemyState) => void;
  removeEnemy: (id: string) => void;
  updateEnemy: (id: string, updates: Partial<EnemyState>) => void;
  setEnemyHP: (id: string, hp: number) => void;
  spawnBoss: () => void;
  damageBoss: (amount: number) => void;
  tickSurvivalTime: () => void;
}

const WEAPON_CHAIN: WeaponTier[] = [
  "Knife",
  "Axe",
  "Sword",
  "BattleAxe",
  "MagicStaff",
];

export const WEAPON_DAMAGE: Record<WeaponTier, number> = {
  Knife: 40,
  Axe: 80,
  Sword: 130,
  BattleAxe: 200,
  MagicStaff: 300,
};

const initialInventory: Record<BlockType, number> = {
  grass: 0,
  dirt: 0,
  stone: 0,
  wood: 0,
  leaves: 0,
  sand: 0,
  empty: 0,
};

function getNextWeapon(current: WeaponTier): WeaponTier {
  const idx = WEAPON_CHAIN.indexOf(current);
  if (idx < WEAPON_CHAIN.length - 1) {
    return WEAPON_CHAIN[idx + 1];
  }
  return current;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerHP: 500,
  kills: 0,
  survivalTime: 0,
  weaponTier: "Knife",
  weaponKillCounter: 0,
  inventory: { ...initialInventory },
  buildMode: false,
  selectedBuildBlock: "dirt",
  gamePhase: "menu",
  bossActive: false,
  bossHP: 1500,
  joystick: { x: 0, y: 0 },
  playerPos: [0, 5, 0],
  enemies: [],

  takeDamage: (amount: number) => {
    set((state) => {
      const newHP = Math.max(0, state.playerHP - amount);
      if (newHP <= 0) {
        return { playerHP: 0, gamePhase: "dead" as const };
      }
      return { playerHP: newHP };
    });
  },

  killEnemy: (enemyId: string) => {
    set((state) => {
      const enemy = state.enemies.find((e) => e.id === enemyId);
      if (!enemy) return {};

      const isBossKill = enemy.isBoss;
      const newKills = state.kills + 1;
      const newKillCounter = isBossKill
        ? state.weaponKillCounter
        : state.weaponKillCounter + 1;

      // Weapon upgrade every 5 non-boss kills
      let newWeapon = state.weaponTier;
      let resetCounter = newKillCounter;
      if (!isBossKill && newKillCounter >= 5) {
        newWeapon = getNextWeapon(state.weaponTier);
        resetCounter = 0;
      }

      // Check if boss should spawn (every 25 kills)
      const shouldSpawnBoss =
        !isBossKill && !state.bossActive && newKills % 25 === 0;

      const newEnemies = state.enemies.filter((e) => e.id !== enemyId);

      return {
        enemies: newEnemies,
        kills: newKills,
        weaponTier: newWeapon,
        weaponKillCounter: resetCounter,
        bossActive: shouldSpawnBoss
          ? true
          : isBossKill
            ? false
            : state.bossActive,
        bossHP: 1500,
      };
    });
  },

  startGame: () => {
    set({
      playerHP: 500,
      kills: 0,
      survivalTime: 0,
      weaponTier: "Knife",
      weaponKillCounter: 0,
      inventory: { ...initialInventory },
      buildMode: false,
      selectedBuildBlock: "dirt",
      gamePhase: "playing",
      bossActive: false,
      bossHP: 1500,
      joystick: { x: 0, y: 0 },
      playerPos: [0, 5, 0],
      enemies: [],
    });
  },

  endGame: () => {
    set({ gamePhase: "dead" });
  },

  setJoystick: (x: number, y: number) => {
    set({ joystick: { x, y } });
  },

  setPlayerPos: (pos: [number, number, number]) => {
    set({ playerPos: pos });
  },

  harvestBlock: (type: BlockType) => {
    if (type === "empty") return;
    set((state) => ({
      inventory: {
        ...state.inventory,
        [type]: (state.inventory[type] || 0) + 1,
      },
    }));
  },

  placeBlock: (type: BlockType) => {
    if (type === "empty") return;
    set((state) => {
      const count = state.inventory[type] || 0;
      if (count <= 0) return {};
      return {
        inventory: {
          ...state.inventory,
          [type]: count - 1,
        },
      };
    });
  },

  toggleBuildMode: () => {
    set((state) => ({ buildMode: !state.buildMode }));
  },

  selectBuildBlock: (type: BlockType) => {
    set({ selectedBuildBlock: type });
  },

  addEnemy: (enemy: EnemyState) => {
    set((state) => ({
      enemies: [...state.enemies, enemy],
    }));
  },

  removeEnemy: (id: string) => {
    set((state) => ({
      enemies: state.enemies.filter((e) => e.id !== id),
    }));
  },

  updateEnemy: (id: string, updates: Partial<EnemyState>) => {
    set((state) => ({
      enemies: state.enemies.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    }));
  },

  setEnemyHP: (id: string, hp: number) => {
    set((state) => ({
      enemies: state.enemies.map((e) => (e.id === id ? { ...e, hp } : e)),
    }));
  },

  spawnBoss: () => {
    const { playerPos } = get();
    const angle = Math.random() * Math.PI * 2;
    const dist = 20;
    const bossEnemy: EnemyState = {
      id: "boss",
      pos: [
        playerPos[0] + Math.cos(angle) * dist,
        playerPos[1],
        playerPos[2] + Math.sin(angle) * dist,
      ],
      hp: 1500,
      maxHp: 1500,
      isBoss: true,
      state: "chase",
      lastAttackTime: 0,
    };
    set((state) => ({
      bossActive: true,
      enemies: [...state.enemies.filter((e) => e.id !== "boss"), bossEnemy],
    }));
  },

  damageBoss: (amount: number) => {
    set((state) => {
      const newBossHP = Math.max(0, state.bossHP - amount);
      return { bossHP: newBossHP };
    });
  },

  tickSurvivalTime: () => {
    set((state) => {
      const newTime = state.survivalTime + 1;
      // Check boss trigger: every 3 minutes (180s) if not boss active
      const shouldSpawnBoss =
        !state.bossActive && newTime > 0 && newTime % 180 === 0;
      return {
        survivalTime: newTime,
        bossActive: shouldSpawnBoss ? true : state.bossActive,
      };
    });
  },
}));
