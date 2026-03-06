import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "./store";

const BASE_RADIUS = 60;
const THUMB_RADIUS = 25;

export default function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });
  const thumbPos = useRef({ x: 0, y: 0 });

  const setJoystick = useGameStore((s) => s.setJoystick);

  const getBaseCenter = useCallback(() => {
    if (!baseRef.current) return { x: 0, y: 0 };
    const rect = baseRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const updateThumb = useCallback(
    (clientX: number, clientY: number) => {
      const center = baseCenter.current;
      const dx = clientX - center.x;
      const dy = clientY - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, BASE_RADIUS);

      const angle = Math.atan2(dy, dx);
      const tx = Math.cos(angle) * clampedDist;
      const ty = Math.sin(angle) * clampedDist;

      thumbPos.current = { x: tx, y: ty };

      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
      }

      // Normalize to -1..1
      const nx = tx / BASE_RADIUS;
      const ny = ty / BASE_RADIUS;
      setJoystick(nx, ny);
    },
    [setJoystick],
  );

  const resetThumb = useCallback(() => {
    thumbPos.current = { x: 0, y: 0 };
    if (thumbRef.current) {
      thumbRef.current.style.transform = "translate(-50%, -50%)";
    }
    setJoystick(0, 0);
  }, [setJoystick]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointer.current = e.pointerId;
      baseCenter.current = getBaseCenter();
      updateThumb(e.clientX, e.clientY);
    },
    [getBaseCenter, updateThumb],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== e.pointerId) return;
      updateThumb(e.clientX, e.clientY);
    },
    [updateThumb],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== e.pointerId) return;
      activePointer.current = null;
      resetThumb();
    },
    [resetThumb],
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "45%",
        height: "60%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        paddingLeft: "max(env(safe-area-inset-left, 0px), 20px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
        pointerEvents: "all",
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Base circle */}
      <div
        ref={baseRef}
        style={{
          position: "relative",
          width: BASE_RADIUS * 2,
          height: BASE_RADIUS * 2,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "2px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(4px)",
          flexShrink: 0,
        }}
      >
        {/* Deadzone indicator */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        />

        {/* Directional guides */}
        {["0", "90", "180", "270"].map((deg) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 2,
              height: BASE_RADIUS - 8,
              background: "rgba(255,255,255,0.1)",
              transformOrigin: "top center",
              transform: `translate(-50%, 0) rotate(${deg}deg)`,
            }}
          />
        ))}

        {/* Thumb */}
        <div
          ref={thumbRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: THUMB_RADIUS * 2,
            height: THUMB_RADIUS * 2,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,200,100,0.9) 0%, rgba(255,150,50,0.7) 100%)",
            border: "2px solid rgba(255,200,100,0.8)",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 12px rgba(255,180,50,0.5)",
            pointerEvents: "none",
          }}
          className="joystick-thumb"
        />
      </div>
    </div>
  );
}
