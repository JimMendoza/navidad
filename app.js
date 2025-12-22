const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let W, H, dpr;

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = canvas.width = Math.floor(innerWidth * dpr);
  H = canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
}
addEventListener("resize", resize);
resize();

/* ------------------ Nieve ------------------ */
const snow = Array.from({ length: 140 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: (Math.random() * 2.1 + 0.6) * dpr,
  vy: (Math.random() * 1.1 + 0.5) * dpr,
  vx: (Math.random() * 0.5 - 0.25) * dpr,
  a: Math.random() * Math.PI * 2,
}));

function drawSnow() {
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const f of snow) {
    f.a += 0.01;
    f.x += f.vx + Math.sin(f.a) * 0.12 * dpr;
    f.y += f.vy;

    if (f.y > H + 10) {
      f.y = -10;
      f.x = Math.random() * W;
    }
    if (f.x < -20) f.x = W + 20;
    if (f.x > W + 20) f.x = -20;

    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------ Trazo del árbol (misma forma) ------------------ */
function buildTreeStrokePoints(cx, topY, height) {
  const s = height;
  const x = cx;
  const y = topY;

  const pts = [];
  const add = (dx, dy) => pts.push([(x + dx) * dpr, (y + dy) * dpr]);

  add(0, 0); // punta
  add(-40, 0.08 * s);
  add(-55, 0.15 * s);
  add(-35, 0.2 * s);
  add(-10, 0.24 * s);

  add(-70, 0.33 * s);
  add(-15, 0.4 * s);

  add(-85, 0.52 * s);
  add(-20, 0.6 * s);

  add(-55, 0.78 * s);
  add(-10, 0.82 * s);

  // base larga a la derecha
  add(80, 0.88 * s);
  add(170, 0.86 * s);
  add(235, 0.83 * s);
  add(290, 0.8 * s);
  add(315, 0.82 * s);

  // vuelve cerca del centro para el “tronquito curvo”
  add(110, 0.93 * s);
  add(20, 0.96 * s);
  add(0, 0.98 * s);
  add(-20, 0.96 * s);
  add(-35, 0.93 * s);
  add(-10, 0.92 * s);
  add(0, 0.91 * s);

  return pts;
}

/* ------------------ Dibujo parcial + obtener punto final ------------------ */
function drawStrokeProgress(points, progress, style) {
  ctx.save();
  ctx.lineWidth = style.lineWidth;
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = style.glowColor;
  ctx.shadowBlur = style.glowBlur;

  let total = 0;
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i],
      [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len });
    total += len;
  }

  let drawLen = total * progress;

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  // punto actual del “lápiz”
  let penX = points[0][0];
  let penY = points[0][1];

  for (const s of segs) {
    if (drawLen <= 0) break;

    if (drawLen >= s.len) {
      ctx.lineTo(s.x2, s.y2);
      drawLen -= s.len;
      penX = s.x2;
      penY = s.y2;
    } else {
      const t = drawLen / s.len;
      penX = s.x1 + (s.x2 - s.x1) * t;
      penY = s.y1 + (s.y2 - s.y1) * t;
      ctx.lineTo(penX, penY);
      drawLen = 0;
      break;
    }
  }

  ctx.stroke();
  ctx.restore();

  return { penX, penY };
}

/* ------------------ Punto brillante que dibuja ------------------ */
function drawGlowingPen(x, y) {
  ctx.save();

  // halo grande
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(x, y, 18 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = "#00ff4c";
  ctx.shadowColor = "rgba(0,255,76,.75)";
  ctx.shadowBlur = 30 * dpr;
  ctx.fill();

  // núcleo brillante
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, 4.2 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = "#eafff0";
  ctx.shadowColor = "rgba(0,255,76,.95)";
  ctx.shadowBlur = 18 * dpr;
  ctx.fill();

  ctx.restore();
}

/* ------------------ Estrella ------------------ */
function drawStar(cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath();
  const spikes = 5;
  const r2 = r * 0.45;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r2;
    const a = (Math.PI / spikes) * i;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffd24a";
  ctx.shadowColor = "rgba(255,210,74,.7)";
  ctx.shadowBlur = 18 * dpr;
  ctx.fill();
  ctx.restore();
}

/* ------------------ Regalos ------------------ */
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawGift(x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 10 * dpr;
  roundRect(x, y, w, h, 10 * dpr);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.85)";
  roundRect(x + w * 0.45, y, w * 0.12, h, 6 * dpr);
  ctx.fill();
  roundRect(x, y + h * 0.45, w, h * 0.12, 6 * dpr);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.48, y - h * 0.06, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.62, y - h * 0.06, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ------------------ Click para reiniciar el dibujado ------------------ */
let start = performance.now(); // lo reiniciaremos
let lastTreeBox = null;

function resetDraw() {
  start = performance.now();
}

canvas.addEventListener("click", (e) => {
  if (!lastTreeBox) return;

  // coordenadas del click en px CSS
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // box del árbol está en px CSS, así que comparo directo
  if (
    mx >= lastTreeBox.x &&
    mx <= lastTreeBox.x + lastTreeBox.w &&
    my >= lastTreeBox.y &&
    my <= lastTreeBox.y + lastTreeBox.h
  ) {
    resetDraw();
  }
});

/* ------------------ Loop ------------------ */
function loop(t) {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  drawSnow();

  // Posición similar a tu imagen (árbol un poco a la izquierda)
  const cxCss = innerWidth * 0.34;
  const topYCss = innerHeight * 0.14;
  const heightCss = Math.min(innerHeight * 0.62, 520);

  // caja clickeable del árbol (en CSS px)
  lastTreeBox = {
    x: cxCss - 120,
    y: topYCss - 40,
    w: 520, // para que incluya la base larga
    h: heightCss + 140,
  };

  // progreso: 0..1
  const elapsed = (t - start) / 1000;
  const prog = Math.min(1, elapsed / 2.2);

  // estrella
  drawStar(cxCss * dpr, (topYCss - 18) * dpr, 20 * dpr);

  // árbol (trazo + devolver posición del “lápiz”)
  const pts = buildTreeStrokePoints(cxCss, topYCss, heightCss);
  const pen = drawStrokeProgress(pts, prog, {
    lineWidth: 7 * dpr,
    strokeStyle: "#00ff4c",
    glowColor: "rgba(0,255,76,.45)",
    glowBlur: 16 * dpr,
  });

  // punto brillante SOLO mientras se dibuja (si ya terminó, lo oculto)
  if (prog < 1) {
    drawGlowingPen(pen.penX, pen.penY);
  }

  // regalos al final
  const giftsAlpha = Math.max(0, (prog - 0.7) / 0.3);
  ctx.save();
  ctx.globalAlpha = giftsAlpha;

  const baseY = (topYCss + heightCss * 0.82) * dpr;
  const gW = 70 * dpr,
    gH = 55 * dpr;

  drawGift((cxCss + 40) * dpr, baseY + 22 * dpr, gW, gH, "#ff4d6d");
  drawGift((cxCss + 120) * dpr, baseY + 30 * dpr, gW, gH, "#4dd9ff");
  drawGift((cxCss + 200) * dpr, baseY + 18 * dpr, gW, gH, "#7cff4d");

  ctx.restore();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
