/* Recorrido completo: portada -> 5 vídeos + 5 códigos -> final -> fin.
   Comprueba que nada lanza excepciones y que cada vídeo arranca solo. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('../juego-saw/index.html', 'utf8')
  .replace(/<script src="[^"]*"><\/script>/g, '');

let errores = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: new (require('jsdom').VirtualConsole)()
    .on('jsdomError', e => errores.push(e.message))
    .on('error', (...a) => errores.push(a.join(' ')))
});
const w = dom.window, d = w.document;
const $ = s => d.querySelector(s);

w.setTimeout = (fn, ms) => 0;      // no dejamos correr temporizadores largos
w.clearTimeout = () => {}; w.setInterval = () => 0; w.clearInterval = () => {};
const P = w.HTMLMediaElement.prototype;
Object.defineProperty(P, 'paused', { get(){ return this._paused !== false; },
                                     set(v){ this._paused = !!v; }, configurable:true });
Object.defineProperty(P, 'readyState', { get(){ return 4; }, configurable:true });
P.play = function(){ this._paused = false; return Promise.resolve(); };
P.pause = function(){ this._paused = true; };
P.load = function(){};
if (typeof w.matchMedia !== 'function')
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){},
                         addEventListener(){}, removeEventListener(){} });

const injectar = c => { const s = d.createElement('script'); s.textContent = c; d.body.appendChild(s); };
injectar(fs.readFileSync('../juego-saw/js/config.js', 'utf8'));
injectar(fs.readFileSync('../juego-saw/js/app.js', 'utf8'));
injectar('window.__irA = irA; window.__C = CONFIG;');

const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
const CODIGOS = w.__C.etapas.map(e => e.codigo);
let fallos = 0;
const chk = (c,m) => { console.log('  '+(c?'✓':'✗')+' '+m); if(!c) fallos++; };

console.log('\n=== Age gate ===');
chk($('#btn-aceptar') !== null, 'aviso inicial presente');
clic($('#btn-aceptar'));
chk($('.pegi-img') !== null, 'placa PEGI presente');
clic($('#btn-saltar-pegi'));

console.log('\n=== Recorrido completo del juego ===');
chk($('#btn-comenzar') !== null, 'portada');
clic($('#btn-comenzar'));

for (let i = 0; i < CODIGOS.length; i++){
  const v = $('.marco-video video');
  chk(!!v && v.getAttribute('src') === 'videos/prueba-' + (i+1) + '.mp4',
      'etapa ' + (i+1) + ': vídeo ' + (v ? v.getAttribute('src') : '—'));
  chk(v && v.paused === false, 'etapa ' + (i+1) + ': arrancó solo');
  clic($('#btn-ir-codigo'));
  chk(!!$('#input-codigo'), 'etapa ' + (i+1) + ': pantalla de código');
  $('#input-codigo').value = CODIGOS[i].toLowerCase();   // en minúsculas a propósito
  d.getElementById('form-codigo').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  chk(!d.getElementById('overlay-error').classList.contains('visible'),
      'etapa ' + (i+1) + ': código "' + CODIGOS[i] + '" aceptado (ignorando mayúsculas)');
  w.__irA('video', i+1 < CODIGOS.length ? i+1 : 0);      // el avance real va con setTimeout
}

w.__irA('final');
chk($('.titulo-principal').textContent === w.__C.tituloFinal, 'pantalla final');
w.__irA('fin');
chk($('.titulo-principal').textContent === w.__C.tituloFin, 'pantalla de fin');

console.log('\n=== Errores lanzados por la página ===');
chk(errores.length === 0, errores.length ? errores.join(' | ') : 'ninguno');

console.log('\n' + (fallos===0 && errores.length===0
  ? '✅ RECORRIDO COMPLETO SIN ERRORES' : '❌ ' + fallos + ' FALLOS') + '\n');
process.exit(fallos===0 && errores.length===0 ? 0 : 1);
