const lienzo = document.getElementById("c");
const contexto = lienzo.getContext("2d");
const textoNavidadBase = "¡Feliz Navidad!";

function obtenerNombreDesdeURL() {
  const params = new URLSearchParams(location.search);
  let nombre = (params.get("nombre") || params.get("n") || "").trim();

  if (!nombre && location.hash) {
    const hashLimpio = location.hash.replace(/^#\/?/, "");
    try {
      nombre = decodeURIComponent(hashLimpio).trim();
    } catch {
      nombre = hashLimpio.trim();
    }
  }

  if (!nombre) {
    const ruta = location.pathname.replace(/\/+$/, "");
    const partes = ruta.split("/").filter(Boolean);
    const ultimo = partes[partes.length - 1] || "";
    if (ultimo && ultimo.toLowerCase() !== "navidad") {
      try {
        nombre = decodeURIComponent(ultimo).trim();
      } catch {
        nombre = ultimo.trim();
      }
    }
  }

  nombre = nombre.replace(/[-_]+/g, " ").trim();
  if (nombre.length > 30) nombre = nombre.slice(0, 30).trim();
  return nombre;
}

const caption = document.querySelector(".caption");
if (caption) {
  const nombreURL = obtenerNombreDesdeURL();
  caption.textContent = nombreURL
    ? `${textoNavidadBase} ${nombreURL}`
    : textoNavidadBase;
  document.title = nombreURL ? `Feliz Navidad ${nombreURL}` : "Feliz Navidad";
}

const CANTIDAD_NIEVE = 100;
let anchoCanvas, altoCanvas, ratioPixeles;
let coposNieve = [];

function ajustarTamano() {
  // Ajusta el canvas a pixeles reales y reinicia la nieve.
  ratioPixeles = Math.min(devicePixelRatio || 1, 1.5);
  anchoCanvas = lienzo.width = Math.floor(innerWidth * ratioPixeles);
  altoCanvas = lienzo.height = Math.floor(innerHeight * ratioPixeles);
  lienzo.style.width = innerWidth + "px";
  lienzo.style.height = innerHeight + "px";
  iniciarNieve();
}
addEventListener("resize", ajustarTamano);
ajustarTamano();

/* ------------------ Nieve ------------------ */
function iniciarNieve() {
  // Crea copos con posicion y velocidad aleatoria.
  coposNieve = Array.from({ length: CANTIDAD_NIEVE }, () => ({
    x: Math.random() * anchoCanvas,
    y: Math.random() * altoCanvas,
    radio: (Math.random() * 2.1 + 0.6) * ratioPixeles,
    velY: (Math.random() * 1.1 + 0.5) * ratioPixeles,
    velX: (Math.random() * 0.5 - 0.25) * ratioPixeles,
    angulo: Math.random() * Math.PI * 2,
  }));
}

function dibujarNieve() {
  contexto.save();
  contexto.globalAlpha = 0.85;
  for (const copo of coposNieve) {
    copo.angulo += 0.01;
    copo.x += copo.velX + Math.sin(copo.angulo) * 0.12 * ratioPixeles;
    copo.y += copo.velY;

    if (copo.y > altoCanvas + 10) {
      copo.y = -10;
      copo.x = Math.random() * anchoCanvas;
    }
    if (copo.x < -20) copo.x = anchoCanvas + 20;
    if (copo.x > anchoCanvas + 20) copo.x = -20;

    contexto.beginPath();
    contexto.arc(copo.x, copo.y, copo.radio, 0, Math.PI * 2);
    contexto.fillStyle = "#fff";
    contexto.fill();
  }
  contexto.restore();
}

/* ------------------ Trazo del arbol ------------------ */
function construirPuntosTrazoArbol(centroX, yArriba, altoArbol) {
  const yBase = yArriba + altoArbol;
  const puntos = [];
  const escalaX = altoArbol / 520;
  const anchoFactor = 1.45;
  const muestreoCurva = 12;
  const tensionCurva = 0; // 0..1, 0 muy curvado, 1 lineal
  const sesgoCentro = 0.01; // positivo curva hacia el centro, negativo hacia afuera
  const factorTension = (1 - tensionCurva) / 2;
  const baseOffset = altoArbol * 0.01;

  // Curva punto a punto con union suave entre segmentos.
  const curvaPuntoAPunto = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    const t3 = t2 * t;
    const m1x = (p2[0] - p0[0]) * factorTension;
    const m1y = (p2[1] - p0[1]) * factorTension;
    const m2x = (p3[0] - p1[0]) * factorTension;
    const m2y = (p3[1] - p1[1]) * factorTension;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const x = h00 * p1[0] + h10 * m1x + h01 * p2[0] + h11 * m2x;
    const y = h00 * p1[1] + h10 * m1y + h01 * p2[1] + h11 * m2y;
    return [x, y];
  };

  const agregarCurvaSuave = (lista, omitirInicio) => {
    for (let i = 0; i < lista.length - 1; i++) {
      const p0 = lista[Math.max(0, i - 1)];
      const p1 = lista[i];
      const p2 = lista[i + 1];
      const p3 = lista[Math.min(lista.length - 1, i + 2)];

      for (let j = 0; j <= muestreoCurva; j++) {
        if (i === 0 && j === 0 && omitirInicio) continue;
        const t = j / muestreoCurva;
        let [x, y] = curvaPuntoAPunto(p0, p1, p2, p3, t);

        if (sesgoCentro !== 0 && t > 0 && t < 1) {
          const fuerza = Math.sin(Math.PI * t) * sesgoCentro;
          x += (centroX - x) * fuerza;
        }

        puntos.push([x, y]);
      }
    }
  };

  // Lado izquierdo (de arriba hacia abajo) con 2 ondas grandes
  const izquierda = [
    [centroX, yArriba],
    [centroX - 80, yArriba + altoArbol * 0.33],
    [centroX - 30, yArriba + altoArbol * 0.42],
    [centroX - 100, yArriba + altoArbol * 0.6],
    [centroX - 60, yArriba + altoArbol * 0.7],
    [centroX - 140, yArriba + altoArbol * 0.85],
  ];
  agregarCurvaSuave(izquierda, false);

  // Base curva suave y mas abajo (separada)
  puntos.push(null);
  const xBaseIzq = centroX - 100;
  const xBaseDer = centroX + 100;
  const yBaseLinea = yBase + baseOffset;
  const yBaseControl = yBaseLinea + altoArbol * 0.06;
  const pasosBase = 12;
  puntos.push([xBaseIzq, yBaseLinea]);
  for (let i = 1; i <= pasosBase; i++) {
    const t = i / pasosBase;
    const inv = 1 - t;
    const x = inv * inv * xBaseIzq + 2 * inv * t * centroX + t * t * xBaseDer;
    const y =
      inv * inv * yBaseLinea + 2 * inv * t * yBaseControl + t * t * yBaseLinea;
    puntos.push([x, y]);
  }
  puntos.push(null);

  // Lado derecho (de abajo hacia arriba), espejo del izquierdo
  const derecha = izquierda
    .slice()
    .reverse()
    .map(([x, y]) => [centroX + (centroX - x), y]);
  agregarCurvaSuave(derecha, true);

  // Escala a pixeles reales del canvas y ajusta el ancho segun el alto.
  return puntos.map((punto) => {
    if (!punto) return null;
    const [x, y] = punto;
    const xEscalado = centroX + (x - centroX) * escalaX * anchoFactor;
    return [xEscalado * ratioPixeles, y * ratioPixeles];
  });
}

/* ------------------ Dibujo parcial y posicion del lapiz ------------------ */
function dibujarTrazoProgreso(puntos, progreso, estilo) {
  contexto.save();
  contexto.lineWidth = estilo.anchoLinea;
  contexto.strokeStyle = estilo.colorTrazo;
  contexto.lineCap = "round";
  contexto.lineJoin = "round";
  contexto.shadowColor = estilo.colorBrillo;
  contexto.shadowBlur = estilo.blurBrillo;

  let longitudTotal = 0;
  const segmentos = [];
  let previo = null;
  let necesitaMover = true;
  for (let i = 0; i < puntos.length; i++) {
    const actual = puntos[i];
    if (!actual) {
      previo = null;
      necesitaMover = true;
      continue;
    }

    if (previo) {
      const [x1, y1] = previo;
      const [x2, y2] = actual;
      const longitud = Math.hypot(x2 - x1, y2 - y1);
      segmentos.push({ x1, y1, x2, y2, longitud, mover: necesitaMover });
      longitudTotal += longitud;
      necesitaMover = false;
    } else {
      necesitaMover = true;
    }

    previo = actual;
  }

  let longitudDibujar = longitudTotal * progreso;

  contexto.beginPath();
  let lapizX = 0;
  let lapizY = 0;
  for (const punto of puntos) {
    if (punto) {
      lapizX = punto[0];
      lapizY = punto[1];
      break;
    }
  }

  for (const segmento of segmentos) {
    if (longitudDibujar <= 0) break;

    if (segmento.mover) {
      contexto.moveTo(segmento.x1, segmento.y1);
      lapizX = segmento.x1;
      lapizY = segmento.y1;
    }

    if (longitudDibujar >= segmento.longitud) {
      contexto.lineTo(segmento.x2, segmento.y2);
      longitudDibujar -= segmento.longitud;
      lapizX = segmento.x2;
      lapizY = segmento.y2;
    } else {
      const proporcion = longitudDibujar / segmento.longitud;
      lapizX = segmento.x1 + (segmento.x2 - segmento.x1) * proporcion;
      lapizY = segmento.y1 + (segmento.y2 - segmento.y1) * proporcion;
      contexto.lineTo(lapizX, lapizY);
      longitudDibujar = 0;
      break;
    }
  }

  contexto.stroke();
  contexto.restore();

  return { lapizX, lapizY };
}

/* ------------------ Punto brillante que dibuja ------------------ */
function dibujarLapizBrillante(xLapiz, yLapiz) {
  const radio = 12 * ratioPixeles;
  const pulso =
    0.55 + 0.45 * Math.sin(tiempoActual * 4 + (xLapiz + yLapiz) * 0.01);
  const puntas = 6;
  const proporcionInterna = 0.45;

  const trazarEstrellaLapiz = (radioExterno) => {
    const radioInterno = radioExterno * proporcionInterna;
    contexto.beginPath();
    for (let i = 0; i < puntas * 2; i++) {
      const radioActual = i % 2 === 0 ? radioExterno : radioInterno;
      const angulo = (Math.PI / puntas) * i;
      const x = Math.cos(angulo) * radioActual;
      const y = Math.sin(angulo) * radioActual;
      if (i === 0) {
        contexto.moveTo(x, y);
      } else {
        contexto.lineTo(x, y);
      }
    }
    contexto.closePath();
  };

  contexto.save();
  contexto.translate(xLapiz, yLapiz);
  contexto.rotate(-Math.PI / 2);

  // Halos amarillos con forma de estrella.
  contexto.globalAlpha = 0.18 + 0.22 * pulso;
  trazarEstrellaLapiz(radio * (2.05 + 0.3 * pulso));
  contexto.fillStyle = "#ffd777";
  contexto.shadowColor = "rgba(255, 210, 74, .9)";
  contexto.shadowBlur = 22 * ratioPixeles;
  contexto.fill();

  contexto.globalAlpha = 0.28 + 0.24 * pulso;
  trazarEstrellaLapiz(radio * (1.55 + 0.25 * pulso));
  contexto.fillStyle = "#ffe29a";
  contexto.shadowColor = "rgba(255, 210, 74, .95)";
  contexto.shadowBlur = 16 * ratioPixeles;
  contexto.fill();

  // Estrella principal.
  contexto.globalAlpha = 1;
  trazarEstrellaLapiz(radio);
  contexto.fillStyle = "#fff2b6";
  contexto.shadowColor = "rgba(255, 210, 74, .95)";
  contexto.shadowBlur = 12 * ratioPixeles;
  contexto.fill();

  contexto.restore();
}

/* ------------------ Estrella ------------------ */
function dibujarEstrella(xCentro, yCentro, radio) {
  contexto.save();
  contexto.translate(xCentro, yCentro);
  contexto.rotate(-Math.PI / 2);

  const puntas = 8;
  const proporcionInterior = 0.42;
  const pulso =
    0.5 + 0.5 * Math.sin(tiempoActual * 3 + (xCentro + yCentro) * 0.002);

  const trazarEstrella = (radioExterno) => {
    const radioInterno = radioExterno * proporcionInterior;
    contexto.beginPath();
    for (let i = 0; i < puntas * 2; i++) {
      const radioActual = i % 2 === 0 ? radioExterno : radioInterno;
      const angulo = (Math.PI / puntas) * i;
      contexto.lineTo(
        Math.cos(angulo) * radioActual,
        Math.sin(angulo) * radioActual
      );
    }
    contexto.closePath();
  };

  const dibujarHalo = (rotacion, radioHalo, alphaBase, blurBase) => {
    contexto.save();
    contexto.rotate(rotacion);
    contexto.globalAlpha = alphaBase;
    trazarEstrella(radioHalo);
    contexto.fillStyle = "#ffe28a";
    contexto.shadowColor = "rgba(255,210,74,.9)";
    contexto.shadowBlur = blurBase * ratioPixeles;
    contexto.fill();
    contexto.restore();
  };

  dibujarHalo(
    0,
    radio * (1.55 + 0.35 * pulso),
    0.22 + 0.18 * pulso,
    24 + 12 * pulso
  );
  dibujarHalo(
    Math.PI / puntas,
    radio * (1.3 + 0.28 * pulso),
    0.18 + 0.16 * pulso,
    18 + 10 * pulso
  );

  contexto.globalAlpha = 1;

  const dibujarEstrellaBase = (
    rotacion,
    colorRelleno,
    colorBorde,
    grosorBorde
  ) => {
    contexto.save();
    contexto.rotate(rotacion);
    trazarEstrella(radio);
    contexto.fillStyle = colorRelleno;
    contexto.shadowColor = "rgba(255,210,74,.9)";
    contexto.shadowBlur = 18 * ratioPixeles;
    contexto.fill();
    contexto.lineWidth = grosorBorde * ratioPixeles;
    contexto.strokeStyle = colorBorde;
    contexto.stroke();
    contexto.restore();
  };

  dibujarEstrellaBase(0, "#d9a84f", "rgba(120,80,20,.75)", 1.6);
  dibujarEstrellaBase(
    Math.PI / puntas,
    "rgba(255,225,150,.7)",
    "rgba(160,110,30,.6)",
    1.1
  );
  contexto.restore();
}

/* ------------------ Regalos ------------------ */
function rectanguloRedondeado(x, y, ancho, alto, radio) {
  const radioReal = Math.min(radio, ancho / 2, alto / 2);
  contexto.beginPath();
  contexto.moveTo(x + radioReal, y);
  contexto.arcTo(x + ancho, y, x + ancho, y + alto, radioReal);
  contexto.arcTo(x + ancho, y + alto, x, y + alto, radioReal);
  contexto.arcTo(x, y + alto, x, y, radioReal);
  contexto.arcTo(x, y, x + ancho, y, radioReal);
  contexto.closePath();
}

function dibujarRegalo(x, y, ancho, alto, color) {
  // Caja base.
  contexto.save();
  contexto.fillStyle = color;
  contexto.shadowColor = "rgba(0,0,0,.35)";
  contexto.shadowBlur = 6 * ratioPixeles;
  rectanguloRedondeado(x, y, ancho, alto, 10 * ratioPixeles);
  contexto.fill();

  // Listones.
  contexto.shadowBlur = 0;
  contexto.fillStyle = "rgba(255,255,255,.85)";
  rectanguloRedondeado(
    x + ancho * 0.45,
    y,
    ancho * 0.12,
    alto,
    6 * ratioPixeles
  );
  contexto.fill();
  rectanguloRedondeado(
    x,
    y + alto * 0.45,
    ancho,
    alto * 0.12,
    6 * ratioPixeles
  );
  contexto.fill();

  // Lazo.
  contexto.fillStyle = "rgba(255,255,255,.9)";
  contexto.beginPath();
  contexto.ellipse(
    x + ancho * 0.48,
    y - alto * 0.06,
    ancho * 0.12,
    alto * 0.1,
    0,
    0,
    Math.PI * 2
  );
  contexto.ellipse(
    x + ancho * 0.62,
    y - alto * 0.06,
    ancho * 0.12,
    alto * 0.1,
    0,
    0,
    Math.PI * 2
  );
  contexto.fill();

  contexto.restore();
}

/* ------------------ Click para reiniciar el dibujo ------------------ */
let inicioAnimacion = performance.now();
let cajaArbol = null;
let tiempoActual = 0;
const FPS_OBJETIVO = 30;
const INTERVALO_FRAME = 1000 / FPS_OBJETIVO;
let ultimoFrame = 0;

/* ------------------ Estrella fugaz ------------------ */
let estrellaFugaz = null;

function reiniciarEstrellaFugaz() {
  // Arranca fuera de pantalla arriba-izquierda.
  estrellaFugaz = {
    inicioX: -120 * ratioPixeles,
    inicioY: (80 + Math.random() * 120) * ratioPixeles,
    cola: [],
    maxCola: 20,
    rutaPuntos: [],
    distancias: [],
    longitudTotal: 0,
    objetivoX: null,
    objetivoY: null,
    ancho: null,
    alto: null,
  };
}
reiniciarEstrellaFugaz();

function crearRutaAleatoria(xObjetivo, yObjetivo) {
  const margenBase = Math.min(
    60 * ratioPixeles,
    Math.min(anchoCanvas, altoCanvas) * 0.12
  );
  const margen = Math.max(12 * ratioPixeles, margenBase);
  const minX = margen;
  const maxX = Math.max(margen + 1, anchoCanvas - margen);
  const minY = margen;
  const maxY = Math.max(margen + 1, altoCanvas - margen);
  if (
    estrellaFugaz.inicioX === null ||
    estrellaFugaz.inicioY === null ||
    estrellaFugaz.inicioX < minX ||
    estrellaFugaz.inicioX > maxX ||
    estrellaFugaz.inicioY < minY ||
    estrellaFugaz.inicioY > maxY
  ) {
    estrellaFugaz.inicioX = minX + Math.random() * (maxX - minX);
    estrellaFugaz.inicioY = minY + Math.random() * (maxY - minY);
  }

  const puntosControl = [];
  puntosControl.push([estrellaFugaz.inicioX, estrellaFugaz.inicioY]);

  const vueltasRuta = 2;
  const puntosPorVuelta = 2;
  for (let vuelta = 0; vuelta < vueltasRuta; vuelta++) {
    for (let i = 0; i < puntosPorVuelta; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      puntosControl.push([x, y]);
    }
  }

  puntosControl.push([xObjetivo, yObjetivo]);

  const catmullRom = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    const t3 = t2 * t;
    const x =
      0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
    const y =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    return [x, y];
  };

  const rutaPuntos = [];
  const distancias = [];
  let longitudTotal = 0;
  const muestrasPorTramo = 16;

  for (let i = 0; i < puntosControl.length - 1; i++) {
    const p0 = puntosControl[Math.max(0, i - 1)];
    const p1 = puntosControl[i];
    const p2 = puntosControl[i + 1];
    const p3 = puntosControl[Math.min(puntosControl.length - 1, i + 2)];

    for (let j = 0; j <= muestrasPorTramo; j++) {
      const t = j / muestrasPorTramo;
      const [x, y] = catmullRom(p0, p1, p2, p3, t);
      if (!rutaPuntos.length) {
        rutaPuntos.push([x, y]);
        distancias.push(0);
        continue;
      }

      const [px, py] = rutaPuntos[rutaPuntos.length - 1];
      const d = Math.hypot(x - px, y - py);
      if (d < 0.001) continue;
      longitudTotal += d;
      rutaPuntos.push([x, y]);
      distancias.push(longitudTotal);
    }
  }

  const ultimo = rutaPuntos[rutaPuntos.length - 1];
  if (ultimo) {
    const d = Math.hypot(xObjetivo - ultimo[0], yObjetivo - ultimo[1]);
    if (d > 0.01) {
      longitudTotal += d;
      rutaPuntos.push([xObjetivo, yObjetivo]);
      distancias.push(longitudTotal);
    }
  }

  estrellaFugaz.rutaPuntos = rutaPuntos;
  estrellaFugaz.distancias = distancias;
  estrellaFugaz.longitudTotal = Math.max(longitudTotal, 1);
  estrellaFugaz.objetivoX = xObjetivo;
  estrellaFugaz.objetivoY = yObjetivo;
  estrellaFugaz.ancho = anchoCanvas;
  estrellaFugaz.alto = altoCanvas;
}

function actualizarEstrellaFugaz(xObjetivo, yObjetivo, progreso) {
  if (!estrellaFugaz) return;

  const objetivoCambio =
    estrellaFugaz.objetivoX === null ||
    Math.abs(estrellaFugaz.objetivoX - xObjetivo) > 1 ||
    Math.abs(estrellaFugaz.objetivoY - yObjetivo) > 1;

  if (
    objetivoCambio ||
    !estrellaFugaz.rutaPuntos.length ||
    estrellaFugaz.ancho !== anchoCanvas ||
    estrellaFugaz.alto !== altoCanvas
  ) {
    crearRutaAleatoria(xObjetivo, yObjetivo);
  }

  const t = Math.max(0, Math.min(1, progreso));
  const distancia = estrellaFugaz.longitudTotal * t;
  const distancias = estrellaFugaz.distancias;
  const puntos = estrellaFugaz.rutaPuntos;
  let xActual = puntos[0][0];
  let yActual = puntos[0][1];

  let indice = 0;
  while (indice < distancias.length && distancias[indice] < distancia) {
    indice++;
  }

  if (indice <= 0) {
    xActual = puntos[0][0];
    yActual = puntos[0][1];
  } else if (indice >= distancias.length) {
    const ultimo = puntos[puntos.length - 1];
    xActual = ultimo[0];
    yActual = ultimo[1];
  } else {
    const d1 = distancias[indice - 1];
    const d2 = distancias[indice];
    const f = d2 === d1 ? 0 : (distancia - d1) / (d2 - d1);
    const [x1, y1] = puntos[indice - 1];
    const [x2, y2] = puntos[indice];
    xActual = x1 + (x2 - x1) * f;
    yActual = y1 + (y2 - y1) * f;
  }

  if (t >= 1) {
    xActual = xObjetivo;
    yActual = yObjetivo;
  }

  if (t < 1) {
    // rastro
    estrellaFugaz.cola.unshift([xActual, yActual]);
    if (estrellaFugaz.cola.length > estrellaFugaz.maxCola) {
      estrellaFugaz.cola.pop();
    }
  } else if (estrellaFugaz.cola.length) {
    estrellaFugaz.cola = [];
  }

  const enFrente = true;

  return {
    x: xActual,
    y: yActual,
    cola: estrellaFugaz.cola,
    enFrente,
  };
}

function dibujarEstadoEstrellaFugaz(estado) {
  if (!estado) return;

  // Dibuja rastro (cola)
  if (estado.cola.length > 2) {
    const total = estado.cola.length;
    const dibujarCola = (anchoInicio, anchoFin, alphaBase, blurBase) => {
      contexto.save();
      contexto.lineCap = "round";
      contexto.shadowColor = "rgba(255, 210, 74, .7)";
      contexto.shadowBlur = blurBase * ratioPixeles;
      contexto.strokeStyle = "#ffd24a";

      for (let i = 0; i < total - 1; i++) {
        const [x1, y1] = estado.cola[i];
        const [x2, y2] = estado.cola[i + 1];
        const t = i / (total - 1);
        const ancho =
          (anchoInicio + (anchoFin - anchoInicio) * t) * ratioPixeles;
        const alpha = alphaBase * (1 - t);
        contexto.lineWidth = Math.max(1, ancho);
        contexto.globalAlpha = alpha;
        contexto.beginPath();
        contexto.moveTo(x1, y1);
        contexto.lineTo(x2, y2);
        contexto.stroke();
      }

      contexto.restore();
    };

    // Capa de brillo amplia.
    dibujarCola(10, 2.5, 0.35, 18);
    // Nucleo brillante mas definido.
    dibujarCola(4.5, 1.2, 0.9, 7);
  }

  // Dibuja la estrella en la posicion actual.
  dibujarEstrella(estado.x, estado.y, 50 * ratioPixeles);
}

function dibujarTronco(xCentroCss, ySuperiorCss, anchoCss, altoCss, progreso) {
  const avance = Math.max(0, Math.min(1, progreso));
  const radio = (anchoCss / 2) * ratioPixeles;
  const cx = xCentroCss * ratioPixeles;
  const cy = (ySuperiorCss + altoCss / 2) * ratioPixeles;

  contexto.save();
  contexto.strokeStyle = "#8b5a2b";
  contexto.lineWidth = 4 * ratioPixeles;
  contexto.shadowColor = "rgba(0,0,0,.35)";
  contexto.shadowBlur = 4 * ratioPixeles;
  const longitud = Math.PI * radio;
  contexto.setLineDash([longitud]);
  contexto.lineDashOffset = longitud * (1 - avance);
  contexto.beginPath();
  contexto.arc(cx, cy, radio, 0, Math.PI, false);
  contexto.stroke();
  contexto.restore();
}

function reiniciarDibujo() {
  inicioAnimacion = performance.now();
  reiniciarEstrellaFugaz();
}

lienzo.addEventListener("click", (evento) => {
  if (!cajaArbol) return;

  // Coordenadas del click en px CSS.
  const rectangulo = lienzo.getBoundingClientRect();
  const xClick = evento.clientX - rectangulo.left;
  const yClick = evento.clientY - rectangulo.top;

  // Si el click cae dentro de la caja del arbol, reiniciamos.
  if (
    xClick >= cajaArbol.x &&
    xClick <= cajaArbol.x + cajaArbol.w &&
    yClick >= cajaArbol.y &&
    yClick <= cajaArbol.y + cajaArbol.h
  ) {
    reiniciarDibujo();
  }
});

/* ------------------ Bucle principal ------------------ */
function bucle(tiempo) {
  requestAnimationFrame(bucle);
  if (tiempo - ultimoFrame < INTERVALO_FRAME) return;
  ultimoFrame = tiempo - ((tiempo - ultimoFrame) % INTERVALO_FRAME);

  tiempoActual = tiempo / 1000;
  contexto.clearRect(0, 0, anchoCanvas, altoCanvas);

  // Fondo.
  contexto.fillStyle = "#000";
  contexto.fillRect(0, 0, anchoCanvas, altoCanvas);

  dibujarNieve();

  const centroX = innerWidth * 0.5;
  const escalaAncho = Math.min(1, (innerWidth * 0.9) / 440);
  const escalaAlto = Math.min(1, (innerHeight * 0.62) / 520);
  const escalaArbol = Math.min(escalaAncho, escalaAlto);
  const xArbolCss = centroX;
  const yArribaCss = innerHeight * 0.14;
  const altoArbolCss = 520 * escalaArbol;
  const anchoArbolCss = 440 * escalaArbol;
  const margenCajaY = 40 * escalaArbol;
  const altoExtraCaja = 140 * escalaArbol;
  const yPuntaArbolCss = yArribaCss;
  const yObjetivoCss = yPuntaArbolCss - 18;
  const baseOffsetCss = altoArbolCss * 0.03;
  const yBaseCss = yArribaCss + altoArbolCss + baseOffsetCss;
  const anchoTroncoCss = anchoArbolCss * 0.12;
  const altoTroncoCss = anchoTroncoCss * 0.6;
  const yTroncoCss = yBaseCss + altoArbolCss * 0.02;

  // Caja clickeable del arbol (en px CSS).
  cajaArbol = {
    x: centroX - anchoArbolCss / 2,
    y: yArribaCss - margenCajaY,
    w: anchoArbolCss,
    h: altoArbolCss + altoExtraCaja,
  };

  // Progreso del dibujo: 0..1
  const transcurrido = (tiempo - inicioAnimacion) / 1000;
  const progreso = Math.min(1, transcurrido / 3.2);
  const progresoEstrella = progreso;
  const progresoTronco = Math.max(0, Math.min(1, (progreso - 0.65) / 0.35));

  // Estrella fugaz con trayectoria aleatoria.
  const estadoEstrella = actualizarEstrellaFugaz(
    xArbolCss * ratioPixeles,
    yObjetivoCss * ratioPixeles,
    progresoEstrella
  );
  if (estadoEstrella && !estadoEstrella.enFrente) {
    dibujarEstadoEstrellaFugaz(estadoEstrella);
  }

  // Arbol (trazo).
  const puntos = construirPuntosTrazoArbol(xArbolCss, yArribaCss, altoArbolCss);
  dibujarTrazoProgreso(puntos, progreso, {
    anchoLinea: 7 * ratioPixeles,
    colorTrazo: "#00ff4c",
    colorBrillo: "rgba(0,255,76,.45)",
    blurBrillo: 10 * ratioPixeles,
  });

  dibujarTronco(
    centroX,
    yTroncoCss,
    anchoTroncoCss,
    altoTroncoCss,
    progresoTronco
  );

  if (estadoEstrella && estadoEstrella.enFrente) {
    dibujarEstadoEstrellaFugaz(estadoEstrella);
  }

  // Regalos al final.
  const alphaRegalos = Math.max(0, (progreso - 0.7) / 0.3);
  contexto.save();
  contexto.globalAlpha = alphaRegalos;

  const yBase = (yArribaCss + altoArbolCss * 1.1) * ratioPixeles;
  const anchoRegalo = 70 * ratioPixeles;
  const altoRegalo = 55 * ratioPixeles;
  const separacionRegalos = 12 * ratioPixeles;
  const anchoTotalRegalos = anchoRegalo * 3 + separacionRegalos * 2;
  const xInicioRegalos = centroX * ratioPixeles - anchoTotalRegalos / 2;

  dibujarRegalo(
    xInicioRegalos,
    yBase + 22 * ratioPixeles,
    anchoRegalo,
    altoRegalo,
    "#ff4d6d"
  );
  dibujarRegalo(
    xInicioRegalos + anchoRegalo + separacionRegalos,
    yBase + 30 * ratioPixeles,
    anchoRegalo,
    altoRegalo,
    "#4dd9ff"
  );
  dibujarRegalo(
    xInicioRegalos + (anchoRegalo + separacionRegalos) * 2,
    yBase + 18 * ratioPixeles,
    anchoRegalo,
    altoRegalo,
    "#7cff4d"
  );

  // Texto final.
  const tamanoTextoCss = Math.min(38, Math.max(22, innerWidth * 0.035));
  contexto.font = `600 ${
    tamanoTextoCss * ratioPixeles
  }px "Georgia", "Times New Roman", serif`;
  contexto.fillStyle = "#ffe9b3";
  contexto.textAlign = "center";
  contexto.textBaseline = "top";
  contexto.shadowColor = "rgba(255,210,74,.6)";
  contexto.shadowBlur = 12 * ratioPixeles;
  contexto.restore();

}

requestAnimationFrame(bucle);
