/* ==================================================================
   ⚙️  CONFIGURACIÓN — EDITA SOLO ESTA ZONA
   ==================================================================
   FLUJO DEL JUEGO:
     INICIO → VÍDEO 1 → CÓDIGO 1 → VÍDEO 2 → CÓDIGO 2 → ...
     ... → VÍDEO 5 → CÓDIGO 5 → FINAL
   ================================================================== */

const CONFIG = {

  tituloInicial:  "EL JUEGO HA COMENZADO",
  fraseInicial:   "Habéis entrado voluntariamente. Ahora tendréis que encontrar la salida.",
  textoBotonComenzar: "COMENZAR",

  textoIntroduceCodigo: "INTRODUCE EL CÓDIGO",
  textoBotonDesbloquear: "DESBLOQUEAR",
  /* Texto del botón que aparece bajo cada vídeo (lleva al código) */
  textoBotonIrACodigo: "INTRODUCIR CÓDIGO",

  errorLinea1: "NO.",
  errorLinea2: "VOLVED A INTENTARLO.",

  intentosParaUltimaOportunidad: 3,
  intentosParaSusto:              5,

  tituloFinal: "ENHORABUENA.",
  textoFinal:  "Habéis completado todas las pruebas.",

  tituloFin:     "HABÉIS SALIDO.",
  textoFin:      "Por esta noche… el juego ha terminado.",

  inactividadSegundos: 30,

  imagenFantasmaURL: "https://picsum.photos/seed/jigsawface/500/600?grayscale&blur=1",
  imagenFantasmaMinSeg: 10,
  imagenFantasmaMaxSeg: 25,
  imagenFantasmaDuraMs: 120,

  jumpscareURL: "https://picsum.photos/seed/scaryface/800/800?grayscale&contrast=1.8",
  jumpscareDuracionMs: 750,

  caraSawURL: "https://static1.srcdn.com/wordpress/wp-content/uploads/2025/06/saw-s-blumhouse-deal-could-be-the-best-thing-to-happen-to-the-franchise-in-21-years.jpg?q=70&fit=crop&w=1100&h=618&dpr=1",
  caraSawDuracionMs: 1300,

  tvRotaURL: "https://picsum.photos/seed/brokentv/1920/1080?grayscale&contrast=1.6&blur=0",
  tvRotaDuracionMs: 2800,

  musicaFondo: "",
  melodiaIntervaloMs: 12000,

  accesoSegundos: 2200,

  virusTextoGrande: "OS ESTÁBAMOS ESPERANDO",
  virusTextoSub:    "SISTEMA COMPROMETIDO",

  virusImagenes: [
    "https://picsum.photos/seed/saw1/500/400?grayscale",
    "https://picsum.photos/seed/saw2/500/400?grayscale",
    "https://picsum.photos/seed/saw3/500/400?grayscale",
    "https://picsum.photos/seed/saw4/500/400?grayscale",
    "https://picsum.photos/seed/saw5/500/400?grayscale",
    "https://picsum.photos/seed/saw6/500/400?grayscale",
    "https://picsum.photos/seed/saw7/500/400?grayscale",
    "https://picsum.photos/seed/saw8/500/400?grayscale"
  ],
  virusNumeroFotos: 30,
  virusRetardoBSOD: 2600,
  bsodDuracionMs: 9000,

  sonidosTerrorMinMs: 20000,
  sonidosTerrorMaxMs: 60000,

  /* ==============================================================
     🎬  REPRODUCTOR DE VÍDEO
     ============================================================== */
  videoAutoplay: true,          // el vídeo arranca SOLO, sin pulsar play
  videoPrecarga: "auto",        // "auto" = carga rápida | "metadata" = ahorra datos
  videoBucle: false,            // true = el vídeo se repite solo al terminar

  /* Prepara en segundo plano el vídeo de la SIGUIENTE etapa mientras
     están escribiendo el código, para que aparezca al instante. */
  videoPrecalentarSiguiente: true,

  /* Mientras el vídeo se esté reproduciendo se PAUSAN las apariciones
     aleatorias (fantasma, glitches, temblores y sonidos de terror),
     para que no interrumpan la grabación. Al pausar el vídeo vuelven. */
  videoBloquearEfectos: true,

  /* Volumen de las grabaciones (0 a 1). Bajo para que no retumbe
     ni suene raro por el altavoz del portátil. */
  videoVolumen: 0.25,

  /* ==============================================================
     ⚠️  AVISO INICIAL — GLITCH, FOTOS Y EDAD
     Flujo:  AVISO  →  PLACA PEGI 18 (imagen + audio)  →  PORTADA
     ============================================================== */
  advertencia: {
    activa: true,              // ponla en false para saltarte aviso y placa
    /* Una sola línea, en el tono del juego. Es un aviso entre amigas. */
    texto: "Advertencia, contenido para Adultos maduros y adolescentes sin futuro",
    textoBotonAceptar: "ENTRAR"
  },

  pegi: {
    activa: true,
    imagen: "img/pegi18.svg",
    audio:  "audios/pegi18.mp3",
    volumen: 0.4,               // la locución sonaba alta: aquí se atenúa (0 a 1)
    texto:  "Contenido no recomendado para menores de 18 años.",
    avanceAutomatico: true,     // pasa a la portada al terminar el audio
    segundosParaSaltar: 1,      // con un audio de ~3 s casi no hace falta
    duracionMaximaSeg: 4        // tope si el archivo no informa de su duración;
                                // en cuanto la conoce se ajusta solo al audio
  },

  /* Menú estilo The Quarry, para probar sin tocar el código */
  menu: {
    activo: true,          // botón MENÚ en la portada
    mostrarPruebas: true   // sección PRUEBAS; ponla false el día de la partida
  },

  temporizador: {
    activo: true,
    modo: "cuentaAtras",
    minutos: 60,
    avisoUltimosMinutos: 5
  },

  sonidoActivoPorDefecto: true,
  efectoGlitchAleatorio:  true,
  ignorarMayusculas:      true,

  /* ==============================================================
     ⭐ LAS 5 PRUEBAS ⭐
     ==============================================================
     Cada etapa tiene:
       nombre  → título que se muestra
       video   → vídeo que se ve PRIMERO
       codigo  → contraseña que desbloquea el SIGUIENTE vídeo
       pista   → texto bajo el campo del código
     ============================================================== */
  etapas: [

    {
      nombre: "PRUEBA 1 — LA GRABACIÓN",
      video:  "videos/prueba-1.mp4",   // ← CAMBIA ESTE VÍDEO
      codigo: "SANGRE",                                         // ← CAMBIA ESTE CÓDIGO
      pista:  "El vídeo os dirá dónde buscar.",
      mensajePosterior: ""
    },

    {
      nombre: "PRUEBA 2 — LA AGUJA",
      video:  "videos/prueba-2.mp4",   // ← CAMBIA ESTE VÍDEO
      codigo: "AGUJA",                                          // ← CAMBIA ESTE CÓDIGO
      pista:  "Buscad donde nadie quiere mirar.",
      mensajePosterior: ""
    },

    {
      nombre: "PRUEBA 3 — LA LLAVE",
      video:  "videos/prueba-3.mp4",   // ← CAMBIA ESTE VÍDEO
      codigo: "LLAVE",                                          // ← CAMBIA ESTE CÓDIGO
      pista:  "Ya casi estáis dentro… o fuera.",
      mensajePosterior: ""
    },

    {
      nombre: "PRUEBA 4 — LA CINTA",
      video:  "videos/prueba-4.mp4",   // ← CAMBIA ESTE VÍDEO
      codigo: "CINTA",                                          // ← CAMBIA ESTE CÓDIGO
      pista:  "El juego recuerda. Vosotros también deberíais.",
      mensajePosterior: ""
    },

    {
      nombre: "PRUEBA 5 — LA LIBERTAD",
      video:  "videos/prueba-5.mp4",   // ← CAMBIA ESTE VÍDEO
      codigo: "LIBERTAD",                                       // ← CAMBIA ESTE CÓDIGO
      pista:  "Última prueba. No miréis atrás.",
      mensajePosterior: ""
    }
  ]
};
