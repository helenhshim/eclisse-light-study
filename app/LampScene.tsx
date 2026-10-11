"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./eclisse.module.css";

export default function LampScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    // Load only the small image interaction after hydration; the photograph stays visible.
    import("./lamp-renderer").then(({ createLamp }) => {
      if (cancelled) return;
      try {
        dispose = createLamp(canvas, stage);
      } catch (error) {
        console.warn("Eclisse: showing the original photograph because interaction is unavailable.", error);
      }
    }).catch((error) => {
      console.warn("Eclisse: the interactive scene could not load.", error);
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <div className={styles.stage}>
      <div ref={stageRef} className={styles.lamp}>
        <Image src="/eclisse/studio.webp" width={1241} height={1267} sizes="(max-width: 640px) 86vw, 550px" className={styles.photo} alt="An orange Eclisse lamp with a curved white shutter" preload draggable={false} />
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role="slider"
          tabIndex={0}
          aria-label="Eclisse shade rotation"
          aria-describedby="eclisse-instructions"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={90}
          aria-valuetext="90 degrees rotation, partially open"
        />
      </div>
      <p id="eclisse-instructions" className={styles.srOnly}>
        Grab the round shade and drag horizontally, or scroll sideways over it with a trackpad. Use Shift and the mouse wheel for horizontal scrolling. Keep dragging through a full turn to reveal the bulb again. Release to keep your chosen position. Arrow keys rotate the shade; Home closes it and End opens it.
      </p>
    </div>
  );
}
