# The Lost Pizzeria — Multijugador (fnaf2m)

**The Lost Pizzeria** — multijugador de terror para hasta 11 jugadores
(1 guardia + 10 animatrónicos) sobre el juego original de Clickteam Fusion.
Misma metodología que [fnafm](https://github.com/axcgamestudios2/fnafm).

**▶ JUGAR: https://axcgamestudios2.github.io/fnaf2m/**

## v4 — pantallas arregladas (oficina visible · cámaras operativas · sin bucle de muerte)

- **OFICINA VISIBLE (fix del «todo parpadeando en negro»)**: el sprite
  `blackout` del demo nace ROTO con el runtime 291 + datos 292 y cubre la
  pantalla de negro opaco. El bridge lo destierra fuera de pantalla cada
  500 ms → la oficina renderiza NATIVA (escritorio, ventilador, poster
  CELEBRATE, pasillo) y la **linterna (mantén CTRL)** funciona de verdad.
- **CÁMARAS 100% OPERATIVAS (fix del «NO SIGNAL»)**: el monitor nativo no
  dibuja sus vistas con 291+292 (pantalla blanca). Un **overlay HTML** lee
  el estado nativo (botón flip + contador `viewing`) y muestra la vista en
  vivo: **imagen real de la sala** (verificada del propio banco de imágenes
  del juego), **ocupantes con su icono** (jugadores en dorado, IA en gris),
  **mapa clicable** CÁM 01–12 para cambiar de cámara y botón **▼ BAJAR
  MONITOR**. La CÁM 11 enseña la barra de la caja musical en vivo.
- **CAJA MUSICAL SIN MUERTE SORPRESA (fix del bucle muerte→reinicio)**: sin
  marioneta jugadora ya NO hay kill a los 4 s de caja vacía: hay **aviso +
  ventana de gracia de 20 s** («¡DAR CUERDA YA!» con cuenta atrás) y solo
  si se sigue sin cuerda la IA la manda. Con marioneta jugadora el kill lo
  decide ella. La barra pasa a **rojo parpadeante** por debajo del 25%.
  Antes la noche moría a los ~92 s y el guardía veía el bucle
  gameover→menú→reinicio como «parpadeo negro constante».
- **ANIMATRÓNICOS QUE VEN (fix de «solo tienen su pantalla en negro»)**: la
  interfaz del animatrónico ahora muestra **la sala real en la que está**
  (imagen verificada del juego con pan lento + CRT/estática + destello de
  estática al moverse). En la oficina la vista pasa a tono rojo de peligro.
- **Reloj REAL**: el HUD del animatrónico muestra la hora del HOST (antes
  era un reloj decorativo falso).
- E2E verificado: noche estable >4 min (hora 2+) sin reinicios, dar cuerda
  salva la noche tras el aviso, marcadores nativos moviéndose en vivo,
  ocupantes en cámaras, kill por jumpscare, revancha sin recargar y CUSTOM
  NIGHT bloqueada.

## v3 — The Lost Pizzeria (rebranding + anti-glitches)

- **Rebranding completo**: todo el texto visible dice ahora **The Lost Pizzeria**
  (títulos de las páginas, logo del launcher/lobby/carga regenerado, cortina
  del guardia, UI del animatrónico). Sin «Five Nights at Freddy's» en ninguna
  pantalla.
- **CORTINA MP sobre el menú nativo**: el menú del demo es ilegible (sus textos
  no renderizan con el runtime 291 + datos 292: logo y botones invisibles, solo
  se ve el parpadeo en negro) y lleva a pantallas rotas. En multijugador el
  guardia ve una cortina con el código de sala, los conectados y **▶ EMPEZAR
  NOCHE** — el menú nativo queda inaccesible (y sin parpadeos).
- **CUSTOM NIGHT desactivada**: el frame `customize` (12) se bloquea y devuelve
  al menú al instante, tanto en multijugador (watchdog del bridge) como en un
  jugador (mini-guardián en `2/index.html`). Ya no se ofrece «para empezar».
- **Arranque de noche FIABLE**: la autoridad de frames vive en un watchdog
  permanente (200 ms) que fuerza el frame de la noche **sin tope de tiempo**.
  v2 lo intentaba 20 s y se rendía: el demo seguía su propio guion (modo
  atracción, `new bonnie`/`new chica` dentro de la oficina, corte a 80 s) y el
  guardia veía parpadeos en negro mientras el overlay mentía («noche en
  marcha»). Ahora la noche MP siempre aterriza estabilizada.
- **Animatrónicos con pantalla VIVA**: la espera deja de ser una pantalla negra
  total — banner compacto sobre el HUD/mapa/compañeros visibles. La noche
  arranca de verdad (nightStart real) y al terminar hay **REVANCHA** sin
  recargar (mensaje `toLobby` + cortina de revancha del guardia).
- **FIX DEL CONGELAMIENTO aleatorio** (el «super glitcheado»): el bucle del
  juego es una cadena de `setTimeout` que se auto-reprograma AL FINAL del
  dibujo. Con el runtime 291 + datos 292, a veces un fondo sin decodificar a
  tiempo hace que `drawImage` lance una excepción → la cadena MUERE → juego
  congelado (frame 0 eterno, noches colgadas). **Estabilizador siempre
  activo** en `2/index.html`: envuelve `stepApplication` — el tick fallido
  se salta, pero el bucle sigue vivo (y un vigilante lo re-programa si
  muere). Además el juego ya **no se pausa al perder el foco** de la
  ventana (el demo original se congelaba con `window.blur`): la noche
  compartida nunca se detiene.

## Cómo funciona

- **El GUARDIA** juega el juego ORIGINAL: máscara, linterna, luces, cámaras
  y la caja musical. Su partida es el host autoritativo (PeerJS, topología
  estrella igual que el FNAF 1 MP).
- **Los ANIMATRÓNICOS** (toy freddy/bonnie/chica, mangle, balloon boy, la
  marioneta y los 4 withered) se mueven por la pizzería en su propia
  interfaz (`mp/anim.html`) con cooldowns, minimapa y jumpscare.
- El movimiento del jugador teletransporta los MARCADORES nativos del juego
  (`old bonnie`, `new freddy`, `sockpuppet`…) sobre los anclajes de sala
  (`cam 01`…`cam 12`, `hall stage 1/2`, `in office`): el render de cámaras,
  la ocupación de oficina y los ataques son del MOTOR ORIGINAL.
- **Ataques**: quien entra en la oficina activa el estado nativo
  (`office occupied=1`); si el guardia no se máscara en 3s o el animatrónico
  pulsa JUMPSCARE [ESP], muere. Con máscara puesta, el animatrónico se retira.
- **La Marioneta** escapa cuando la caja musical se agota ([E] para salir si
  la llevas tú; si es IA, aviso + 20 s de gracia para dar cuerda y solo
  entonces mata); **Balloon Boy** no
  mata: roba la linterna 40s.
- **⚡ DESTELLO** del guardia [F]: aturde a todos 5s y echa a los acampadores
  de la oficina (2 cargas, +1 por hora, cooldown 12s).

## El mapa (cámaras canon del FNAF 2)

| Cámara | Sala | Cámara | Sala |
|--------|------|--------|------|
| CÁM 01 | Sala de fiestas 1 | CÁM 07 | Pasillo principal |
| CÁM 02 | Sala de fiestas 2 | CÁM 08 | Refacciones |
| CÁM 03 | Sala de fiestas 3 | CÁM 09 | Escenario |
| CÁM 04 | Sala de fiestas 4 | CÁM 10 | Área de juegos |
| CÁM 05 | Conducto de aire izq. | CÁM 11 | Rincón de premios |
| CÁM 06 | Conducto de aire der. | CÁM 12 | Caverna del niño |

Posiciones iniciales canon: los **toys** en el Escenario · los **withered**
en Refacciones · **BB** en el Área de juegos · **Mangle** en su Caverna ·
la **Marioneta** en el Rincón de premios. El ritmo acelera con las noches
(6s por sala en N1 → 3s en N5+).

## 🎵 La caja musical (mecánica central del FNAF 2)

- Drena **27/s** (≈90s por caja llena): hay que darle cuerda ~4-5 veces por
  noche de 7 minutos. El nivel lo lleva el HOST (los writers nativos del demo
  drenaban a 324/s) y se escribe en el contador del juego para que la barra
  nativa de la CÁM 11 siga funcionando.
- El guardia ve la barra en su overlay y da cuerda con el botón **DAR CUERDA**
  (mantener pulsado, +180/s).
- Si llega a 0: **la Marioneta puede escapar** (jugadora: [E] para salir y
  matar; IA: mata a los 4s). Dar cuerda a tiempo la devuelve a su caja.

## ✴ Habilidades únicas [Q] (cooldown 30s)

| Rol | Habilidad | Efecto |
|-----|-----------|--------|
| Toy Freddy | **FAROL** | Banner FALSO de entrada a la oficina (2.5s) |
| Toy Bonnie | **INTERFERENCIA** | Estática en el monitor del guardia 3s |
| Toy Chica | **CUPCAKE** | Golpes metálicos que despistan 4s |
| Mangle | **RADIO ROTA** | Estática atronadora: −10% de batería |
| Balloon Boy | **GLOBOS** | El guardia NO puede dar cuerda 6s |
| La Marioneta | **MELODÍA MISTERIOSA** | La caja se agota al doble 8s |
| Freddy destrozado | **BURLA** | Banner falso de oficina 2.5s |
| Bonnie destrozado | **TORMENTO** | Estática en el monitor 3s |
| Chica destrozada | **CAZUELAS** | Ruido atronador 4s |
| Foxy destrozado | **SPRINT** | El doble de rápido 6s |

## Estructura

```
2/            El juego original (demo "FiveNights2NOHACKS")
2/index.html  + hook del guard-bridge (solo activo con ?mp=)
              + guardián anti-custom-night (siempre activo)
mp/           net.js · lobby.html/js · anim.html/anim-game.js · guard-bridge.js
```

## Notas técnicas

- El juego original venía con el `Runtime.js` MINIFICADO (build 292.24): sin
  nombres internos no se puede pilotar. Se sustituye por el Runtime.js SIN
  MINIFICAR del FNAF 1 (build 291.2) + 2 parches de compatibilidad con los
  datos 292 (parámetro 68 y evaluación de condiciones sin tokens).
- **El menú nativo no renderiza sus textos** con esa combinación de runtime y
  datos (logo y botones invisibles → pantalla que solo parpadea en negro):
  por eso el multijugador lo sustituye con la cortina MP.
- Mapa de frames del demo (ingeniería inversa): `0` splash · `2` "what day" ·
  `3` **la noche** · `12` "customize" (custom night, BLOQUEADA) · `13` "dream"
  (menú) · `14/15` "error" (glitch) · `4` static · `5` next day · `6` gameover.
- El demo corta la noche a los 80 segundos (`time allowed`): en MP se
  neutraliza; las horas las marca el host (70s/hora ≈ noche de 7 minutos).
- **Muerte aleatoria resuelta de raíz**: el guion del demo mueve los
  marcadores por eventos (a los ~12s mete a `old foxy` en `got you box` y a
  `new bonnie`/`new chica` DENTRO de la oficina → kill nativo → vuelta al
  menú). Se desactivan los 74 grupos de eventos que posicionan marcadores
  (los que no pertenecen a la cadena de kill/render) y un bucle de
  **autoridad de marcadores** devuelve cada marcador a su sala lógica: los
  marcadores son 100% del host.
- **Caja musical determinista**: los writers nativos del contador se
  desactivan y el host lleva el nivel (27/s de drenaje, cuerda a 180/s);
  el contador del juego se escribe en cada tick para conservar el HUD y las
  condiciones canon de la Marioneta.

## Jugar

1. `index.html` → MULTIJUGADOR → crear partida (cuenta axc)
2. Compartir el código de 5 letras
3. El GUARDIA se sortea al pulsar EMPEZAR

---

NOT OFFICIAL FNAF PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH SCOTT CAWTHON.
Demo original "FiveNights2NOHACKS"; port HTML5 basado en el trabajo de
irv77 (github.com/irv77/hd_fnaf).
