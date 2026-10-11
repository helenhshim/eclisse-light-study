const TAU = Math.PI * 2;
const INITIAL_ANGLE = Math.PI / 2;
const WIDTH = 1241;
const HEIGHT = 1267;
const wrap = (value: number) => ((value % TAU) + TAU) % TAU;

/** Animate photographic interior plates; the original outer lamp never changes. */
export function createLamp(canvas: HTMLCanvasElement, stage: HTMLDivElement) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let disposed = false;
  let ready = false;
  let target = INITIAL_ANGLE;
  let current = target;
  let frame = 0;
  let previousTime = 0;
  let pointer: { id: number; x: number; angle: number } | undefined;
  let plates: HTMLImageElement[] = [];

  // Registered to the original photo, strictly inside its orange housing.
  const aperture = new Path2D("M 634 230 C 761 217 846 320 855 441 C 866 552 803 652 691 709 C 595 747 482 698 430 624 C 393 561 393 466 411 399 C 438 295 524 233 634 230 Z");

  const surroundings = stage.parentElement;
  function originalEdgeAt(y: number) {
    const t = Math.max(0, Math.min(1, (y - 257) / 443));
    const arc = Math.sqrt(Math.max(0, 1 - (t * 2 - 1) ** 2));
    return 754 - 73 * t - 93 * arc;
  }
  // Sample the same aperture and cover used by the photographic animation.
  // Visible area controls brightness; its centroid steers the escaping light.
  const lightSamples: { x: number; edge: number }[] = [];
  for (let y = 230; y <= 740; y += 12) {
    for (let x = 390; x <= 880; x += 12) {
      if (ctx.isPointInPath(aperture, x, y)) lightSamples.push({ x, edge: originalEdgeAt(y) });
    }
  }
  function updateSurroundings(angle: number) {
    const left = Math.sin(angle) >= 0;
    const offset = Math.cos(angle) * 330;
    let visible = 0;
    let center = 0;
    for (const sample of lightSamples) {
      const edge = left ? sample.edge + offset : 1270 - sample.edge - offset;
      if (left ? sample.x > edge : sample.x < edge) {
        visible++;
        center += sample.x;
      }
    }
    const fraction = visible / lightSamples.length;
    const direction = visible ? Math.max(-1, Math.min(1, (center / visible - 635) / 220)) : 0;
    surroundings?.style.setProperty("--light-opacity", Math.pow(fraction, .85).toFixed(4));
    surroundings?.style.setProperty("--spill-x", (direction * stage.clientWidth * .3).toFixed(2) + "px");
    surroundings?.style.setProperty("--spill-width", (.65 + fraction * .65).toFixed(4));
  }

  function load(src: string) {
    const image = new window.Image();
    image.src = src;
    return image.decode().then(() => image);
  }

  function photoPoint(event: MouseEvent) {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * WIDTH, y: (event.clientY - bounds.top) / bounds.height * HEIGHT };
  }
  function hitsShade(event: MouseEvent) {
    const point = photoPoint(event);
    return ((point.x - 625) / 305) ** 2 + ((point.y - 455) / 310) ** 2 <= 1;
  }
  function distancePerTurn() { return stage.clientWidth * .9; }

  function paint() {
    const angle = wrap(current);
    const value = Math.round(angle / TAU * 360) % 360;
    const openness = (1 - Math.cos(angle)) / 2;
    canvas.setAttribute("aria-valuenow", String(value));
    canvas.setAttribute("aria-valuetext", value + " degrees rotation, approximately " + Math.round(openness * 100) + "% open");
    if (!ready) return;
    updateSurroundings(angle);
    const scale = canvas.width / WIDTH;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // The untouched original is the exact resting frame, including after loading.
    // Blend only the interior over a short angular interval on departure/return.
    const distance = Math.abs(Math.atan2(Math.sin(angle - INITIAL_ANGLE), Math.cos(angle - INITIAL_ANGLE)));
    const blend = Math.min(1, distance / .24);
    if (blend < .001) return;
    ctx.save();
    ctx.clip(aperture);
    ctx.globalAlpha = blend;
    ctx.drawImage(plates[0], 0, 0, WIDTH, HEIGHT);

    // A projected curved edge alternates sides each half-turn. Angles stay
    // unwrapped in the input model, so either direction can continue forever.
    const left = Math.sin(angle) >= 0;
    const edge: { x: number; y: number }[] = [];
    for (let y = 210; y <= 750; y += 3) {
      const originalEdge = originalEdgeAt(y);
      const x = left ? originalEdge + Math.cos(angle) * 330 : 1270 - originalEdge - Math.cos(angle) * 330;
      edge.push({ x, y });
    }
    const mask = new Path2D();
    mask.moveTo(left ? 0 : WIDTH, 210);
    edge.forEach((point) => mask.lineTo(point.x, point.y));
    mask.lineTo(left ? 0 : WIDTH, 750);
    mask.closePath();

    // Soft contact shadow falls into the illuminated bowl, below the opaque cover.
    ctx.save();
    ctx.fillStyle = "rgba(44, 24, 10, .26)";
    ctx.shadowColor = "rgba(35, 18, 6, .55)";
    ctx.shadowBlur = 15 * scale;
    ctx.shadowOffsetX = (left ? 7 : -7) * scale;
    ctx.fill(mask);
    ctx.restore();

    ctx.save();
    ctx.clip(mask);
    ctx.drawImage(plates[1], 0, 0, WIDTH, HEIGHT);
    ctx.restore();
    ctx.beginPath();
    edge.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = "rgba(255, 238, 202, .6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function draw(time: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time;
    current = motion.matches ? target : current + (target - current) * (1 - Math.exp(-22 * dt));
    if (Math.abs(current - target) < .0001) current = target;
    paint();
    if (current !== target) frame = requestAnimationFrame(draw);
  }
  function wake() {
    if (!disposed && !document.hidden && !frame) {
      previousTime = 0;
      frame = requestAnimationFrame(draw);
    }
  }
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(stage.clientWidth * ratio);
    canvas.height = Math.round(canvas.width * HEIGHT / WIDTH);
    wake();
  }
  function onDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || !hitsShade(event)) return;
    pointer = { id: event.pointerId, x: event.clientX, angle: target };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  }
  function onMove(event: PointerEvent) {
    if (!pointer) {
      canvas.style.cursor = hitsShade(event) ? "grab" : "default";
      return;
    }
    if (event.pointerId !== pointer.id) return;
    target = pointer.angle + (event.clientX - pointer.x) / distancePerTurn() * TAU;
    wake();
  }
  function onUp(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = hitsShade(event) ? "grab" : "default";
  }
  function onLeave() { if (!pointer) canvas.style.cursor = "default"; }
  function onWheel(event: WheelEvent) {
    if (!hitsShade(event) || event.ctrlKey) return;
    const delta = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (!delta || (!event.shiftKey && Math.abs(delta) < Math.abs(event.deltaY))) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1;
    target += delta * unit / distancePerTurn() * TAU;
    wake();
  }
  function onKey(event: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowLeft: -Math.PI / 20, ArrowDown: -Math.PI / 20, ArrowRight: Math.PI / 20, ArrowUp: Math.PI / 20 };
    if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (event.key === "Home" || event.key === "End") {
      const destination = event.key === "Home" ? 0 : Math.PI;
      target = destination + Math.round((target - destination) / TAU) * TAU;
    } else target += steps[event.key];
    wake();
  }
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", wake);
  resize();
  Promise.all([load("/eclisse/interior-open.webp"), load("/eclisse/interior-closed.webp")]).then((images) => {
    if (disposed) return;
    plates = images;
    ready = true;
    stage.dataset.ready = "true";
    wake();
  }).catch(() => {
    // Keep the original image visible if an interaction plate fails to load.
    if (!disposed) canvas.setAttribute("aria-disabled", "true");
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("lostpointercapture", onUp);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", visibility);
    motion.removeEventListener("change", wake);
    plates = [];
    for (const property of ["--light-opacity", "--spill-x", "--spill-width"]) surroundings?.style.removeProperty(property);
  };
}
