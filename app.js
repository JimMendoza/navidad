const lienzo = document.getElementById("c");
const contexto = lienzo.getContext("2d");
const textoNavidadBase = "Feliz Navidad!";

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

const nombreURL = obtenerNombreDesdeURL();
const textoNavidadFinal = nombreURL
  ? `${textoNavidadBase} ${nombreURL}`
  : textoNavidadBase;
const caption = document.querySelector(".caption");
if (caption) {
  caption.textContent = textoNavidadFinal;
  caption.style.display = "none";
}
document.title = nombreURL ? `Feliz Navidad ${nombreURL}` : "Feliz Navidad";

const CANTIDAD_NIEVE_BASE = 100;
const PERFIL_CALIDAD_ALTO = {
  maxDpr: 1.5,
  fpsObjetivo: 30,
  muestreoCurva: 12,
  maxCola: 20,
  puntosPorVuelta: 2,
  muestrasPorTramo: 16,
  factorSombra: 1,
  factorNieve: 1,
};
const PERFIL_CALIDAD_MEDIO = {
  maxDpr: 1.25,
  fpsObjetivo: 28,
  muestreoCurva: 10,
  maxCola: 17,
  puntosPorVuelta: 2,
  muestrasPorTramo: 12,
  factorSombra: 0.85,
  factorNieve: 0.8,
};
const PERFIL_CALIDAD_BAJO = {
  maxDpr: 1,
  fpsObjetivo: 24,
  muestreoCurva: 8,
  maxCola: 14,
  puntosPorVuelta: 1,
  muestrasPorTramo: 10,
  factorSombra: 0.7,
  factorNieve: 0.6,
};
let perfilActual = PERFIL_CALIDAD_ALTO;
let maxDpr = PERFIL_CALIDAD_ALTO.maxDpr;
let fpsObjetivo = PERFIL_CALIDAD_ALTO.fpsObjetivo;
let intervaloFrame = 1000 / fpsObjetivo;
let factorSombra = PERFIL_CALIDAD_ALTO.factorSombra;
let cantidadNieve = CANTIDAD_NIEVE_BASE;
let anchoCanvas, altoCanvas, ratioPixeles;
let coposNieve = [];
let ultimoFrame = 0;
let ultimoTiempoRendimiento = 0;
let acumuladorRendimiento = 0;
let muestrasRendimiento = 0;
let evaluacionRendimientoActiva = true;
let necesitaReinicioEstrella = false;

function detectarPerfilInicial() {
  const memoria = navigator.deviceMemory || 0;
  const nucleos = navigator.hardwareConcurrency || 0;
  const esBajo = (memoria && memoria <= 2) || (nucleos && nucleos <= 4);
  const esMedio =
    (memoria && memoria > 2 && memoria <= 4) ||
    (nucleos && nucleos > 4 && nucleos <= 6);
  if (esBajo) return PERFIL_CALIDAD_BAJO;
  if (esMedio) return PERFIL_CALIDAD_MEDIO;
  return PERFIL_CALIDAD_ALTO;
}

function aplicarPerfil(perfil, forzar) {
  if (!forzar && perfilActual === perfil) return;
  perfilActual = perfil;
  maxDpr = perfil.maxDpr;
  fpsObjetivo = perfil.fpsObjetivo;
  intervaloFrame = 1000 / fpsObjetivo;
  factorSombra = perfil.factorSombra;
  cantidadNieve = Math.max(
    30,
    Math.round(CANTIDAD_NIEVE_BASE * perfil.factorNieve)
  );
  ultimoFrame = 0;
  ultimoTiempoRendimiento = 0;
  acumuladorRendimiento = 0;
  muestrasRendimiento = 0;
  evaluacionRendimientoActiva = perfilActual !== PERFIL_CALIDAD_BAJO;
  necesitaReinicioEstrella = true;
  if (typeof ajustarTamano === "function") {
    ajustarTamano();
  }
}

function evaluarRendimiento(tiempo) {
  if (!evaluacionRendimientoActiva || perfilActual === PERFIL_CALIDAD_BAJO) {
    return;
  }
  if (!ultimoTiempoRendimiento) {
    ultimoTiempoRendimiento = tiempo;
    return;
  }
  const delta = tiempo - ultimoTiempoRendimiento;
  ultimoTiempoRendimiento = tiempo;
  acumuladorRendimiento += delta;
  muestrasRendimiento += 1;

  if (acumuladorRendimiento >= 2000) {
    const fpsPromedio = (muestrasRendimiento * 1000) / acumuladorRendimiento;
    acumuladorRendimiento = 0;
    muestrasRendimiento = 0;
    if (fpsPromedio < fpsObjetivo - 6) {
      if (perfilActual === PERFIL_CALIDAD_ALTO) {
        aplicarPerfil(PERFIL_CALIDAD_MEDIO, true);
      } else if (perfilActual === PERFIL_CALIDAD_MEDIO) {
        aplicarPerfil(PERFIL_CALIDAD_BAJO, true);
      }
    }
  }
}

function ajustarTamano() {
  // Ajusta el canvas a pixeles reales y reinicia la nieve.
  ratioPixeles = Math.min(devicePixelRatio || 1, maxDpr);
  anchoCanvas = lienzo.width = Math.floor(innerWidth * ratioPixeles);
  altoCanvas = lienzo.height = Math.floor(innerHeight * ratioPixeles);
  lienzo.style.width = innerWidth + "px";
  lienzo.style.height = innerHeight + "px";
  iniciarNieve();
}
addEventListener("resize", ajustarTamano);
aplicarPerfil(detectarPerfilInicial(), true);

/* ------------------ Nieve ------------------ */
function iniciarNieve() {
  // Crea copos con posicion y velocidad aleatoria.
  coposNieve = Array.from({ length: cantidadNieve }, () => ({
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
  const muestreoCurva = perfilActual.muestreoCurva;
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
    contexto.shadowBlur = blurBase * ratioPixeles * factorSombra;
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
    contexto.shadowBlur = 18 * ratioPixeles * factorSombra;
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

/* ------------------ Click para reiniciar el dibujo ------------------ */
let inicioAnimacion = performance.now();
let cajaArbol = null;
let tiempoActual = 0;

/* ------------------ Estrella fugaz ------------------ */
let estrellaFugaz = null;

function reiniciarEstrellaFugaz() {
  // Arranca fuera de pantalla arriba-izquierda.
  estrellaFugaz = {
    inicioX: -120 * ratioPixeles,
    inicioY: (80 + Math.random() * 120) * ratioPixeles,
    cola: [],
    maxCola: perfilActual.maxCola,
    rutaPuntos: [],
    distancias: [],
    longitudTotal: 0,
    objetivoX: null,
    objetivoY: null,
    ancho: null,
    alto: null,
  };
  necesitaReinicioEstrella = false;
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
  const puntosPorVuelta = perfilActual.puntosPorVuelta;
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
  const muestrasPorTramo = perfilActual.muestrasPorTramo;

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
  if (necesitaReinicioEstrella) {
    reiniciarEstrellaFugaz();
    necesitaReinicioEstrella = false;
  }

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
      contexto.shadowBlur = blurBase * ratioPixeles * factorSombra;
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
  contexto.shadowBlur = 4 * ratioPixeles * factorSombra;
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
  if (tiempo - ultimoFrame < intervaloFrame) return;
  ultimoFrame = tiempo - ((tiempo - ultimoFrame) % intervaloFrame);

  evaluarRendimiento(tiempo);
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
    blurBrillo: 10 * ratioPixeles * factorSombra,
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

  // Texto final debajo del arbol.
  contexto.save();
  const tamanoTextoCss = Math.min(64, Math.max(28, innerWidth * 0.055));
  const yTextoCss = Math.min(
    innerHeight - tamanoTextoCss * 1.3,
    yBaseCss + altoArbolCss * 0.1
  );
  const xTexto = centroX * ratioPixeles;
  const yTexto = yTextoCss * ratioPixeles;
  const gradienteTexto = contexto.createLinearGradient(
    xTexto,
    yTexto,
    xTexto,
    yTexto + tamanoTextoCss * ratioPixeles
  );
  gradienteTexto.addColorStop(0, "#fff4d1");
  gradienteTexto.addColorStop(0.5, "#ffd369");
  gradienteTexto.addColorStop(1, "#ffe9b3");

  contexto.font = `700 ${
    tamanoTextoCss * ratioPixeles
  }px "Georgia", "Times New Roman", serif`;
  contexto.textAlign = "center";
  contexto.textBaseline = "top";

  // Brillo suave de fondo.
  contexto.globalAlpha = 0.6;
  contexto.fillStyle = gradienteTexto;
  contexto.shadowColor = "rgba(255, 200, 80, .9)";
  contexto.shadowBlur = 26 * ratioPixeles * factorSombra;
  contexto.fillText(textoNavidadFinal, xTexto, yTexto);

  // Texto principal con borde sutil.
  contexto.globalAlpha = 1;
  contexto.shadowBlur = 14 * ratioPixeles * factorSombra;
  contexto.fillText(textoNavidadFinal, xTexto, yTexto);
  contexto.shadowBlur = 0;
  contexto.lineWidth = 2 * ratioPixeles;
  contexto.strokeStyle = "rgba(120, 70, 10, .7)";
  contexto.strokeText(textoNavidadFinal, xTexto, yTexto);
  contexto.restore();

}

requestAnimationFrame(bucle);
