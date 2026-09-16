/* ==================================================================
   🚫  A PARTIR DE AQUÍ NO HACE FALTA TOCAR NADA
   ================================================================== */

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function extraerYouTubeId(url){
  if (!url) return null;
  const u = String(url).trim();
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
  return null;
}
function crearReproductor(url){
  if (!url || !String(url).trim()){
    return '<div class="video-vacio">SIN VÍDEO CONFIGURADO<br>(edita CONFIG en el archivo)</div>';
  }
  const u = String(url).trim();
  const yt = extraerYouTubeId(u);
  if (yt){
    return '<iframe src="https://www.youtube.com/embed/' + yt + '?rel=0&modestbranding=1&autoplay=1" ' +
           'title="Vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; ' +
           'gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
  }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm){
    return '<iframe src="https://player.vimeo.com/video/' + vm[1] + '?autoplay=1" ' +
           'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
  }
  /* 🎬 Archivo local → reproductor nativo del navegador */
  const auto  = (CONFIG.videoAutoplay === false) ? '' : ' autoplay';
  const bucle = CONFIG.videoBucle ? ' loop' : '';
  const carga = CONFIG.videoPrecarga || 'auto';
  return '<video src="' + esc(u) + '" controls playsinline' + auto + bucle +
         ' preload="' + esc(carga) + '"></video>';
}

/* ==================================================================
   🎬  AUTOPLAY + CARGA RÁPIDA DEL VÍDEO
   ================================================================== */

function videoActual(){
  return document.querySelector('.marco-video video');
}

/* ¿Hay un vídeo reproduciéndose AHORA MISMO?
   Se usa para pausar las apariciones aleatorias mientras se ve la grabación. */
function videoReproduciendose(){
  if (CONFIG.videoBloquearEfectos === false) return false;
  const v = videoActual();
  if (v) return !v.paused && !v.ended && v.readyState > 0;
  /* Con iframe (YouTube/Vimeo) no se puede saber si suena,
     así que se da por bueno mientras estemos en la pantalla del vídeo. */
  if (estado.fase === 'video' && document.querySelector('.marco-video iframe')) return true;
  return false;
}

/* Arranca el vídeo solo. Si el navegador bloquea el autoplay CON sonido,
   lo arranca en silencio (para que nunca se quede parado) y avisa para
   recuperar el audio con el primer clic o tecla. */
function limitar(v, porDefecto){
  const n = (typeof v === 'number' && isFinite(v)) ? v : porDefecto;
  return Math.max(0, Math.min(1, n));
}

function arrancarVideo(){
  const v = videoActual();
  if (!v || CONFIG.videoAutoplay === false) return;
  if (v.getAttribute('data-arrancado') === '1') return;
  v.setAttribute('data-arrancado', '1');
  v.volume = limitar(CONFIG.videoVolumen, 0.25);   // 🔉 volumen bajo

  const intentar = function(){
    let p;
    try { p = v.play(); } catch(e){ return; }
    if (!p || !p.catch) return;
    p.catch(function(){
      v.muted = true;
      let p2;
      try { p2 = v.play(); } catch(e){ return; }
      if (p2 && p2.catch) p2.catch(function(){});
      avisarSonidoBloqueado(v);
    });
  };

  intentar();
  v.addEventListener('loadeddata', function(){ if (v.paused) intentar(); }, { once:true });
  v.addEventListener('canplay',    function(){ if (v.paused) intentar(); }, { once:true });
}

function avisarSonidoBloqueado(v){
  const marco = v.closest ? v.closest('.marco-video') : null;
  if (!marco || marco.querySelector('.aviso-sonido')) return;

  const aviso = document.createElement('div');
  aviso.className = 'aviso-sonido';
  aviso.textContent = '🔇 PULSA PARA ACTIVAR EL SONIDO';
  marco.appendChild(aviso);

  let cerrado = false;
  const cerrar = function(){
    if (cerrado) return;
    cerrado = true;
    if (aviso.parentNode) aviso.parentNode.removeChild(aviso);
    document.removeEventListener('click',   alPulsar, true);
    document.removeEventListener('keydown', alPulsar, true);
    document.removeEventListener('touchstart', alPulsar, true);
  };
  const alPulsar = function(){
    cerrar();
    v.muted = false;
    let p; try { p = v.play(); } catch(e){ return; }
    if (p && p.catch) p.catch(function(){});
  };

  document.addEventListener('click',      alPulsar, true);
  document.addEventListener('keydown',    alPulsar, true);
  document.addEventListener('touchstart', alPulsar, true);

  /* Si el usuario quita el silencio con los controles del vídeo,
     o si el vídeo termina, retiramos el aviso. */
  v.addEventListener('volumechange', function(){ if (!v.muted) cerrar(); }, { once:true });
  v.addEventListener('ended', cerrar, { once:true });
  setTimeout(cerrar, 15000);
}

/* ------------------------------------------------------------------
   ⚡  PRECALENTAR EL VÍDEO SIGUIENTE
   Mientras se escribe el código, el navegador va descargando la
   grabación de la siguiente etapa para que aparezca al instante.
   ------------------------------------------------------------------ */
let precalentador = null;

function precalentarVideo(url){
  if (CONFIG.videoPrecalentarSiguiente === false) return;
  if (!url || !String(url).trim()) return;
  const u = String(url).trim();
  if (extraerYouTubeId(u) || /vimeo\.com/.test(u)) return;   // solo archivos locales
  if (precalentador && precalentador.getAttribute('data-url') === u) return;
  try{
    if (precalentador && precalentador.parentNode){
      precalentador.removeAttribute('src');
      precalentador.parentNode.removeChild(precalentador);
    }
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.playsInline = true;
    v.tabIndex = -1;
    v.setAttribute('aria-hidden', 'true');
    v.setAttribute('data-url', u);
    v.setAttribute('style',
      'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;' +
      'opacity:0;pointer-events:none;z-index:-1;');
    v.src = u;
    document.body.appendChild(v);
    precalentador = v;
  }catch(e){}
}

function liberarPrecalentador(){
  if (!precalentador) return;
  try{
    precalentador.removeAttribute('src');
    if (precalentador.parentNode) precalentador.parentNode.removeChild(precalentador);
  }catch(e){}
  precalentador = null;
}

/* ------------------------------------------------------------------
   INFO DEL SISTEMA
   ------------------------------------------------------------------ */
const SystemInfo = {
  battery: null,
  geo: null,

  iniciar(){
    this.actualizarReloj();
    setInterval(() => this.actualizarReloj(), 1000);

    if (navigator.getBattery){
      navigator.getBattery().then(b => {
        this.battery = b;
        this.actualizarBateria();
        b.addEventListener('levelchange', () => this.actualizarBateria());
        b.addEventListener('chargingchange', () => this.actualizarBateria());
      }).catch(() => {
        const el = document.getElementById('sys-bateria');
        if (el) el.textContent = 'N/D';
      });
    } else {
      const el = document.getElementById('sys-bateria');
      if (el) el.textContent = 'N/D';
    }

    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);
          const el = document.getElementById('sys-lugar');
          if (el) el.textContent = lat + ', ' + lon;
        },
        () => {
          const el = document.getElementById('sys-lugar');
          if (el) el.textContent = 'SIN ACCESO';
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
      );
    } else {
      const el = document.getElementById('sys-lugar');
      if (el) el.textContent = 'N/D';
    }
  },

  actualizarReloj(){
    const ahora = new Date();
    const dos = n => String(n).padStart(2, '0');
    const hora = dos(ahora.getHours()) + ':' + dos(ahora.getMinutes()) + ':' + dos(ahora.getSeconds());
    const dia = dos(ahora.getDate()) + '/' + dos(ahora.getMonth()+1) + '/' + ahora.getFullYear();
    const elH = document.getElementById('sys-hora');
    const elF = document.getElementById('sys-fecha');
    if (elH) elH.textContent = hora;
    if (elF) elF.textContent = dia;
  },

  actualizarBateria(){
    const el = document.getElementById('sys-bateria');
    if (!el) return;
    if (!this.battery){
      el.textContent = 'N/D';
      return;
    }
    const pct = Math.round(this.battery.level * 100);
    const cargando = this.battery.charging ? ' ⚡' : '';
    el.textContent = pct + '%' + cargando;
    if (pct <= 15){
      el.style.color = '#ff2b2b';
    } else if (pct <= 30){
      el.style.color = '#ffaa00';
    } else {
      el.style.color = '#e8e8e8';
    }
  }
};

const Sonido = {
  ctx:null, activo:true, silencioso:false, ambiente:null,
  melodiaTimer:null,

  iniciar(){
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch(e){ this.ctx = null; }
  },
  reanudar(){ if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  ambienteOn(){
    if (!this.ctx || this.ambiente || !this.activo || this.silencioso) return;
    const t = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(0.045, t + 4);
    master.connect(this.ctx.destination);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass'; filtro.frequency.value = 240; filtro.Q.value = 4;
    filtro.connect(master);
    const o1 = this.ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
    const o2 = this.ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.6;
    o1.connect(filtro); o2.connect(filtro); o1.start(); o2.start();
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain); lfoGain.connect(master.gain); lfo.start();
    this.ambiente = { master, o1, o2, lfo };
  },
  ambienteOff(){
    if (!this.ambiente) return;
    const a = this.ambiente; this.ambiente = null;
    try{
      const t = this.ctx.currentTime;
      a.master.gain.cancelScheduledValues(t);
      a.master.gain.setValueAtTime(a.master.gain.value, t);
      a.master.gain.linearRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => { try{ a.o1.stop(); a.o2.stop(); a.lfo.stop(); }catch(e){} }, 800);
    }catch(e){}
  },

  melodiaOn(){
    if (!this.ctx || this.melodiaTimer || !this.activo || this.silencioso) return;
    const self = this;
    const tocar = () => {
      if (!self.ctx || !self.activo || self.silencioso) return;
      try{
        const t = self.ctx.currentTime;
        const notas = [
          { f: 523.25, t: 0.00 },
          { f: 622.25, t: 0.55 },
          { f: 415.30, t: 1.10 },
          { f: 466.16, t: 1.65 }
        ];
        notas.forEach(n => {
          const o = self.ctx.createOscillator();
          const g = self.ctx.createGain();
          const filtro = self.ctx.createBiquadFilter();
          filtro.type = 'lowpass'; filtro.frequency.value = 1400;
          o.type = 'triangle';
          o.frequency.setValueAtTime(n.f, t + n.t);
          g.gain.setValueAtTime(0.0001, t + n.t);
          g.gain.linearRampToValueAtTime(0.032, t + n.t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + n.t + 1.4);
          o.connect(filtro); filtro.connect(g); g.connect(self.ctx.destination);
          o.start(t + n.t); o.stop(t + n.t + 1.6);
        });
      }catch(e){}
    };
    tocar();
    const intervalo = CONFIG.melodiaIntervaloMs || 12000;
    this.melodiaTimer = setInterval(tocar, intervalo);
  },
  melodiaOff(){
    if (this.melodiaTimer){ clearInterval(this.melodiaTimer); this.melodiaTimer = null; }
  },

  puerta(){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
      g.gain.setValueAtTime(0.45, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 0.55);

      const n = Math.floor(this.ctx.sampleRate * 0.15);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/2000);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 800;
      const gg = this.ctx.createGain(); gg.gain.value = 0.5;
      src.connect(f); f.connect(gg); gg.connect(this.ctx.destination); src.start(t);
    }catch(e){}
  },

  grito(){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t = this.ctx.currentTime;
      const dur = 1.6;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let v = 0;
      for (let i = 0; i < n; i++){
        v = v * 0.85 + (Math.random()*2-1) * 0.15;
        d[i] = v;
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.linearRampToValueAtTime(1400, t + 0.3);
      f.frequency.linearRampToValueAtTime(500, t + dur);
      f.Q.value = 6;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.20, t + 0.15);
      g.gain.linearRampToValueAtTime(0.14, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.ctx.destination);
      src.start(t); src.stop(t + dur + 0.1);
    }catch(e){}
  },

  gritoFuerte(){
    if (!this.ctx || !this.activo) return;
    try{
      const t = this.ctx.currentTime;
      const dur = 0.9;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++){
        const env = Math.exp(-i/(n*0.5));
        d[i] = (Math.random()*2-1) * env;
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2;
      const g = this.ctx.createGain(); g.gain.value = 0.5;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start(t);

      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(2400, t);
      o.frequency.exponentialRampToValueAtTime(800, t + 0.6);
      og.gain.setValueAtTime(0.15, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(og); og.connect(this.ctx.destination);
      o.start(t); o.stop(t + 0.8);

      const og2 = this.ctx.createOscillator();
      const og2g = this.ctx.createGain();
      og2.type = 'sine';
      og2.frequency.setValueAtTime(80, t + 0.05);
      og2.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      og2g.gain.setValueAtTime(0.35, t + 0.05);
      og2g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      og2.connect(og2g); og2g.connect(this.ctx.destination);
      og2.start(t + 0.05); og2.stop(t + 0.65);
    }catch(e){}
  },

  pasos(){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t0 = this.ctx.currentTime;
      for (let k = 0; k < 4; k++){
        const t = t0 + k * 0.45;
        const n = Math.floor(this.ctx.sampleRate * 0.1);
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/400);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 350;
        const g = this.ctx.createGain(); g.gain.value = 0.15;
        src.connect(f); f.connect(g); g.connect(this.ctx.destination);
        src.start(t);
      }
    }catch(e){}
  },

  crujido(){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t = this.ctx.currentTime;
      const dur = 0.5;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++){
        const env = Math.sin(Math.PI * (i/n));
        d[i] = (Math.random()*2-1) * env * 0.5;
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 8;
      const g = this.ctx.createGain(); g.gain.value = 0.12;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start(t);
    }catch(e){}
  },

  latido(){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t = this.ctx.currentTime;
      const tocar = (t0, vol) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(70, t0);
        o.frequency.exponentialRampToValueAtTime(40, t0 + 0.15);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t0); o.stop(t0 + 0.3);
      };
      tocar(t, 0.25);
      tocar(t + 0.28, 0.18);
    }catch(e){}
  },

  respiracion(){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t = this.ctx.currentTime;
      const dur = 3.2;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let b0=0,b1=0,b2=0;
      for (let i=0;i<n;i++){
        const w = Math.random()*2-1;
        b0 = 0.99*b0 + w*0.05;
        b1 = 0.96*b1 + w*0.10;
        b2 = 0.85*b2 + w*0.20;
        d[i] = b0 + b1 + b2;
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 1.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.55);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.15);
      g.gain.linearRampToValueAtTime(0.075, t + 1.75);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.55);
      g.gain.linearRampToValueAtTime(0.06,  t + 2.85);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.ctx.destination);
      src.start(t); src.stop(t + dur + 0.1);
    }catch(e){}
  },

  tono(freq, dur, tipo, vol, slideTo){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    }catch(e){}
  },
  estatica(dur){
    if (!this.ctx || !this.activo || this.silencioso) return;
    try{
      dur = dur || 0.25;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random()*2 - 1) * (1 - i/n);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start();
    }catch(e){}
  },
  clic(){ this.tono(320, 0.07, 'square', 0.06); },
  exito(){ this.tono(180, 0.5, 'sine', 0.14, 720);
    setTimeout(() => this.tono(540, 0.6, 'triangle', 0.09, 1080), 130); },
  error(){ this.tono(90, 0.75, 'sawtooth', 0.16, 42); this.estatica(0.3); },

  risa(){
    if (!this.ctx || !this.activo) return;
    try{
      const ahora = this.ctx.currentTime;
      const notas = [
        {f:340,t:0.00},{f:320,t:0.17},{f:300,t:0.33},{f:280,t:0.48},{f:260,t:0.62},
        {f:240,t:0.76},{f:220,t:0.90},{f:200,t:1.04},{f:185,t:1.18},{f:170,t:1.32}
      ];
      const rumble = this.ctx.createOscillator();
      const rGain = this.ctx.createGain();
      rumble.type = 'sawtooth';
      rumble.frequency.setValueAtTime(60, ahora);
      rumble.frequency.linearRampToValueAtTime(35, ahora + 1.6);
      rGain.gain.setValueAtTime(0.0001, ahora);
      rGain.gain.linearRampToValueAtTime(0.06, ahora + 0.15);
      rGain.gain.linearRampToValueAtTime(0.0001, ahora + 1.7);
      rumble.connect(rGain); rGain.connect(this.ctx.destination);
      rumble.start(ahora); rumble.stop(ahora + 1.8);
      notas.forEach(n => {
        const t = ahora + n.t;
        const o1 = this.ctx.createOscillator(); const o2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o1.type = 'sawtooth'; o2.type = 'square';
        o1.frequency.setValueAtTime(n.f, t);
        o2.frequency.setValueAtTime(n.f * 1.012, t);
        const lfo = this.ctx.createOscillator(); const lfoG = this.ctx.createGain();
        lfo.frequency.value = 28; lfoG.gain.value = 9;
        lfo.connect(lfoG); lfoG.connect(o1.frequency);
        lfo.start(t); lfo.stop(t + 0.16);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.085, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o1.connect(g); o2.connect(g); g.connect(this.ctx.destination);
        o1.start(t); o1.stop(t + 0.17); o2.start(t); o2.stop(t + 0.17);
      });
      setTimeout(() => this.estatica(0.5), 1500);
    }catch(e){}
  },

  errorSistema(){
    if (!this.ctx || !this.activo) return;
    try{
      this.tono(1200, 0.15, 'square', 0.15);
      setTimeout(() => this.tono(900, 0.15, 'square', 0.14), 170);
      setTimeout(() => this.tono(600, 0.35, 'square', 0.13), 340);
      this.estatica(0.4);
    }catch(e){}
  },

  caraSaw(){
    if (!this.ctx || !this.activo) return;
    try{
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 1.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.15);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + 1.7);

      const og2 = this.ctx.createOscillator();
      const og2g = this.ctx.createGain();
      og2.type = 'sine';
      og2.frequency.setValueAtTime(120, t);
      og2.frequency.exponentialRampToValueAtTime(35, t + 0.5);
      og2g.gain.setValueAtTime(0.4, t);
      og2g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      og2.connect(og2g); og2g.connect(this.ctx.destination);
      og2.start(t); og2.stop(t + 0.75);

      const n = Math.floor(this.ctx.sampleRate * 1.4);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++){
        d[i] = (Math.random()*2-1) * Math.exp(-i/(n*0.8));
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3;
      const gg = this.ctx.createGain(); gg.gain.value = 0.12;
      src.connect(f); f.connect(gg); gg.connect(this.ctx.destination); src.start(t);
    }catch(e){}
  },

  cristalRoto(){
    if (!this.ctx || !this.activo) return;
    try{
      const t = this.ctx.currentTime;
      const dur = 0.7;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++){
        const env = Math.exp(-i / (n * 0.25));
        d[i] = (Math.random()*2-1) * env;
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 2200;
      const g = this.ctx.createGain(); g.gain.value = 0.4;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination);
      src.start(t);

      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.6);
      og.gain.setValueAtTime(0.35, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(og); og.connect(this.ctx.destination);
      o.start(t); o.stop(t + 0.85);

      for (let k = 0; k < 7; k++){
        const tk = t + 0.05 + Math.random() * 0.45;
        const nn = Math.floor(this.ctx.sampleRate * 0.04);
        const bb = this.ctx.createBuffer(1, nn, this.ctx.sampleRate);
        const dd = bb.getChannelData(0);
        for (let i = 0; i < nn; i++) dd[i] = (Math.random()*2-1) * Math.exp(-i/(nn*0.3));
        const ss = this.ctx.createBufferSource(); ss.buffer = bb;
        const ff = this.ctx.createBiquadFilter();
        ff.type = 'highpass'; ff.frequency.value = 3000 + Math.random()*1500;
        const gg = this.ctx.createGain(); gg.gain.value = 0.15;
        ss.connect(ff); ff.connect(gg); gg.connect(this.ctx.destination);
        ss.start(tk);
      }

      setTimeout(() => this.estatica(0.4), 400);
    }catch(e){}
  }
};

const MusicaFondo = {
  audio: null,
  activa: false,
  crear(){
    if (!CONFIG.musicaFondo || !String(CONFIG.musicaFondo).trim()) return;
    if (this.audio) return;
    try{
      this.audio = new Audio(CONFIG.musicaFondo);
      this.audio.loop = true;
      this.audio.volume = 0.35;
      this.audio.preload = 'auto';
    }catch(e){ this.audio = null; }
  },
  reproducir(){
    if (!estado.sonido) return;
    if (this.audio){
      this.audio.volume = 0.35;
      const p = this.audio.play();
      if (p && p.catch) p.catch(()=>{});
    } else {
      Sonido.melodiaOn();
    }
    this.activa = true;
  },
  pausar(){
    if (this.audio){ this.audio.pause(); }
    else { Sonido.melodiaOff(); }
    this.activa = false;
  },
  parar(){
    if (this.audio){ this.audio.pause(); this.audio.currentTime = 0; }
    Sonido.melodiaOff();
    this.activa = false;
  }
};

const CLAVE_GUARDADO = 'escapeSaw_v1';
let estado = {
  iniciado:false, fase:faseInicial(), etapa:0, segundos:0,
  sonido: CONFIG.sonidoActivoPorDefecto,
  temporizador: CONFIG.temporizador.activo
};
let intervaloTemporizador = null;

let intentosFallidos = 0;
let ultimaEtapaSonido = -1;

function guardar(){}
function cargar(){ try{ localStorage.removeItem(CLAVE_GUARDADO); }catch(e){} }
function borrarGuardado(){ try{ localStorage.removeItem(CLAVE_GUARDADO); }catch(e){} }

function formatearTiempo(s){
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sg = s%60;
  const dos = n => String(n).padStart(2,'0');
  return h > 0 ? (dos(h)+':'+dos(m)+':'+dos(sg)) : (dos(m)+':'+dos(sg));
}
function actualizarReloj(){
  const el = document.getElementById('temporizador');
  if (!el) return;
  if (!CONFIG.temporizador.activo || !estado.temporizador){ el.style.display = 'none'; return; }
  el.style.display = '';
  let texto, aviso = false;
  if (CONFIG.temporizador.modo === 'cronometro'){
    texto = formatearTiempo(estado.segundos);
  } else {
    const restante = (CONFIG.temporizador.minutos * 60) - estado.segundos;
    texto = formatearTiempo(restante);
    const umbral = (CONFIG.temporizador.avisoUltimosMinutos || 5) * 60;
    if (restante <= umbral) aviso = true;
  }
  el.textContent = texto;
  el.classList.toggle('aviso', aviso);
}
function arrancarIntervalo(){
  if (intervaloTemporizador) return;
  intervaloTemporizador = setInterval(() => {
    if (!estado.iniciado) return;
    estado.segundos++;
    actualizarReloj();
  }, 1000);
}

function irA(fase, etapa){
  estado.fase = fase;
  if (typeof etapa === 'number') estado.etapa = etapa;
  render();
}
function render(){
  actualizarHUD(); actualizarReloj();
  const faseSilencio = (estado.fase === 'video' || estado.fase === 'fin');
  Sonido.silencioso = faseSilencio;
  if (faseSilencio){
    Sonido.ambienteOff();
    MusicaFondo.pausar();
  } else if (estado.iniciado && estado.sonido){
    Sonido.ambienteOn();
    MusicaFondo.reproducir();
  }
  switch (estado.fase){
    case 'aviso':  return pintarAviso();
    case 'pegi':   return pintarPegi();
    case 'inicio': return pintarInicio();
    case 'video':  return pintarVideo();
    case 'codigo': return pintarCodigo();
    case 'final':  return pintarFinal();
    case 'fin':    return pintarFin();
    default: estado.fase = 'inicio'; return pintarInicio();
  }
}
function actualizarHUD(){
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.classList.toggle('oculto',
    estado.fase === 'inicio' || estado.fase === 'aviso' || estado.fase === 'pegi');
  const btnSonido = document.getElementById('btn-sonido');
  const btnTiempo = document.getElementById('btn-tiempo');
  btnSonido.classList.toggle('activo', !!estado.sonido);
  btnTiempo.classList.toggle('activo', !!estado.temporizador);
  btnTiempo.style.display = CONFIG.temporizador.activo ? '' : 'none';
}

const app = document.getElementById('app');

/* ==================================================================
   ⚠️  AVISO INICIAL Y PLACA PEGI 18
   Flujo: AVISO -> PLACA (imagen + audio) -> PORTADA
   ================================================================== */

function faseInicial(){
  if (CONFIG.advertencia && CONFIG.advertencia.activa !== false) return 'aviso';
  if (CONFIG.pegi && CONFIG.pegi.activa !== false) return 'pegi';
  return 'inicio';
}

function irTrasAviso(){
  irA((CONFIG.pegi && CONFIG.pegi.activa !== false) ? 'pegi' : 'inicio');
}

function pintarAviso(){
  const A = CONFIG.advertencia || {};
  app.innerHTML =
    '<section class="pantalla pantalla--aviso">' +
      '<p class="aviso-linea">' + esc(A.texto || '') + '</p>' +
      '<button class="btn btn--grande" id="btn-aceptar" type="button">' +
        esc(A.textoBotonAceptar || 'ENTRAR') +
      '</button>' +
    '</section>';

  document.getElementById('btn-aceptar').addEventListener('click', function(){
    Sonido.clic();
    irTrasAviso();
  });
}

/* --- placa PEGI 18 ------------------------------------------------ */
let pegiTimers = null;

function limpiarPegi(){
  if (!pegiTimers) return;
  clearTimeout(pegiTimers.mostrar);
  clearTimeout(pegiTimers.maximo);
  clearTimeout(pegiTimers.sinAudio);
  if (pegiTimers.audio){ try{ pegiTimers.audio.pause(); }catch(e){} }
  pegiTimers = null;
}

function pintarPegi(){
  const P = CONFIG.pegi || {};
  limpiarPegi();

  app.innerHTML =
    '<section class="pantalla pantalla--pegi">' +
      '<div class="pegi-marco">' +
        '<img class="pegi-img" src="' + esc(P.imagen || 'img/pegi18.svg') + '" ' +
             'alt="Clasificación por edad: PEGI 18">' +
      '</div>' +
      '<p class="pegi-texto">' + esc(P.texto || 'Contenido no recomendado para menores de 18 años.') + '</p>' +
      '<button class="btn btn--fantasma pegi-saltar" id="btn-saltar-pegi" type="button" ' +
              'style="visibility:hidden">SALTAR AVISO ▸</button>' +
    '</section>';

  const btnSaltar = document.getElementById('btn-saltar-pegi');
  let avanzado = false;
  pegiTimers = { audio:null, mostrar:null, maximo:null, sinAudio:null };

  const avanzar = function(){
    if (avanzado) return;
    avanzado = true;
    limpiarPegi();
    irA('inicio');
  };

  btnSaltar.addEventListener('click', function(){ Sonido.clic(); avanzar(); });

  /* a los pocos segundos aparece el botón SALTAR */
  pegiTimers.mostrar = setTimeout(function(){
    btnSaltar.style.visibility = 'visible';
  }, (P.segundosParaSaltar == null ? 2 : P.segundosParaSaltar) * 1000);

  /* red de seguridad: nunca quedarse bloqueado en la placa */
  pegiTimers.maximo = setTimeout(avanzar,
    (P.duracionMaximaSeg == null ? 25 : P.duracionMaximaSeg) * 1000);

  const conSonido = CONFIG.sonidoActivoPorDefecto !== false;
  const ruta = P.audio || 'audios/pegi18.mp3';

  if (ruta && conSonido){
    const audio = new Audio(ruta);
    pegiTimers.audio = audio;
    audio.preload = 'auto';
    audio.volume = limitar(P.volumen, 0.4);        // 🔉 la locución sonaba alta
    /* Ajustamos la red de seguridad a la duración REAL del audio,
       para que nunca corte la locución a mitad. */
    audio.addEventListener('loadedmetadata', function(){
      if (pegiTimers && isFinite(audio.duration) && audio.duration > 0){
        clearTimeout(pegiTimers.maximo);
        pegiTimers.maximo = setTimeout(avanzar, (audio.duration + 6) * 1000);
      }
    });
    audio.addEventListener('ended', function(){
      if (P.avanceAutomatico !== false) avanzar();
      else btnSaltar.style.visibility = 'visible';
    });
    audio.addEventListener('error', function(){
      btnSaltar.style.visibility = 'visible';
    });
    const pr = audio.play();
    if (pr && pr.catch) pr.catch(function(){
      /* sin gesto de usuario o sin archivo: se puede saltar ya */
      btnSaltar.style.visibility = 'visible';
    });
  } else {
    pegiTimers.sinAudio = setTimeout(avanzar, 4500);
  }
}

/* ==================================================================
   🎛️  MENÚ (estilo The Quarry) — solo para probar
   Se abre desde el botón MENÚ de la portada. ESC para cerrar.
   ================================================================== */

function forzarFantasma(){
  const f = document.getElementById('fantasma');
  const img = document.getElementById('fantasma-img');
  if (!f || !img) return;
  img.src = CONFIG.imagenFantasmaURL || '';
  f.classList.add('visible');
  setTimeout(function(){ f.classList.remove('visible'); }, CONFIG.imagenFantasmaDuraMs || 120);
}
function forzarGlitch(){
  document.body.classList.add('glitch');
  Sonido.estatica(0.2);
  setTimeout(function(){ document.body.classList.remove('glitch'); }, 220);
}
function forzarTemblor(){
  document.body.classList.add('temblando');
  setTimeout(function(){ document.body.classList.remove('temblando'); }, 600);
}

let menuEsc = null;

function cerrarMenu(){
  const ov = document.getElementById('menu-quarry');
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  if (menuEsc){ document.removeEventListener('keydown', menuEsc); menuEsc = null; }
}

function abrirMenu(){
  if (document.getElementById('menu-quarry')) return;
  const M = CONFIG.menu || {};
  const P = CONFIG.pegi || {};

  const fila    = h => '<div class="quarry-fila">' + h + '</div>';
  const boton   = (a, t) => '<button class="q-btn" type="button" data-accion="' + a + '">' + esc(t) + '</button>';
  const rango   = (a, t, v) =>
    '<label class="q-linea"><span>' + esc(t) + '</span>' +
    '<input type="range" min="0" max="1" step="0.05" value="' + limitar(v, 0.5) + '" data-accion="' + a + '">' +
    '<output>' + Math.round(limitar(v, 0.5) * 100) + '</output></label>';
  const palanca = (a, t, on) =>
    '<label class="q-linea"><span>' + esc(t) + '</span>' +
    '<input type="checkbox" data-accion="' + a + '"' + (on ? ' checked' : '') + '></label>';

  let html =
    '<div class="quarry-panel" role="dialog" aria-modal="true" aria-label="Menú">' +
      '<div class="quarry-cab">' +
        '<span class="quarry-marca">' + esc(CONFIG.tituloInicial || '') + '</span>' +
        '<button class="q-cerrar" id="q-cerrar" type="button" aria-label="Cerrar menú">✕</button>' +
      '</div>' +
      '<h2 class="quarry-titulo">MENÚ</h2>' +
      '<div class="quarry-cuerpo">' +
        '<section class="quarry-seccion"><h3>Partida</h3>' +
          fila(boton('empezar', 'Nueva partida') + boton('reiniciar', 'Reiniciar')) +
        '</section>' +
        '<section class="quarry-seccion"><h3>Ajustes</h3>' +
          rango('vol-video', 'Volumen vídeo', CONFIG.videoVolumen) +
          rango('vol-pegi',  'Volumen PEGI',  P.volumen) +
          palanca('cfg-glitch',     'Glitch aleatorio',        CONFIG.efectoGlitchAleatorio !== false) +
          palanca('cfg-bloquear',   'Sin sustos durante el vídeo', CONFIG.videoBloquearEfectos !== false) +
          palanca('cfg-temporizador','Temporizador',           !!estado.temporizador) +
        '</section>';

  if (M.mostrarPruebas !== false){
    const nums = (CONFIG.etapas || []).map(function(e, i){ return boton('etapa-' + i, String(i+1)); }).join(' ');
    html +=
        '<section class="quarry-seccion"><h3>Pruebas · solo test</h3>' +
          fila('<span class="q-etiqueta">Ir al vídeo</span> ' + nums) +
          fila(boton('jumpscare','Jumpscare') + boton('fantasma','Fantasma') +
               boton('glitch','Glitch') + boton('temblor','Temblor')) +
          fila(boton('ver-aviso','Ver aviso') + boton('ver-pegi','Ver placa PEGI')) +
        '</section>';
  }

  html += '</div><div class="quarry-pie"><span>ESC para cerrar</span></div></div>';

  const ov = document.createElement('div');
  ov.id = 'menu-quarry';
  ov.className = 'quarry';
  ov.innerHTML = html;
  document.body.appendChild(ov);

  menuEsc = function(e){ if (e.key === 'Escape') cerrarMenu(); };
  document.addEventListener('keydown', menuEsc);
  document.getElementById('q-cerrar').addEventListener('click', cerrarMenu);

  const manejar = function(e){
    const b = e.target.closest ? e.target.closest('[data-accion]') : null;
    if (!b) return;
    const a = b.getAttribute('data-accion');

    /* --- controles deslizantes --- */
    if (b.tagName === 'INPUT' && b.type === 'range'){
      const val = limitar(parseFloat(b.value), 0.5);
      const out = b.parentNode.querySelector('output');
      if (out) out.textContent = Math.round(val * 100);
      if (a === 'vol-video'){
        CONFIG.videoVolumen = val;
        const v = videoActual(); if (v) v.volume = val;
      } else if (a === 'vol-pegi'){
        if (!CONFIG.pegi) CONFIG.pegi = {};
        CONFIG.pegi.volumen = val;
      }
      return;
    }
    /* --- interruptores --- */
    if (b.tagName === 'INPUT' && b.type === 'checkbox'){
      if (a === 'cfg-glitch')          CONFIG.efectoGlitchAleatorio = b.checked;
      if (a === 'cfg-bloquear')        CONFIG.videoBloquearEfectos  = b.checked;
      if (a === 'cfg-temporizador'){   estado.temporizador = b.checked; actualizarHUD(); actualizarReloj(); }
      return;
    }

    /* --- botones --- */
    Sonido.clic();
    if (a === 'empezar'){        cerrarMenu(); comenzar(); return; }
    if (a === 'reiniciar'){      cerrarMenu(); resetSilencioso(); return; }
    if (a === 'jumpscare'){      mostrarJumpscare(); return; }
    if (a === 'fantasma'){       forzarFantasma(); return; }
    if (a === 'glitch'){         forzarGlitch(); return; }
    if (a === 'temblor'){        forzarTemblor(); return; }
    if (a === 'ver-aviso'){      cerrarMenu(); irA('aviso'); return; }
    if (a === 'ver-pegi'){       cerrarMenu(); irA('pegi'); return; }
    if (a.indexOf('etapa-') === 0){
      const i = parseInt(a.slice(6), 10);
      if (!isNaN(i)){ cerrarMenu(); estado.iniciado = true; irA('video', i); }
    }
  };
  /* 'click' para botones y checkboxes; 'input' para que los deslizadores
     respondan mientras se arrastran, no solo al soltar. */
  ov.addEventListener('click', manejar);
  ov.addEventListener('input', manejar);
}

function pintarInicio(){
  app.innerHTML =
    '<section class="pantalla">' +
      '<h1 class="titulo-principal">' + esc(CONFIG.tituloInicial) + '</h1>' +
      '<p class="frase">' + esc(CONFIG.fraseInicial) + '</p>' +
      '<button class="btn btn--grande" id="btn-comenzar" type="button">' +
        esc(CONFIG.textoBotonComenzar) +
      '</button>' +
      ((CONFIG.menu && CONFIG.menu.activo !== false)
        ? '<div class="portada-menu">' +
            '<button class="btn btn--fantasma" id="btn-menu" type="button">MENÚ</button>' +
          '</div>'
        : '') +
    '</section>';
  document.getElementById('btn-comenzar').addEventListener('click', comenzar);
  const bm = document.getElementById('btn-menu');
  if (bm) bm.addEventListener('click', function(){ Sonido.clic(); abrirMenu(); });

  /* ⚡ La primera grabacion ya se va cargando mientras leen la portada */
  if (CONFIG.etapas[0]) precalentarVideo(CONFIG.etapas[0].video);
}

/* 🎬 VÍDEO — se ve ANTES del código. Tras él, se introduce el código
   que desbloquea el SIGUIENTE vídeo. */
function pintarVideo(){
  const i = estado.etapa;
  const etapa = CONFIG.etapas[i];
  if (!etapa){ irA('final'); return; }
  app.innerHTML =
    '<section class="pantalla">' +
      '<div class="marca">ETAPA ' + (i+1) + ' / ' + CONFIG.etapas.length + ' — GRABACIÓN</div>' +
      '<h2 class="titulo-etapa">' + esc(etapa.nombre || ('PRUEBA ' + (i+1))) + '</h2>' +
      '<div class="marco-video">' + crearReproductor(etapa.video) + '</div>' +
      (etapa.mensajePosterior ? '<p class="pista">' + esc(etapa.mensajePosterior) + '</p>' : '') +
      '<button class="btn btn--grande" id="btn-ir-codigo" type="button">' +
        esc(CONFIG.textoBotonIrACodigo) +
      '</button>' +
    '</section>';
  document.getElementById('btn-ir-codigo').addEventListener('click', function(){
    Sonido.clic();
    irA('codigo', estado.etapa);
  });

  arrancarVideo();                                  // ▶ arranca solo, sin pulsar play
}

/* 🔐 CÓDIGO — al acertar, avanza al VÍDEO de la siguiente etapa */
function pintarCodigo(){
  const i = estado.etapa;
  const etapa = CONFIG.etapas[i];
  if (!etapa){ irA('final'); return; }
  const total = CONFIG.etapas.length;

  if (ultimaEtapaSonido !== i){
    ultimaEtapaSonido = i;
    setTimeout(() => { if (estado.fase === 'codigo') Sonido.puerta(); }, 500);
  }

  app.innerHTML =
    '<section class="pantalla">' +
      '<div class="marca">ETAPA ' + (i+1) + ' / ' + total + '</div>' +
      '<h2 class="titulo-etapa">' + esc(etapa.nombre || ('PRUEBA ' + (i+1))) + '</h2>' +
      '<div class="separador"></div>' +
      '<p class="instruccion">' + esc(CONFIG.textoIntroduceCodigo) + '</p>' +
      '<form class="form-codigo" id="form-codigo" autocomplete="off">' +
        '<input class="input-codigo" id="input-codigo" type="text" ' +
               'autocomplete="off" autocapitalize="characters" autocorrect="off" ' +
               'spellcheck="false" maxlength="24" enterkeyhint="go" ' +
               'aria-label="Código" placeholder="— — — —">' +
        '<button class="btn" type="submit">' + esc(CONFIG.textoBotonDesbloquear) + '</button>' +
      '</form>' +
      (etapa.pista ? '<p class="pista">' + esc(etapa.pista) + '</p>' : '') +
    '</section>';
  const form = document.getElementById('form-codigo');
  const input = document.getElementById('input-codigo');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    comprobarCodigo(input.value, input);
  });
  if (window.matchMedia('(hover: hover)').matches){
    setTimeout(() => { try{ input.focus(); }catch(e){} }, 350);
  }
  resetInactividad();

  /* ⚡ Mientras escriben el codigo vamos descargando la grabacion
     de la siguiente etapa, para que aparezca al instante. */
  const siguiente = CONFIG.etapas[i+1];
  if (siguiente) precalentarVideo(siguiente.video);
}

function pintarFinal(){
  app.innerHTML =
    '<section class="pantalla">' +
      '<div class="marca">◈ SECUENCIA COMPLETADA ◈</div>' +
      '<h1 class="titulo-principal">' + esc(CONFIG.tituloFinal) + '</h1>' +
      '<p class="frase">' + esc(CONFIG.textoFinal) + '</p>' +
    '</section>';
  clearTimeout(pintarFinal._t);
  pintarFinal._t = setTimeout(() => {
    if (estado.fase === 'final') irA('fin');
  }, 3500);
}

let virusTimer = null, bsodTimer = null, tvTimer = null;
let pctInterval = null;

function pintarFin(){
  app.innerHTML =
    '<section class="pantalla">' +
      '<div class="marca">◈ FIN DEL JUEGO ◈</div>' +
      '<h1 class="titulo-principal">' + esc(CONFIG.tituloFin) + '</h1>' +
      '<p class="frase">' + esc(CONFIG.textoFin) + '</p>' +
    '</section>';
  clearTimeout(virusTimer);
  virusTimer = setTimeout(() => {
    mostrarAccesoHacker(() => {
      mostrarCaraSaw(() => {
        lanzarVirus(() => {
          setTimeout(() => resetSilencioso(), 800);
        });
      });
    });
  }, 1400);
}

function mostrarAccesoHacker(callback){
  const ov = document.getElementById('acceso-overlay');
  if (!ov){ if (callback) callback(); return; }
  ov.classList.remove('activo');
  void ov.offsetWidth;
  ov.classList.add('activo');
  ov.setAttribute('aria-hidden', 'false');

  Sonido.iniciar(); Sonido.reanudar();
  Sonido.tono(880, 0.06, 'square', 0.10);
  setTimeout(() => Sonido.tono(1200, 0.05, 'square', 0.09), 250);
  setTimeout(() => Sonido.tono(1600, 0.05, 'square', 0.08), 500);
  setTimeout(() => Sonido.estatica(0.25), 900);

  clearTimeout(mostrarAccesoHacker._t);
  mostrarAccesoHacker._t = setTimeout(() => {
    ov.classList.remove('activo');
    ov.setAttribute('aria-hidden', 'true');
    if (callback) callback();
  }, CONFIG.accesoSegundos || 2200);
}

function mostrarCaraSaw(callback){
  const ov = document.getElementById('cara-saw-overlay');
  const img = document.getElementById('cara-saw-img');
  if (!ov){ if (callback) callback(); return; }
  img.src = CONFIG.caraSawURL || '';
  ov.classList.remove('activo');
  void ov.offsetWidth;
  ov.classList.add('activo');
  ov.setAttribute('aria-hidden', 'false');

  Sonido.iniciar(); Sonido.reanudar();
  Sonido.caraSaw();

  document.body.classList.add('temblando');
  setTimeout(() => document.body.classList.remove('temblando'), 800);

  clearTimeout(mostrarCaraSaw._t);
  mostrarCaraSaw._t = setTimeout(() => {
    ov.classList.remove('activo');
    ov.setAttribute('aria-hidden', 'true');
    if (callback) callback();
  }, CONFIG.caraSawDuracionMs || 1300);
}

function generarFotosVirus(){
  const cont = document.getElementById('virus-fotos');
  if (!cont) return;
  const urls = CONFIG.virusImagenes;
  if (!Array.isArray(urls) || urls.length === 0){ cont.innerHTML = ''; return; }
  const total = CONFIG.virusNumeroFotos || 20;
  let html = '';
  for (let i = 0; i < total; i++){
    const url = urls[i % urls.length];
    const top = (Math.random() * 88).toFixed(1);
    const left = (Math.random() * 88).toFixed(1);
    const rot = (Math.random() * 70 - 35).toFixed(1);
    const size = Math.round(70 + Math.random() * 220);
    const delay = (Math.random() * 2).toFixed(2);
    const dur = (0.9 + Math.random() * 1.4).toFixed(2);
    html += '<img class="virus-foto" src="' + esc(url) + '" alt="" loading="eager" style="' +
      'top:' + top + '%; left:' + left + '%; width:' + size + 'px; ' +
      'transform: rotate(' + rot + 'deg); ' +
      'animation-delay:' + delay + 's; animation-duration:' + dur + 's;">';
  }
  cont.innerHTML = html;
}

function arrancarContadorBSOD(onLlegar100){
  const el = document.getElementById('bsod-pct');
  if (!el) return;
  const duracion = CONFIG.bsodDuracionMs || 9000;
  const inicio = performance.now();

  clearInterval(pctInterval);
  pctInterval = setInterval(() => {
    const transcurrido = performance.now() - inicio;
    const t = Math.min(1, transcurrido / duracion);
    const eased = t < 1 ? 1 - Math.pow(1 - t, 1.6) : 1;
    let pct = Math.floor(eased * 100);
    if (pct > 100) pct = 100;
    el.textContent = pct;

    if (t >= 1){
      clearInterval(pctInterval);
      pctInterval = null;
      if (onLlegar100) onLlegar100();
    }
  }, 80);
}

function lanzarVirus(onFinalizado){
  const ov = document.getElementById('virus-overlay');
  if (!ov){
    if (onFinalizado) onFinalizado();
    return;
  }

  const txt = CONFIG.virusTextoGrande || '';
  const elTxt = document.getElementById('virus-glitch');
  if (txt.trim()){
    elTxt.textContent = txt;
    elTxt.classList.remove('oculto');
  } else {
    elTxt.textContent = '';
    elTxt.classList.add('oculto');
  }

  document.getElementById('virus-sub').textContent = CONFIG.virusTextoSub || 'SISTEMA COMPROMETIDO';
  generarFotosVirus();

  const bsod = document.getElementById('virus-bsod');
  const tvRota = document.getElementById('tv-rota-overlay');
  const bsodPct = document.getElementById('bsod-pct');

  if (bsod){ bsod.classList.remove('activo'); bsod.setAttribute('aria-hidden', 'true'); }
  if (tvRota){ tvRota.classList.remove('activo'); tvRota.setAttribute('aria-hidden', 'true'); }
  if (bsodPct) bsodPct.textContent = '0';

  clearInterval(pctInterval);
  clearTimeout(bsodTimer);
  clearTimeout(tvTimer);

  ov.classList.add('activo');
  ov.setAttribute('aria-hidden', 'false');

  document.body.classList.add('temblando');
  setTimeout(() => document.body.classList.remove('temblando'), 900);

  Sonido.iniciar(); Sonido.reanudar(); Sonido.risa();

  bsodTimer = setTimeout(() => {
    if (!bsod) return;
    bsod.classList.add('activo');
    bsod.setAttribute('aria-hidden', 'false');
    Sonido.errorSistema();

    arrancarContadorBSOD(() => {
      setTimeout(() => {
        if (bsod){ bsod.classList.remove('activo'); bsod.setAttribute('aria-hidden', 'true'); }
        if (!tvRota){
          if (onFinalizado) onFinalizado();
          return;
        }

        const img = document.getElementById('tv-rota-imagen');
        if (img){
          if (CONFIG.tvRotaURL && String(CONFIG.tvRotaURL).trim()){
            img.style.backgroundImage = 'url("' + CONFIG.tvRotaURL + '")';
          } else {
            img.style.backgroundImage = 'none';
          }
        }
        tvRota.classList.add('activo');
        tvRota.setAttribute('aria-hidden', 'false');

        Sonido.cristalRoto();

        document.body.classList.add('temblando');
        setTimeout(() => document.body.classList.remove('temblando'), 800);

        tvTimer = setTimeout(() => {
          if (tvRota){ tvRota.classList.remove('activo'); tvRota.setAttribute('aria-hidden', 'true'); }
          ov.classList.remove('activo');
          ov.setAttribute('aria-hidden', 'true');
          if (onFinalizado) onFinalizado();
        }, CONFIG.tvRotaDuracionMs || 2800);
      }, 700);
    });
  }, CONFIG.virusRetardoBSOD || 2600);
}

function resetSilencioso(){
  clearTimeout(virusTimer);
  clearTimeout(bsodTimer);
  clearTimeout(tvTimer);
  clearInterval(pctInterval);
  clearTimeout(mostrarAccesoHacker._t);
  clearTimeout(mostrarCaraSaw._t);
  clearTimeout(pintarFinal._t);

  const ov = document.getElementById('virus-overlay');
  if (ov){ ov.classList.remove('activo'); ov.setAttribute('aria-hidden', 'true'); }
  const bsod = document.getElementById('virus-bsod');
  if (bsod){ bsod.classList.remove('activo'); bsod.setAttribute('aria-hidden', 'true'); }
  const tv = document.getElementById('tv-rota-overlay');
  if (tv){ tv.classList.remove('activo'); tv.setAttribute('aria-hidden', 'true'); }
  const ac = document.getElementById('acceso-overlay');
  if (ac){ ac.classList.remove('activo'); ac.setAttribute('aria-hidden', 'true'); }
  const cs = document.getElementById('cara-saw-overlay');
  if (cs){ cs.classList.remove('activo'); cs.setAttribute('aria-hidden', 'true'); }
  const js = document.getElementById('jumpscare');
  if (js){ js.classList.remove('activo'); js.setAttribute('aria-hidden', 'true'); }
  const f = document.getElementById('fantasma');
  if (f){ f.classList.remove('visible'); }

  liberarPrecalentador();
  MusicaFondo.parar();
  intentosFallidos = 0;
  ultimaEtapaSonido = -1;
  estado = {
    iniciado:false, fase:faseInicial(), etapa:0, segundos:0,
    sonido: CONFIG.sonidoActivoPorDefecto,
    temporizador: CONFIG.temporizador.activo
  };
  render();
}

function reiniciarJuego(){ resetSilencioso(); }

function normalizar(txt){
  let t = String(txt == null ? '' : txt).trim();
  if (CONFIG.ignorarMayusculas !== false) t = t.toUpperCase();
  return t;
}
function comenzar(){
  Sonido.iniciar(); Sonido.reanudar();
  MusicaFondo.crear();
  if (estado.sonido){ Sonido.ambienteOn(); MusicaFondo.reproducir(); }
  estado.iniciado = true; estado.segundos = 0;
  intentosFallidos = 0;
  ultimaEtapaSonido = -1;
  /* 🆕 Empezamos con el VÍDEO de la primera etapa */
  irA('video', 0);
}
function comprobarCodigo(valor, input){
  const etapa = CONFIG.etapas[estado.etapa];
  if (!etapa) return;
  const introducido = normalizar(valor);
  if (!introducido) return;
  if (introducido === normalizar(etapa.codigo)){
    intentosFallidos = 0;
    acierto();
  } else {
    intentosFallidos++;
    fallo(input);
  }
}
/* 🆕 Al acertar el código, avanza al VÍDEO de la siguiente etapa
   (o al FINAL si era el último código). */
function acierto(){
  Sonido.exito();
  document.body.classList.add('desbloqueando');
  setTimeout(() => {
    document.body.classList.remove('desbloqueando');
    const siguiente = estado.etapa + 1;
    if (siguiente >= CONFIG.etapas.length){
      irA('final');
    } else {
      irA('video', siguiente);
    }
  }, 1050);
}
function fallo(input){
  document.body.classList.add('temblando');
  setTimeout(() => document.body.classList.remove('temblando'), 420);

  const llegadoSusto = intentosFallidos >= (CONFIG.intentosParaSusto || 5);

  if (llegadoSusto){
    Sonido.gritoFuerte();
    mostrarJumpscare();
    intentosFallidos = 0;
  } else {
    Sonido.error();
    if (intentosFallidos >= (CONFIG.intentosParaUltimaOportunidad || 3)){
      setTimeout(() => Sonido.grito(), 200);
    }
    mostrarError();
  }

  if (input){
    input.value = '';
    setTimeout(() => {
      if (document.body.contains(input) && window.matchMedia('(hover: hover)').matches){
        try{ input.focus(); }catch(e){}
      }
    }, 300);
  }
}

function mostrarJumpscare(){
  if (videoReproduciendose()) return;   // no interrumpe una grabación en marcha
  const js = document.getElementById('jumpscare');
  const img = document.getElementById('jumpscare-img');
  if (!js || !img) return;
  img.src = CONFIG.jumpscareURL;
  js.classList.add('activo');
  js.setAttribute('aria-hidden', 'false');
  document.body.classList.add('temblando');

  clearTimeout(js._t);
  js._t = setTimeout(() => {
    js.classList.remove('activo');
    js.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('temblando');
  }, CONFIG.jumpscareDuracionMs || 750);
}

function mostrarError(){
  const ov = document.getElementById('overlay-error');
  const no = document.getElementById('error-no');
  const reint = document.getElementById('error-reintentar');
  const ultima = document.getElementById('error-ultima');

  no.textContent = CONFIG.errorLinea1;
  reint.textContent = CONFIG.errorLinea2;

  if (intentosFallidos >= (CONFIG.intentosParaUltimaOportunidad || 3)){
    ultima.classList.add('visible');
  } else {
    ultima.classList.remove('visible');
  }

  reint.classList.remove('visible');
  ov.classList.add('visible'); ov.setAttribute('aria-hidden', 'false');
  clearTimeout(ov._t1); clearTimeout(ov._t2);
  ov._t1 = setTimeout(() => reint.classList.add('visible'), 850);
  ov._t2 = setTimeout(() => {
    ov.classList.remove('visible'); ov.setAttribute('aria-hidden', 'true');
    ultima.classList.remove('visible');
  }, 2900);
}

function bucleGlitch(){
  if (!CONFIG.efectoGlitchAleatorio) return;
  const espera = 6000 + Math.random() * 14000;
  setTimeout(() => {
    const virus = document.getElementById('virus-overlay');
    if (estado.iniciado && (!virus || !virus.classList.contains('activo')) && !videoReproduciendose()){
      document.body.classList.add('glitch');
      Sonido.estatica(0.18 + Math.random() * 0.2);
      const duracion = 160 + Math.random() * 260;
      setTimeout(() => document.body.classList.remove('glitch'), duracion);
    }
    bucleGlitch();
  }, espera);
}

function bucleSonidosTerror(){
  const min = CONFIG.sonidosTerrorMinMs || 20000;
  const max = CONFIG.sonidosTerrorMaxMs || 60000;
  const espera = min + Math.random() * (max - min);

  setTimeout(() => {
    if (estado.iniciado && estado.sonido && !Sonido.silencioso && !videoReproduciendose()){
      const r = Math.random();
      if (r < 0.22) Sonido.puerta();
      else if (r < 0.44) Sonido.grito();
      else if (r < 0.62) Sonido.pasos();
      else if (r < 0.80) Sonido.crujido();
      else Sonido.latido();
    }
    bucleSonidosTerror();
  }, espera);
}

function bucleTemblores(){
  const espera = 35000 + Math.random() * 50000;
  setTimeout(() => {
    if (estado.iniciado && !Sonido.silencioso && !videoReproduciendose()){
      document.body.classList.add('temblando');
      setTimeout(() => document.body.classList.remove('temblando'), 500);
    }
    bucleTemblores();
  }, espera);
}

let inactividadTimer = null;
function resetInactividad(){
  clearTimeout(inactividadTimer);
  if (!estado.iniciado) return;
  inactividadTimer = setTimeout(() => {
    if (estado.fase === 'codigo' || estado.fase === 'final'){
      Sonido.respiracion();
    }
    resetInactividad();
  }, (CONFIG.inactividadSegundos || 30) * 1000);
}
function detectarActividad(){
  ['keydown','click','touchstart','mousemove','scroll'].forEach(evt => {
    document.addEventListener(evt, resetInactividad, { passive: true });
  });
}

function bucleFantasma(){
  if (!CONFIG.imagenFantasmaURL) return;
  const min = CONFIG.imagenFantasmaMinSeg || 10;
  const max = CONFIG.imagenFantasmaMaxSeg || 25;
  const espera = (min + Math.random() * (max - min)) * 1000;
  setTimeout(() => {
    const f = document.getElementById('fantasma');
    const img = document.getElementById('fantasma-img');
    const virus = document.getElementById('virus-overlay');
    const enVirus = virus && virus.classList.contains('activo');
    if (f && img && estado.iniciado && !enVirus && !videoReproduciendose()){
      img.src = CONFIG.imagenFantasmaURL;
      f.classList.add('visible');
      Sonido.estatica(0.05);
      setTimeout(() => f.classList.remove('visible'),
        CONFIG.imagenFantasmaDuraMs || 120);
    }
    bucleFantasma();
  }, espera);
}

document.getElementById('btn-sonido').addEventListener('click', function(){
  estado.sonido = !estado.sonido;
  Sonido.activo = estado.sonido;
  Sonido.iniciar(); Sonido.reanudar();
  if (estado.sonido){
    if (!Sonido.silencioso){
      Sonido.ambienteOn();
      MusicaFondo.reproducir();
    }
    Sonido.clic();
  } else {
    Sonido.ambienteOff();
    MusicaFondo.pausar();
  }
  actualizarHUD();
});
document.getElementById('btn-tiempo').addEventListener('click', function(){
  estado.temporizador = !estado.temporizador;
  actualizarHUD(); actualizarReloj(); Sonido.clic();
});
document.getElementById('btn-reiniciar').addEventListener('click', resetSilencioso);

(function init(){
  borrarGuardado();
  SystemInfo.iniciar();
  estado = {
    iniciado:false, fase:faseInicial(), etapa:0, segundos:0,
    sonido: CONFIG.sonidoActivoPorDefecto,
    temporizador: CONFIG.temporizador.activo
  };
  Sonido.activo = !!estado.sonido;
  render();
  arrancarIntervalo();
  detectarActividad();
  resetInactividad();
  bucleFantasma();
  bucleSonidosTerror();
  bucleTemblores();

  const desbloquearAudio = function(){
    Sonido.iniciar(); Sonido.reanudar();
    MusicaFondo.crear();
    if (estado.iniciado && estado.sonido && !Sonido.silencioso){
      Sonido.ambienteOn();
      MusicaFondo.reproducir();
    }
    document.removeEventListener('click', desbloquearAudio);
    document.removeEventListener('touchstart', desbloquearAudio);
  };
  document.addEventListener('click', desbloquearAudio);
  document.addEventListener('touchstart', desbloquearAudio);
  bucleGlitch();
})();
