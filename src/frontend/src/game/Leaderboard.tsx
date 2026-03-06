import { useQuery } from "@tanstack/react-query";
import { useActor } from "../hooks/useActor";
import { useGameStore } from "./store";

interface LeaderboardProps {
  onClose: () => void;
}

function formatTime(seconds: bigint): string {
  const s = Number(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function shortenPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const { actor } = useActor();
  const startGame = useGameStore((s) => s.startGame);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopLeaderboardEntries();
    },
    enabled: !!actor,
  });

  return (
    <div
      data-ocid="leaderboard.panel"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(10px)",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          background:
            "linear-gradient(135deg, rgba(20,16,40,0.98) 0%, rgba(10,14,26,0.98) 100%)",
          border: "1px solid rgba(245,230,66,0.3)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(245,230,66,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background:
              "linear-gradient(90deg, rgba(245,230,66,0.15), rgba(255,140,0,0.15))",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontSize: "clamp(18px, 3.5vw, 24px)",
              fontWeight: 800,
              color: "#F5E642",
              letterSpacing: "0.08em",
            }}
          >
            🏆 LEADERBOARD
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div
          style={{ padding: "12px 16px", maxHeight: "50vh", overflowY: "auto" }}
        >
          {isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "rgba(255,255,255,0.4)",
                fontFamily: '"Mona Sans", sans-serif',
              }}
            >
              Loading scores...
            </div>
          ) : !entries || entries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "rgba(255,255,255,0.4)",
                fontFamily: '"Mona Sans", sans-serif',
              }}
            >
              No scores yet. Be the first!
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={`${entry.principal}_${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 6,
                  background:
                    i === 0
                      ? "rgba(245,230,66,0.12)"
                      : i === 1
                        ? "rgba(200,200,200,0.08)"
                        : i === 2
                          ? "rgba(205,127,50,0.08)"
                          : "rgba(255,255,255,0.03)",
                  border:
                    i === 0
                      ? "1px solid rgba(245,230,66,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background:
                      i === 0
                        ? "#F5E642"
                        : i === 1
                          ? "#C0C0C0"
                          : i === 2
                            ? "#CD7F32"
                            : "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    color: i < 3 ? "#0A0E1A" : "rgba(255,255,255,0.5)",
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>

                {/* Principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "clamp(11px, 2vw, 13px)",
                      color: "rgba(255,255,255,0.6)",
                      fontFamily: '"Mona Sans", sans-serif',
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {shortenPrincipal(entry.principal)}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "clamp(13px, 2.5vw, 16px)",
                        fontWeight: 800,
                        color: "#F5E642",
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                      }}
                    >
                      ☠️ {Number(entry.kills)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: '"Mona Sans", sans-serif',
                      }}
                    >
                      kills
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "clamp(13px, 2.5vw, 16px)",
                        fontWeight: 800,
                        color: "#88BBFF",
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                      }}
                    >
                      {formatTime(entry.survivalTime)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: '"Mona Sans", sans-serif',
                      }}
                    >
                      time
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            data-ocid="hud.play_again_button"
            onClick={() => {
              startGame();
              onClose();
            }}
            style={{
              padding: "10px 28px",
              background: "linear-gradient(135deg, #F5E642 0%, #FF8C00 100%)",
              border: "none",
              borderRadius: 8,
              fontSize: "clamp(13px, 2.5vw, 16px)",
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
            onClick={onClose}
            style={{
              padding: "10px 28px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              fontSize: "clamp(13px, 2.5vw, 16px)",
              fontWeight: 600,
              fontFamily: '"Bricolage Grotesque", sans-serif',
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
}
