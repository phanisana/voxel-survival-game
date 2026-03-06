import { useEffect, useRef, useState } from "react";
import { useGameStore } from "./store";
import type { BlockType, WeaponTier } from "./store";

interface HUDProps {
  attackRef: React.MutableRefObject<boolean>;
  jumpRef: React.MutableRefObject<boolean>;
  onSaveScore?: () => void;
  onShowLeaderboard?: () => void;
}

const WEAPON_ICONS: Record<WeaponTier, string> = {
  Knife: "🗡️",
  Axe: "🪓",
  Sword: "⚔️",
  BattleAxe: "🔱",
  MagicStaff: "🔮",
};

const WEAPON_TIER_LABELS: Record<WeaponTier, string> = {
  Knife: "Tier I",
  Axe: "Tier II",
  Sword: "Tier III",
  BattleAxe: "Tier IV",
  MagicStaff: "Tier V",
};

const _WEAPON_TIER_CLASSES: Record<WeaponTier, string> = {
  Knife: "tier-knife",
  Axe: "tier-axe",
  Sword: "tier-sword",
  BattleAxe: "tier-battleaxe",
  MagicStaff: "tier-magicstaff",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ActionButtonProps {
  label: string;
  icon: string;
  color: string;
  onPointerDown: () => void;
  onPointerUp: () => void;
  "data-ocid"?: string;
}

function ActionButton({
  label,
  icon,
  color,
  onPointerDown,
  onPointerUp,
  "data-ocid": dataOcid,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      data-ocid={dataOcid}
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onPointerUp();
      }}
      onPointerLeave={(e) => {
        e.preventDefault();
        onPointerUp();
      }}
      style={{
        width: "clamp(52px, 12vw, 72px)",
        height: "clamp(52px, 12vw, 72px)",
        borderRadius: "50%",
        background: color,
        border: "2px solid rgba(255,255,255,0.3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        touchAction: "none",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "clamp(18px, 4vw, 24px)", lineHeight: 1 }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: "clamp(8px, 1.5vw, 10px)",
          color: "rgba(255,255,255,0.9)",
          fontWeight: 700,
          letterSpacing: "0.05em",
          marginTop: 2,
          fontFamily: '"Bricolage Grotesque", sans-serif',
        }}
      >
        {label}
      </span>
    </button>
  );
}

export default function HUD({
  attackRef,
  jumpRef,
  onSaveScore,
  onShowLeaderboard,
}: HUDProps) {
  const {
    playerHP,
    kills,
    survivalTime,
    weaponTier,
    weaponKillCounter,
    gamePhase,
    bossActive,
    bossHP,
    buildMode,
    inventory,
    selectedBuildBlock,
  } = useGameStore();

  const startGame = useGameStore((s) => s.startGame);
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode);
  const prevWeaponTier = useRef(weaponTier);
  const [weaponFlash, setWeaponFlash] = useState(false);
  const [prevPhase, setPrevPhase] = useState(gamePhase);

  // Detect weapon upgrade
  useEffect(() => {
    if (weaponTier !== prevWeaponTier.current) {
      prevWeaponTier.current = weaponTier;
      setWeaponFlash(true);
      setTimeout(() => setWeaponFlash(false), 500);
    }
  }, [weaponTier]);

  // Save score on death
  useEffect(() => {
    if (gamePhase === "dead" && prevPhase !== "dead") {
      onSaveScore?.();
    }
    setPrevPhase(gamePhase);
  }, [gamePhase, prevPhase, onSaveScore]);

  const hpPercent = (playerHP / 500) * 100;
  const hpColor =
    playerHP > 250 ? "#44DD44" : playerHP > 125 ? "#FFAA00" : "#FF3333";

  const buildableBlocks: BlockType[] = [
    "dirt",
    "stone",
    "wood",
    "grass",
    "sand",
  ];

  // Main menu
  if (gamePhase === "menu") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(10,14,26,0.97) 0%, rgba(20,8,40,0.97) 100%)",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(90,50,200,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(50,150,100,0.1) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Title */}
          <div
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontSize: "clamp(36px, 8vw, 72px)",
              fontWeight: 800,
              letterSpacing: "0.08em",
              lineHeight: 1,
              color: "#F5E642",
              textShadow:
                "0 0 40px rgba(245,230,66,0.5), 0 4px 8px rgba(0,0,0,0.8)",
              marginBottom: 8,
            }}
          >
            VOXEL
          </div>
          <div
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontSize: "clamp(22px, 5vw, 44px)",
              fontWeight: 500,
              letterSpacing: "0.25em",
              color: "#88BBFF",
              textShadow: "0 0 20px rgba(136,187,255,0.4)",
              marginBottom: 40,
            }}
          >
            SURVIVAL
          </div>

          {/* Feature badges */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 48,
            }}
          >
            {[
              "⚔️ 5 Weapon Tiers",
              "🧱 Build & Mine",
              "💀 Boss Fights",
              "🌍 Infinite World",
            ].map((feat) => (
              <div
                key={feat}
                style={{
                  padding: "6px 14px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 20,
                  fontSize: "clamp(10px, 2vw, 13px)",
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: '"Mona Sans", sans-serif',
                }}
              >
                {feat}
              </div>
            ))}
          </div>

          {/* Start button */}
          <button
            type="button"
            data-ocid="hud.start_button"
            onClick={startGame}
            style={{
              padding: "clamp(14px, 2.5vw, 20px) clamp(40px, 8vw, 80px)",
              background: "linear-gradient(135deg, #F5E642 0%, #FF8C00 100%)",
              border: "none",
              borderRadius: 12,
              fontSize: "clamp(18px, 3.5vw, 26px)",
              fontWeight: 800,
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: "0.1em",
              color: "#0A0E1A",
              cursor: "pointer",
              boxShadow:
                "0 8px 32px rgba(245,230,66,0.4), 0 0 60px rgba(255,140,0,0.2)",
              transform: "translateZ(0)",
            }}
          >
            TAP TO START
          </button>

          {/* Controls hint */}
          <div
            style={{
              marginTop: 32,
              color: "rgba(255,255,255,0.35)",
              fontSize: "clamp(10px, 1.8vw, 13px)",
              fontFamily: '"Mona Sans", sans-serif',
            }}
          >
            Joystick to move · Attack · Build/Mine · Jump
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
              left: 0,
              right: 0,
              textAlign: "center",
              color: "rgba(255,255,255,0.2)",
              fontSize: "clamp(9px, 1.5vw, 11px)",
              fontFamily: '"Mona Sans", sans-serif',
              lineHeight: 1.8,
            }}
          >
            <div
              style={{
                color: "rgba(136,187,255,0.5)",
                fontSize: "clamp(9px, 1.6vw, 12px)",
              }}
            >
              Developed by{" "}
              <span style={{ color: "rgba(245,230,66,0.6)", fontWeight: 700 }}>
                Sana Naga phanindra
              </span>
            </div>
            © {new Date().getFullYear()} · Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(245,230,66,0.4)", textDecoration: "none" }}
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Game Over screen
  if (gamePhase === "dead") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: 32,
            maxWidth: 400,
          }}
        >
          <div
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontSize: "clamp(36px, 8vw, 64px)",
              fontWeight: 800,
              color: "#FF3333",
              letterSpacing: "0.1em",
              textShadow: "0 0 30px rgba(255,50,50,0.6)",
              marginBottom: 24,
            }}
          >
            GAME OVER
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              marginBottom: 32,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "KILLS", value: String(kills), icon: "☠️" },
              { label: "SURVIVED", value: formatTime(survivalTime), icon: "⏱️" },
              {
                label: "WEAPON",
                value: weaponTier,
                icon: WEAPON_ICONS[weaponTier],
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "12px 20px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
                <div
                  style={{
                    fontSize: "clamp(18px, 3.5vw, 26px)",
                    fontWeight: 800,
                    color: "#F5E642",
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.1em",
                    fontFamily: '"Mona Sans", sans-serif',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              data-ocid="hud.play_again_button"
              onClick={startGame}
              style={{
                padding: "12px 32px",
                background: "linear-gradient(135deg, #F5E642 0%, #FF8C00 100%)",
                border: "none",
                borderRadius: 8,
                fontSize: "clamp(15px, 2.5vw, 18px)",
                fontWeight: 800,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                letterSpacing: "0.08em",
                color: "#0A0E1A",
                cursor: "pointer",
              }}
            >
              PLAY AGAIN
            </button>
            <button
              type="button"
              data-ocid="hud.leaderboard_button"
              onClick={onShowLeaderboard}
              style={{
                padding: "12px 32px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                fontSize: "clamp(15px, 2.5vw, 18px)",
                fontWeight: 700,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
              }}
            >
              LEADERBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing HUD
  if (gamePhase !== "playing") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      {/* Boss banner */}
      {bossActive && (
        <div
          className="boss-banner"
          style={{
            position: "absolute",
            top: "max(env(safe-area-inset-top, 0px), 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 20px",
            background: "linear-gradient(90deg, #FF4400, #FF8800, #FF4400)",
            borderRadius: 20,
            fontSize: "clamp(11px, 2.5vw, 14px)",
            fontWeight: 800,
            fontFamily: '"Bricolage Grotesque", sans-serif',
            letterSpacing: "0.1em",
            color: "#fff",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            boxShadow: "0 0 20px rgba(255,100,0,0.6)",
            zIndex: 30,
          }}
        >
          ⚠️ BOSS SPAWNED! · {bossHP} HP
        </div>
      )}

      {/* Top-left: HP Bar */}
      <div
        data-ocid="hud.player_hp.loading_state"
        style={{
          position: "absolute",
          top: "max(env(safe-area-inset-top, 0px), 12px)",
          left: "max(env(safe-area-inset-left, 0px), 12px)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "6px 10px",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 2vw, 13px)",
              fontWeight: 700,
              color: hpColor,
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: "0.05em",
              marginBottom: 3,
            }}
          >
            ❤️ {playerHP} / 500
          </div>
          <div
            style={{
              width: "clamp(120px, 18vw, 180px)",
              height: 7,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${hpPercent}%`,
                background: `linear-gradient(90deg, ${hpColor}, ${hpColor}CC)`,
                borderRadius: 4,
                transition: "width 0.2s, background 0.3s",
              }}
            />
          </div>
        </div>
      </div>

      {/* Top-right: Kill counter */}
      <div
        data-ocid="hud.kills_counter"
        style={{
          position: "absolute",
          top: "max(env(safe-area-inset-top, 0px), 12px)",
          right: "max(env(safe-area-inset-right, 0px), 12px)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "6px 12px",
            backdropFilter: "blur(6px)",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: "clamp(14px, 2.5vw, 20px)",
              fontWeight: 800,
              color: "#F5E642",
              fontFamily: '"Bricolage Grotesque", sans-serif',
              letterSpacing: "0.05em",
            }}
          >
            ☠️ {kills}
          </div>
          <div
            style={{
              fontSize: "clamp(9px, 1.5vw, 11px)",
              color: "rgba(255,255,255,0.4)",
              fontFamily: '"Mona Sans", sans-serif',
            }}
          >
            {formatTime(survivalTime)}
          </div>
        </div>
      </div>

      {/* Bottom-center: Weapon indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          textAlign: "center",
        }}
      >
        <div
          className={weaponFlash ? "weapon-upgrade" : ""}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: "6px 16px",
            backdropFilter: "blur(6px)",
          }}
        >
          <span style={{ fontSize: "clamp(16px, 3.5vw, 22px)" }}>
            {WEAPON_ICONS[weaponTier]}
          </span>
          <div>
            <div
              style={{
                fontSize: "clamp(11px, 2vw, 14px)",
                fontWeight: 800,
                color: "#fff",
                fontFamily: '"Bricolage Grotesque", sans-serif',
                lineHeight: 1.1,
              }}
            >
              {weaponTier}
            </div>
            <div
              style={{
                fontSize: "clamp(8px, 1.3vw, 10px)",
                color: "rgba(255,255,255,0.45)",
                fontFamily: '"Mona Sans", sans-serif',
                lineHeight: 1,
              }}
            >
              {WEAPON_TIER_LABELS[weaponTier]} · {weaponKillCounter}/5 kills
            </div>
          </div>
        </div>

        {/* Build mode inventory bar */}
        {buildMode && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              gap: 4,
              justifyContent: "center",
            }}
          >
            {buildableBlocks.map((block) => (
              <button
                type="button"
                key={block}
                onClick={() => useGameStore.getState().selectBuildBlock(block)}
                style={{
                  width: "clamp(32px, 7vw, 48px)",
                  height: "clamp(32px, 7vw, 48px)",
                  background:
                    selectedBuildBlock === block
                      ? "rgba(245,230,66,0.3)"
                      : "rgba(0,0,0,0.5)",
                  border:
                    selectedBuildBlock === block
                      ? "2px solid #F5E642"
                      : "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  pointerEvents: "all",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: "60%",
                    height: "60%",
                    borderRadius: 2,
                    background:
                      block === "grass"
                        ? "#4a7c40"
                        : block === "dirt"
                          ? "#8B5E3C"
                          : block === "stone"
                            ? "#888"
                            : block === "wood"
                              ? "#8B4513"
                              : block === "sand"
                                ? "#C2A04C"
                                : "#555",
                  }}
                />
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: '"Mona Sans", sans-serif',
                    marginTop: 2,
                  }}
                >
                  {inventory[block] || 0}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Action buttons */}
      <div
        style={{
          position: "absolute",
          right: "max(env(safe-area-inset-right, 0px), 16px)",
          bottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(8px, 2vw, 14px)",
          alignItems: "flex-end",
          pointerEvents: "all",
          zIndex: 20,
        }}
      >
        <ActionButton
          data-ocid="hud.jump_button"
          label="JUMP"
          icon="⬆️"
          color="rgba(40,120,200,0.85)"
          onPointerDown={() => {
            jumpRef.current = true;
          }}
          onPointerUp={() => {
            jumpRef.current = false;
          }}
        />
        <ActionButton
          data-ocid="hud.build_button"
          label={buildMode ? "MINE" : "BUILD"}
          icon={buildMode ? "⛏️" : "🧱"}
          color={buildMode ? "rgba(50,160,100,0.85)" : "rgba(80,100,160,0.85)"}
          onPointerDown={toggleBuildMode}
          onPointerUp={() => {}}
        />
        <ActionButton
          data-ocid="hud.attack_button"
          label="ATTACK"
          icon="⚔️"
          color="rgba(200,40,40,0.85)"
          onPointerDown={() => {
            attackRef.current = true;
          }}
          onPointerUp={() => {
            attackRef.current = false;
          }}
        />
      </div>
    </div>
  );
}
