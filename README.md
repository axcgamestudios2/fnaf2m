# FNAF 2 — Multijugador (fnaf2m)

**Five Nights at Freddy's 2 multijugador** — hasta 11 jugadores (1 guardia + 10
animatrónicos) sobre el juego original de Clickteam Fusion. Misma metodología
que [fnafm](https://github.com/axcgamestudios2/fnafm) (FNAF 1 MP).

**▶ JUGAR: https://axcgamestudios2.github.io/fnaf2m/**

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
  la llevas tú; si es IA, mata a los 4s de caja vacía); **Balloon Boy** no
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
2/            El juego FNAF 2 original (demo "FiveNights2NOHACKS")
2/index.html  + hook del guard-bridge (solo activo con ?mp=)
mp/           net.js · lobby.html/js · anim.html/anim-game.js · guard-bridge.js
```

## Notas técnicas

- El FNAF 2 venía con el `Runtime.js` MINIFICADO (build 292.24): sin nombres
  internos no se puede pilotar. Se sustituye por el Runtime.js SIN MINIFICAR
  del FNAF 1 (build 291.2) + 2 parches de compatibilidad con los datos 292
  (parámetro 68 y evaluación de condiciones sin tokens).
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
