EL JUEGO HA COMENZADO — estructura del proyecto
El HTML original (un solo archivo de 76 KB) se ha separado en ficheros independientes.
No se ha modificado ni una línea del código, lo único que ha cambiado son las
5 rutas de los vídeos: de URL de YouTube a archivo local.

12345678910111213
🎬 Los vídeos
Solo tienes que dejar tus archivos en la carpeta videos/ con estos nombres
(ya están escritos así en js/config.js):
Etapa
Archivo esperado
Código que desbloquea la siguiente
1
videos/prueba-1.mp4
SANGRE
2
videos/prueba-2.mp4
AGUJA
3
videos/prueba-3.mp4
LLAVE
4
videos/prueba-4.mp4
CINTA
5
videos/prueba-5.mp4
LIBERTAD
Si tus archivos se llaman de otra forma (p. ej. grabacion.mov), cambia la ruta
en js/config.js, línea de video: de la etapa correspondiente. Se aceptan
.mp4, .webm y .ogg/.ogv (los que reproduce el navegador de forma nativa).
Recomendado: .mp4 con códec H.264 + audio AAC. Es el que funciona en
todos los navegadores sin conversión.
▶️ El reproductor
Al ser archivos locales se usa el reproductor nativo del navegador
(<video controls>), que ya trae de serie:
play / pausa
barra de progreso para saltar a cualquier momento
🔁 rebobinar al principio y volver a reproducir
velocidad de reproducción (más rápido / más lento) — en Chrome y Edge está
en el menú ⋮ o ⚙ del propio reproductor
volumen y silencio
pantalla completa
picture-in-picture (vídeo en ventana flotante)
Arranque automático y carga rápida
El vídeo se pone solo, sin pulsar play, y se precarga con preload="auto".
Además, mientras el equipo escribe un código la web va descargando en segundo
plano la grabación de la etapa siguiente, de modo que aparece al instante.
¿Por qué a veces sale «🔇 PULSA PARA ACTIVAR EL SONIDO»?
Los navegadores prohíben arrancar un vídeo con sonido si nadie ha
interactuado todavía con la página. Como aquí siempre hay que pulsar
COMENZAR antes, en la práctica no debería pasar. Si aun así el navegador
lo bloquea, el vídeo arranca igualmente en silencio (nunca se queda
parado) y muestra ese aviso: en cuanto alguien pulse cualquier tecla o haga
clic, el sonido vuelve solo y el aviso desaparece.
Sin sustos mientras se ve el vídeo
Las apariciones aleatorias (el fantasma que sale cada 10-25 s, los glitches de
pantalla, los temblores y los sonidos de terror) se pausan mientras el vídeo
se está reproduciendo, para que no tapen las pistas de la grabación.
En cuanto alguien pausa el vídeo, vuelven a activarse.
Todo esto se controla desde js/config.js:
js

12345
Si en algún momento quieres que los sustos vuelvan a salir durante los vídeos,
pon videoBloquearEfectos: false.
🖥️ Abrirlo en VS Code
Abre la carpeta juego-saw en VS Code (File → Open Folder).
Instala la extensión Live Server (ritwickdey.LiveServer).
Botón derecho sobre index.html → Open with Live Server.
Funciona también con doble clic en index.html, pero con Live Server evitas
problemas de permisos del navegador al leer archivos locales y la página se
recarga sola al guardar cambios.
💡 Por qué separar los archivos pesa menos
El tamaño total es parecido, pero al estar separados el navegador guarda en
caché estilos.css, config.js y app.js. En cada recarga solo vuelve a
descargar lo que haya cambiado, y al editar un código o un texto no se vuelve a
transferir el CSS ni la lógica del juego.
⚠️ Queda pendiente (no se ha tocado, como pediste)
Estas imágenes siguen apuntando a URLs externas de relleno, en js/config.js:
imagenFantasmaURL → picsum.photos
jumpscareURL → picsum.photos
caraSawURL → static1.srcdn.com
tvRotaURL → picsum.photos
virusImagenes[] → 8 URLs de picsum.photos
Si quieres que también sean archivos locales (carpeta img/), dímelo y lo
hago con el mismo criterio: sin tocar nada más.
También siguen cargándose las fuentes de Google (Creepster y Special Elite)
desde index.html. Se pueden descargar y servir en local si la página va a
funcionar sin internet.