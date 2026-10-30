# FNAF 2 — Multijugador (fnaf2m)

**Five Nights at Freddy's 2 multijugador** — hasta 11 jugadores (1 guardia + 10
animatrónicos) sobre el juego original de Clickteam Fusion. Misma metodología
que [fnafm](https://github.com/axcgamestudios2/fnafm) (FNAF 1 MP).

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
  pulsa JUMPSCARE, muere. Con máscara puesta, el animatrónico se retira.
- **La Marioneta** escapa cuando la caja musical se agota (kill inevitable);
  **Balloon Boy** no mata: roba la linterna.
- **⚡ DESTELLO** del guardia [F]: aturde a todos 5s y echa a los acampadores
  de la oficina (2 cargas, cooldown 12s).

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
- El init nativo de la noche coloca a `new bonnie`/`new chica` DENTRO de la
  oficina (muerte aleatoria a los 10-30s): ese grupo de eventos se desactiva
  y las posiciones las fija el MP.

## Jugar

1. `index.html` → MULTIJUGADOR → crear partida (cuenta axc)
2. Compartir el código de 5 letras
3. El GUARDIA se sortea al pulsar EMPEZAR
