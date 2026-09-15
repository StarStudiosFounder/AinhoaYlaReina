/* Prueba de la lógica del reproductor sin navegador.
   Se ejecuta con:  node test-reproductor.js   (no forma parte de la web) */
const fs = require('fs');

// Cargamos el CONFIG real y lo colgamos de global para que sea visible
eval(fs.readFileSync('../juego-saw/js/config.js', 'utf8').replace('const CONFIG', 'global.CONFIG'));

// Extraemos solo las funciones puras (esc, extraerYouTubeId, crearReproductor,
// videoActual, videoReproduciendose) sin ejecutar el resto del juego.
const src = fs.readFileSync('../juego-saw/js/app.js', 'utf8');
const ini = src.indexOf('function esc(s)');
const fin = src.indexOf('/* ------------------------------------------------------------------\n   INFO DEL SISTEMA');
eval(src.slice(ini, fin));

let estado = { fase: 'video' };
let fallos = 0;
const chk = (cond, msg) => { console.log('  ' + (cond ? '✓' : '✗') + ' ' + msg); if (!cond) fallos++; };

console.log('\n=== 1. HTML que genera el reproductor para un archivo local ===');
const html = crearReproductor('videos/prueba-1.mp4');
console.log('  ' + html);
chk(html.includes('autoplay'),              'lleva autoplay (arranca solo)');
chk(html.includes('preload="auto"'),        'lleva preload="auto" (carga rápida)');
chk(html.includes('controls'),              'conserva controls (reproductor completo)');
chk(!html.includes('muted'),                'NO lleva muted (se oye el vídeo)');
chk(html.includes('playsinline'),           'conserva playsinline (móvil)');
chk(!html.includes('loop'),                 'sin loop (videoBucle está en false)');

console.log('\n=== 2. Opciones de config respetadas ===');
CONFIG.videoAutoplay = false;
chk(!crearReproductor('videos/x.mp4').includes('autoplay'), 'videoAutoplay:false quita el autoplay');
CONFIG.videoAutoplay = true;
CONFIG.videoBucle = true;
chk(crearReproductor('videos/x.mp4').includes('loop'), 'videoBucle:true añade loop');
CONFIG.videoBucle = false;
CONFIG.videoPrecarga = 'metadata';
chk(crearReproductor('videos/x.mp4').includes('preload="metadata"'), 'videoPrecarga se aplica');
CONFIG.videoPrecarga = 'auto';

console.log('\n=== 3. videoReproduciendose() según el estado real del vídeo ===');
const casos = [
  ['reproduciendo',   { paused:false, ended:false, readyState:4 }, true ],
  ['en pausa',        { paused:true,  ended:false, readyState:4 }, false ],
  ['terminado',       { paused:true,  ended:true,  readyState:4 }, false ],
  ['aún sin cargar',  { paused:false, ended:false, readyState:0 }, false ],
  ['sin vídeo en DOM', null,                                       false ],
];
for (const [nombre, v, esperado] of casos) {
  global.document = { querySelector: s => (s === '.marco-video video' ? v : null) };
  chk(videoReproduciendose() === esperado, nombre.padEnd(18) + '-> ' + esperado);
}

console.log('\n=== 4. Interruptor de seguridad ===');
global.document = { querySelector: () => ({ paused:false, ended:false, readyState:4 }) };
CONFIG.videoBloquearEfectos = false;
chk(videoReproduciendose() === false, 'videoBloquearEfectos:false desactiva el bloqueo');
CONFIG.videoBloquearEfectos = true;
chk(videoReproduciendose() === true,  'videoBloquearEfectos:true  lo vuelve a activar');

console.log('\n=== 5. Nada más se ha roto ===');
chk(crearReproductor('').includes('video-vacio'), 'vídeo vacío sigue mostrando el aviso');
chk(crearReproductor('https://youtu.be/aqz-KE-bpKQ').includes('youtube.com/embed'),
    'YouTube sigue funcionando (con autoplay)');
chk(crearReproductor('https://vimeo.com/12345').includes('player.vimeo.com'),
    'Vimeo sigue funcionando');
chk(esc('<b>"x"</b>') === '&lt;b&gt;&quot;x&quot;&lt;/b&gt;', 'esc() intacto');
chk(extraerYouTubeId('videos/prueba-1.mp4') === null,
    'una ruta local NO se confunde con un ID de YouTube');

console.log('\n' + (fallos === 0 ? '✅ TODAS LAS PRUEBAS CORRECTAS' : '❌ ' + fallos + ' FALLOS') + '\n');
process.exit(fallos === 0 ? 0 : 1);
