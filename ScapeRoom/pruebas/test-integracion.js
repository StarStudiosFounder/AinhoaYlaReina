/* Prueba de integración con DOM real (jsdom).
   Math.random fijado a 0 -> los temporizadores de cada bucle tienen una
   duración única y reconocible:
     fantasma 10000 · glitch 6000 · terror 20000 · temblor 35000 · inactividad 30000  */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const tick = () => new Promise(r => setImmediate(r));

(async () => {
const silenciosa = new VirtualConsole();           // sin ruido de "not implemented"
const htmlLimpio = fs.readFileSync('../juego-saw/index.html', 'utf8')
  .replace(/<script src="[^"]*"><\/script>/g, '');
const dom = new JSDOM(htmlLimpio, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: silenciosa
});
const w = dom.window, d = w.document;
const $ = s => d.querySelector(s);
const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const injectar = code => { const s = d.createElement('script'); s.textContent = code; d.body.appendChild(s); };

/* --- temporizadores capturados, para dispararlos a mano --- */
const T = [];
w.setTimeout = (fn, ms) => { T.push({ fn, ms }); return T.length; };
w.clearTimeout = () => {};
w.setInterval = () => 0;
w.clearInterval = () => {};
w.Math.random = () => 0;

/* --- jsdom no reproduce vídeo: simulamos el reproductor --- */
let BLOQUEAR_AUTOPLAY = false;
const P = w.HTMLMediaElement.prototype;
Object.defineProperty(P, 'paused', {
  get() { return this._paused !== false; }, set(v) { this._paused = !!v; }, configurable: true
});
Object.defineProperty(P, 'readyState', { get() { return 4; }, configurable: true });
P.play  = function () {
  if (BLOQUEAR_AUTOPLAY) return Promise.reject(new Error('NotAllowedError'));
  this._paused = false; this.ended = false;
  return Promise.resolve();
};
P.pause = function () { this._paused = true; };
P.load  = function () {};
if (typeof w.matchMedia !== 'function') {
  w.matchMedia = q => ({ matches: false, media: q, onchange: null,
    addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){},
    dispatchEvent(){ return false; } });
}

/* --- arrancamos la web tal y como lo haría el navegador --- */
injectar(fs.readFileSync('../juego-saw/js/config.js', 'utf8'));
injectar(fs.readFileSync('../juego-saw/js/app.js', 'utf8'));
injectar('window.__C = CONFIG; window.__irA = irA;');

const FANT = 10000, GLITCH = 6000, TEMBLOR = 35000;
const correr = ms => {
  const i = T.map((t, k) => ({ t, k })).filter(o => o.t.ms === ms).pop();
  if (!i) return false;
  T.splice(i.k, 1); i.t.fn(); return true;
};

let fallos = 0;
const chk = (c, m) => { console.log('  ' + (c ? '✓' : '✗') + ' ' + m); if (!c) fallos++; };

console.log('\n=== 0. Los dos <script> comparten ámbito ===');
chk(w.__C && typeof w.__C === 'object', 'const CONFIG de config.js es visible desde app.js');
chk(typeof w.__irA === 'function',      'las funciones de app.js quedan globales');

console.log('\n=== 1. Age gate: aviso de una línea ===');
chk($('#btn-comenzar') === null,        'la portada NO aparece todavía');
chk($('#btn-aceptar') !== null,         'aparece la pantalla de advertencia');
chk($('.aviso-linea') !== null,                'con una única línea de aviso');
chk($('.aviso-linea').textContent === w.__C.advertencia.texto,
                                        'y es exactamente el texto configurado');
chk(d.querySelectorAll('.aviso-bloque').length === 0, 'sin parrafadas que corten el rollo');
chk($('#hud').classList.contains('oculto'), 'el HUD queda oculto durante el aviso');

console.log('\n=== 2. Age gate: sin sustos antes de empezar ===');
correr(FANT); correr(GLITCH); correr(TEMBLOR);
chk(!$('#fantasma').classList.contains('visible'), 'el fantasma no dispara en la pantalla de aviso');
chk(!d.body.classList.contains('glitch'),          'ni el glitch');
chk(!d.body.classList.contains('temblando'),       'ni los temblores');

console.log('\n=== 3. Age gate: placa PEGI 18 ===');
clic($('#btn-aceptar'));
chk($('.pegi-img') !== null,                          'tras aceptar aparece la placa');
chk($('.pegi-img').getAttribute('src').includes('pegi18'), 'apunta a img/pegi18.svg');
chk(!!d.querySelector('audio, .pegi-marco'),          'se monta el marco con el audio');
correr(1000);   // dejan pasar el segundo de cortesía
chk($('#btn-saltar-pegi').style.visibility === 'visible', 'al segundo aparece el botón SALTAR');
chk($('#hud').classList.contains('oculto'),           'el HUD sigue oculto en la placa');

console.log('\n=== 4. Portada ===');
clic($('#btn-saltar-pegi'));
chk($('#btn-comenzar') !== null, 'al saltar la placa llegamos a la portada');
const pre1 = [...d.querySelectorAll('video[data-url]')].map(v => v.getAttribute('data-url'));
chk(pre1[0] === 'videos/prueba-1.mp4', 'la prueba 1 ya se está descargando mientras leen  →  ' + pre1);
chk(!$('#hud').classList.contains('oculto') === false, 'el HUD aún está oculto en la portada');

console.log('\n=== 5. Al pulsar COMENZAR ===');
clic($('#btn-comenzar'));
const v1 = $('.marco-video video');
chk(!!v1,                                             'se crea el reproductor');
chk(v1.getAttribute('src') === 'videos/prueba-1.mp4', 'apunta al archivo local');
chk(v1.hasAttribute('autoplay'),                      'lleva autoplay');
chk(v1.getAttribute('preload') === 'auto',            'preload="auto" → carga rápida');
chk(v1.hasAttribute('controls'),                      'conserva todos los controles');
chk(!v1.hasAttribute('muted'),                        'entra con sonido');
chk(v1.paused === false,                              '▶ HA ARRANCADO SOLO, sin pulsar play');
chk(Math.abs(v1.volume - w.__C.videoVolumen) < 0.001, 'volumen bajo aplicado (' + v1.volume + ')');
chk(!$('#hud').classList.contains('oculto'),          'y el HUD ya es visible');

console.log('\n=== 6. Vídeo reproduciéndose → CERO interrupciones ===');
chk(correr(FANT),                                  '(disparamos el bucle del fantasma)');
chk(!$('#fantasma').classList.contains('visible'), 'el fantasma NO aparece');
correr(FANT);
chk(!$('#fantasma').classList.contains('visible'), 'tampoco en el 2º ciclo');
correr(GLITCH);
chk(!d.body.classList.contains('glitch'),          'ni el glitch de pantalla');
correr(TEMBLOR);
chk(!d.body.classList.contains('temblando'),       'ni los temblores');

console.log('\n=== 7. Vídeo en pausa → los sustos vuelven ===');
v1.pause();
correr(FANT);
chk($('#fantasma').classList.contains('visible'), 'el fantasma sí aparece');
chk($('#fantasma-img').getAttribute('src') !== '', 'con su imagen cargada');

console.log('\n=== 8. Interruptor videoBloquearEfectos:false ===');
w.__C.videoBloquearEfectos = false;
v1.paused = false;
$('#fantasma').classList.remove('visible');
correr(FANT);
chk($('#fantasma').classList.contains('visible'), 'desactivado, sale aunque el vídeo suene');
w.__C.videoBloquearEfectos = true;

console.log('\n=== 9. Plan B: el navegador bloquea el autoplay con sonido ===');
$('#fantasma').classList.remove('visible');
BLOQUEAR_AUTOPLAY = true;
clic($('#btn-ir-codigo'));
w.__irA('video', 1);
const v2 = $('.marco-video video');
chk(v2.getAttribute('src') === 'videos/prueba-2.mp4', 'avanza a la prueba 2');
await tick();
chk(v2.muted === true,                                'arranca en silencio antes que quedarse parado');
chk(!!$('.marco-video .aviso-sonido'),                'y avisa: "' + $('.aviso-sonido').textContent + '"');
BLOQUEAR_AUTOPLAY = false;
d.body.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
await tick();
chk(v2.muted === false,                               'al pulsar cualquier cosa recupera el sonido');
chk(!$('.aviso-sonido'),                              'y el aviso desaparece');

console.log('\n=== 10. Precalentado en cadena ===');
const prewarms = () => [...d.querySelectorAll('video[data-url]')].map(v => v.getAttribute('data-url'));
chk(prewarms().includes('videos/prueba-2.mp4'), 'la prueba 2 se descargó mientras escribían su código  →  ' + prewarms());
chk(prewarms().length === 1, 'solo se mantiene 1 vídeo en memoria a la vez');
w.__irA('codigo', 1);
chk(prewarms().includes('videos/prueba-3.mp4'), 'y la prueba 3 empieza a cargarse durante el código de la 2  →  ' + prewarms());
chk(prewarms().length === 1, 'el anterior se libera al sustituirlo');

console.log('\n=== 11. Menú estilo The Quarry (solo para probar) ===');
w.__irA('inicio');
chk($('#btn-menu') !== null,                          'la portada ofrece el botón MENÚ');
clic($('#btn-menu'));
chk($('#menu-quarry') !== null,                       'se abre el menú');
chk(d.querySelectorAll('#menu-quarry .quarry-seccion').length === 3,
                                                      'con Partida, Ajustes y Pruebas');
const sl = d.querySelector('#menu-quarry input[data-accion="vol-video"]');
sl.value = '0.6';
sl.dispatchEvent(new w.Event('input', { bubbles: true }));
chk(Math.abs(w.__C.videoVolumen - 0.6) < 0.001,       'el deslizador escribe en CONFIG al arrastrar');
chk(sl.parentNode.querySelector('output').textContent === '60', 'y el porcentaje se actualiza');
clic(d.querySelector('#menu-quarry [data-accion="etapa-2"]'));
chk($('#menu-quarry') === null,                       'al elegir una prueba se cierra el menú');
chk($('.marco-video video').getAttribute('src') === 'videos/prueba-3.mp4',
                                                      'y salta directo al vídeo 3');
w.__irA('inicio'); clic($('#btn-menu'));
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
chk($('#menu-quarry') === null,                       'ESC cierra el menú');

console.log('\n' + (fallos === 0 ? '✅ INTEGRACIÓN CORRECTA — todo funciona'
                                 : '❌ ' + fallos + ' FALLOS') + '\n');
process.exit(fallos === 0 ? 0 : 1);
})();
