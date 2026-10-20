// generar-imagenes-marca.browser.js — Rehace la imagen para compartir (1200×630) y los íconos con el Choladito y La India ACTUALES del juego.
//
// NO es un script de Node: se pega en la consola del navegador (o lo corre Claude con el navegador del panel) con el juego abierto en
//   http://localhost:5173/?debug=1&api=falsa      (después de `npm run dev`)
// porque necesita dibujar los modelos 3D con WebGL. Hay que correrlo cada vez que cambie el aspecto de Choladito o La India
// (la última vez fue el 2026-10-20, cuando quedó el cholado «Mermelada»; antes las imágenes mostraban el modelo viejo).
//
// Pasos:  1) correr el bloque «capturar»  2) correr el bloque «componer»  3) guardar los 5 archivos en web/assets/marca/
//         (compartir.jpg, icono-512.png, icono-192.png, apple-touch-icon.png [180 px] y favicon-32.png); Claude usa un receptor
//         temporal de Node que escucha en 127.0.0.1 y escribe lo que le manda el navegador.
// (Se guardó aquí como receta: la composición se corrió tal cual, en una sola pieza, el 2026-10-20; aquí quedó separada en dos funciones.)
// Después de publicar, WhatsApp/Instagram/Facebook guardan la vista previa vieja un tiempo: para forzarla en Facebook/Instagram
//   usa https://developers.facebook.com/tools/debug/ → «Scrape Again».

/* ───────────── 1) capturar (Choladito, La India y el Choladito de cerca para los íconos) ───────────── */
async function capturarModelos() {
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = window.__cholado;
  c.cfg.desarrollo.autoPausa = false;
  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  document.querySelector('#pantalla').style.visibility = 'hidden';
  c.escena.renderer.setPixelRatio(2.5);
  c.escena.ajustar();
  await esperar(300);
  const escena = c.escena.escena;
  const grupos = () => escena.children.filter((o) => o.type === 'Group' && o.children.length === 5); // los personajes (cuerpo + 4 extremidades)
  async function capturar(personaje, camara) {
    c.escena.usarPersonaje(personaje);
    c.escena.fijarCamara(camara);
    c.tick(0.001);
    const g = grupos().find((o) => o.visible);
    for (const o of escena.children) o.visible = o === g; // se esconde todo menos el personaje: queda con fondo transparente
    for (let i = 0; i < 3; i++) c.tick(0.016);
    return c.escena.renderer.domElement.toDataURL('image/png');
  }
  const A = await capturar('cholado', { pos: [0, 1.35, 3.5], mira: [0, 1.3, 0] });
  const B = await capturar('india', { pos: [0, 1.25, 3.3], mira: [0, 1.2, 0] });
  const C = await capturar('cholado', { pos: [0, 1.42, 2.5], mira: [0, 1.22, 0] });
  window.__cap = { A, B, C };
}

/* ───────────── 2) componer (imagen para compartir + íconos) ───────────── */
async function componerImagenes() {
  const cargar = (u) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
  function caja(img) { // el rectángulo que ocupa el personaje (lo no transparente)
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let xx = 0; xx < cv.width; xx++) if (d[(y * cv.width + xx) * 4 + 3] > 10) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  const [iA, iB, iC, logo] = await Promise.all([cargar(__cap.A), cargar(__cap.B), cargar(__cap.C), cargar('/assets/marca/logo.png')]);
  await document.fonts.load('96px "Lilita One"'); await document.fonts.load('600 36px Fredoka');
  const bA = caja(iA), bB = caja(iB), bC = caja(iC);
  const personaje = (x, img, b, cx, base, alto) => { const esc = alto / b.h; x.drawImage(img, b.x, b.y, b.w, b.h, cx - b.w * esc / 2, base - alto, b.w * esc, alto); };

  // ── imagen para compartir 1200×630
  const W = 1200, H = 630; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d8287f'); g.addColorStop(0.5, '#ff7a5c'); g.addColorStop(0.68, '#ffb36a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,226,107,.30)'; x.beginPath(); x.arc(930, 330, 250, 0, 7); x.fill(); x.fillStyle = '#ffe26b'; x.beginPath(); x.arc(930, 330, 160, 0, 7); x.fill();
  x.fillStyle = 'rgba(176,52,112,.55)'; [[640, 430, 130], [860, 430, 150], [1090, 430, 120]].forEach(([cx, by, r]) => { x.beginPath(); x.moveTo(cx - r * 1.3, by); x.lineTo(cx, by - r); x.lineTo(cx + r * 1.3, by); x.closePath(); x.fill(); });
  x.fillStyle = '#b6e80a'; x.fillRect(0, 430, W, H - 430);
  x.fillStyle = '#4a1d4f'; x.beginPath(); x.moveTo(890, 430); x.lineTo(990, 430); x.lineTo(1330, H); x.lineTo(550, H); x.closePath(); x.fill();
  x.strokeStyle = '#66c3e0'; x.lineWidth = 9; x.beginPath(); x.moveTo(890, 430); x.lineTo(550, H); x.moveTo(990, 430); x.lineTo(1330, H); x.stroke();
  x.strokeStyle = 'rgba(102,195,224,.8)'; x.lineWidth = 6; x.setLineDash([26, 26]); x.beginPath(); x.moveTo(940, 430); x.lineTo(940, H); x.stroke(); x.setLineDash([]);
  personaje(x, iB, bB, 1010, 618, 470);
  personaje(x, iA, bA, 775, 618, 520);
  const lw = 500, lh = lw * logo.height / logo.width; x.drawImage(logo, 60, 48, lw, lh);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
  const base1 = Math.round(48 + lh + 56 + 72); // el título va BAJO el logo con aire (pedido del usuario: no pegado al logo)
  x.font = '96px "Lilita One"'; x.lineWidth = 16; x.strokeStyle = '#3a0f33'; x.fillStyle = '#fff';
  ['¡Corre por', 'tu cholado!'].forEach((t, i) => { x.strokeText(t, 60, base1 + i * 100); x.fillText(t, 60, base1 + i * 100); }); // con los signos «¡ !»
  const baseSub = Math.min(H - 36, base1 + 100 + 78);
  x.font = '600 36px Fredoka'; x.lineWidth = 8; x.strokeStyle = '#3a0f33'; x.fillStyle = '#fff';
  x.strokeText('¡Gana un regalo en el local!', 62, baseSub); x.fillText('¡Gana un regalo en el local!', 62, baseSub);
  const jpg = (() => { const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const y = c2.getContext('2d'); y.fillStyle = '#d8287f'; y.fillRect(0, 0, W, H); y.drawImage(cv, 0, 0); return c2.toDataURL('image/jpeg', 0.86); })();

  // ── íconos cuadrados: el vaso completo (sin las piernas) sobre degradado con sol
  function icono(size) {
    const c2 = document.createElement('canvas'); c2.width = c2.height = size; const y = c2.getContext('2d');
    const gg = y.createLinearGradient(0, 0, 0, size); gg.addColorStop(0, '#d8287f'); gg.addColorStop(1, '#ff9a3c'); y.fillStyle = gg; y.fillRect(0, 0, size, size);
    y.fillStyle = 'rgba(255,226,107,.6)'; y.beginPath(); y.arc(size * 0.5, size * 0.54, size * 0.38, 0, 7); y.fill();
    const sh = bC.h * 0.79, sw = bC.w; let esc = (size * 0.84) / sh; if (sw * esc > size * 0.86) esc = size * 0.86 / sw; // 0,79 = hasta donde termina el vaso (con el cholado «Mermelada»)
    y.drawImage(iC, bC.x, bC.y, sw, sh, size / 2 - sw * esc / 2, size * 0.93 - sh * esc, sw * esc, sh * esc);
    return c2.toDataURL('image/png');
  }
  window.__salida = { 'compartir.jpg': jpg, 'icono-512.png': icono(512), 'icono-192.png': icono(192), 'apple-touch-icon.png': icono(180), 'favicon-32.png': icono(32) };
}
