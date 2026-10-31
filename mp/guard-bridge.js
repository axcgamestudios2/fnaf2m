// ============================================================
// THE LOST PIZZERIA — Puente del GUARDIA (v5)
// Se carga en 2/index.html SOLO cuando ?mp=<CODIGO> existe.
// Sin el parámetro, el juego queda 100% original (un jugador).
//
// v5 (CÁMARAS ORIGINALES RESTAURADAS):
//   · EL OVERLAY HTML DE CÁMARAS (v4) ELIMINADO: la vista que ve
//     el guardia al subir el monitor es 100% DEL MOTOR ORIGINAL
//     (sprite 'Active 16' con el bitmap nativo de cada sala).
//   · CAUSA RAÍZ de la pantalla blanca: con el runtime 291 + datos
//     292, tres sprites del monitor nacen torcidos y TAPAN la
//     vista nativa:
//       - 'white button' (544x74) se dibuja como RECTÁNGULO BLANCO
//         que cubre toda la pantalla (como el 'blackout' de la
//         oficina) → se destierra (patrón banishBlackout).
//       - 'blip 2' + 'flip animation' (1024x768, ~13 instancias)
//         son los overlays de transición del monitor que NUNCA se
//         van: muestran el mapa "señal interrumpida" para siempre
//         → se destierran y la vista de cámara queda expuesta.
//       - 'Active 16' (la VISTA de cámara, 1600x768) queda oculto
//         (rsFlags sin RSFLAG_VISIBLE) porque la secuencia nativa
//         de despliegue no llega → se fuerza visible.
//       - el body lleva el background CSS de la oficina → se quita
//         mientras el monitor esté arriba y se repone al bajarlo.
//   · El monitor se sube/baja con la franja inferior HTML (clic →
//     botón nativo 'flip panel button'); el guion del demo cierra
//     el monitor por su cuenta → el driver lo RE-ABRE mientras el
//     guardia no lo haya bajado él.
//   · Selección de cámara: mini-mapa HTML (solo mando) → clic →
//     botón NATIVO 'cam N' del juego → la vista nativa cambia
//     (verificado: 'cam 8' → Refacciones, 'cam 9' → Escenario).
//     Tras cada movimiento de un animatrónico a la sala vigilada
//     se re-pulsa la cámara para refrescar el frame.
//   · ASOMADOS (bug de identidad): los sprites nativos 'bonnie',
//     'chica', 'foxy', 'toy bonnie', 'BB'... (los animatrónicos
//     asomando en el hall/oficina) nacen OCULTOS con 291+292. El
//     driver muestra EL SPRITE DEL ROL que esté en el hall/oficina
//     — el personaje renderizado coincide SIEMPRE con el
//     seleccionado (bonnie es el conejo morado destrozado).
//   · La caja musical nativa (CÁM 11: 'music button', textos y
//     barra) solo se muestra al vigilar la CÁM 11, como en el
//     juego original. El botón de cuerda sigue en la UI MP.
// v3 (The Lost Pizzeria):
//   · CORTINA MP sobre el menú nativo: el menú del demo es ilegible
//     (sus textos no renderizan con el runtime 291 + datos 292) y
//     lleva a pantallas rotas. En MP se sustituye por una cortina con
//     ▶ EMPEZAR NOCHE — el guardia ya no pelea con el menú nativo.
//   · WATCHDOG de autoridad de frames (200ms): el arranque de la
//     noche ya no depende de una ventana de 20s — el frame 3 se
//     fuerza SIEMPRE hasta que llegue. El splash (0) se salta solo.
//   · CUSTOM NIGHT (frame "customize") BLOQUEADA en multijugador:
//     el watchdog devuelve el juego al menú (13) al instante.
//   · REVANCHA: tras la muerte/victoria, cuando el juego vuelve al
//     menú se rearma la cortina y se avisa a los animatrónicos
//     (mensaje toLobby) — sin recargar la página.
//   · Rebranding: la partida se presenta como THE LOST PIZZERIA.
//
// ⚠️ El FNAF 2 original venía con el Runtime.js MINIFICADO
// (build 292.24): sin nombres internos no se puede pilotar.
// Este repo lo sustituye por el Runtime.js SIN MINIFICAR del
// FNAF 1 (build 291.2) + 2 parches de compatibilidad con los
// datos 292 (parámetro 68 y evaluación de condiciones sin
// tokens) — con eso los nombres ('old bonnie', 'cam 01',
// 'music box counter'...) quedan accesibles y el render de
// cámaras/luces/ataques sigue siendo 100% del motor original.
//
// Sistema del juego (ingeniería inversa E2E):
//   · Cada animatrónico = MARCADOR invisible ('old bonnie',
//     'new freddy', 'balloon boy', 'sockpuppet'...) cuya
//     posición sobre los ANCLAJES ('cam 01'..'cam 12',
//     'hall stage 1/2', 'in office', 'got you box') define su
//     sala. Las cámaras re-renderizan EN VIVO (sprite 'Active 16'
//     cambia de frame por colisión marcador↔ancla).
//   · Contadores clave: 'music box counter' (caja musical),
//     'battery life' (linterna), 'viewing' (monitor), 'lit?',
//     (linterna encendida), 'time of the night' (hora),
//     'night number', 'office occupied', 'in danger',
//     'being attacked by', 'who got you'.
//   · El DEMO corta la noche a los 80s ('time allowed'): en MP
//     se neutraliza. Los marcadores 'new bonnie'/'new chica'
//     nacen EN la oficina: en MP se resetean a sus salas.
//   · Ataques: el que llega a 'in office' activa el estado de
//     ataque nativo; la MÁSCARA del guardia lo espanta. La
//     Marioneta mata con la caja agotada ('got you box').
// ============================================================

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const ROOM = params.get('mp');
    if (!ROOM) return; // un jugador: no hacer nada

    const BRIDGE_VERSION = 'v5-camaras-nativas';
    try { console.log('[MP] guard-bridge ' + BRIDGE_VERSION); } catch (e) { }

    const MY_NAME = params.get('name') || 'Guardia';
    const MP_URL = '../mp/';

    // ---------------------------------------------------------
    // Mapa de FNAF 2 (anclas del juego, posiciones verificadas)
    // ---------------------------------------------------------
    // id → nombre del ancla en el juego
    const ANCHOR = {
        cam8: 'cam 8', cam3: 'cam 3', cam1: 'cam 01', cam5: 'cam 5',
        cam7: 'cam 7', cam4: 'cam 4', cam2: 'cam 2', cam6: 'cam 6',
        cam9: 'cam 9', cam11: 'cam 11', cam10: 'cam 10', cam12: 'cam 12',
        hall1: 'hall stage 1', hall2: 'hall stage 2',
        office: 'in office', box: 'got you box'
    };
    // Nombres CANON de las cámaras (identificación visual de las 12 vistas
    // del juego: salas de fiesta 1-4, conductos, pasillo, refacciones,
    // escenario, área de juegos, rincón de premios y caverna del niño)
    const ROOM_NAME = {
        cam1: 'SALA DE FIESTAS 1 (CÁM 01)', cam2: 'SALA DE FIESTAS 2 (CÁM 02)',
        cam3: 'SALA DE FIESTAS 3 (CÁM 03)', cam4: 'SALA DE FIESTAS 4 (CÁM 04)',
        cam5: 'CONDUCTO DE AIRE IZQ. (CÁM 05)', cam6: 'CONDUCTO DE AIRE DER. (CÁM 06)',
        cam7: 'PASILLO PRINCIPAL (CÁM 07)', cam8: 'REFACCIONES (CÁM 08)',
        cam9: 'ESCENARIO (CÁM 09)', cam10: 'ÁREA DE JUEGOS (CÁM 10)',
        cam11: 'RINCÓN DE PREMIOS (CÁM 11)', cam12: 'CAVERNA DEL NIÑO (CÁM 12)',
        hall1: 'PASILLO PRINCIPAL (TRAMO 1)', hall2: 'FRENTE A LA OFICINA', office: 'OFICINA'
    };
    // grafo de movimiento (geografía del mapa del demo)
    const ADJACENCY = {
        cam8: ['cam3', 'cam7'],
        cam3: ['cam8', 'cam1', 'hall1'],
        cam1: ['cam3', 'cam5', 'hall2'],
        cam5: ['cam1', 'cam6'],
        cam6: ['cam5', 'cam2'],
        cam7: ['cam8', 'cam4', 'cam9'],
        cam4: ['cam7', 'cam2', 'hall1'],
        cam2: ['cam4', 'cam6', 'hall2'],
        cam9: ['cam7', 'cam11'],
        cam11: ['cam9', 'cam10', 'cam12'],
        cam10: ['cam11', 'hall2'],
        cam12: ['cam11'],
        hall1: ['cam3', 'cam4', 'hall2'],
        hall2: ['cam1', 'cam2', 'cam10', 'hall1', 'office'],
        office: ['hall2']
    };
    // marcador del juego por rol
    const MARKER = {
        toy_freddy: 'new freddy', toy_bonnie: 'new bonnie', toy_chica: 'new chica',
        mangle: 'new foxy', bb: 'balloon boy', puppet: 'sockpuppet',
        w_freddy: 'old freddy', w_bonnie: 'old bonnie', w_chica: 'old chica', w_foxy: 'old foxy'
    };
    // sala inicial por rol (posiciones canon del FNAF 2):
    //   toys en el ESCENARIO · withered en REFACCIONES · BB en ÁREA DE
    //   JUEGOS · mangle en su CAVERNA · la marioneta en el RINCÓN DE PREMIOS
    const START_ROOM = {
        toy_freddy: 'cam9', toy_bonnie: 'cam9', toy_chica: 'cam9',
        mangle: 'cam12', bb: 'cam10', puppet: 'cam11',
        w_freddy: 'cam8', w_bonnie: 'cam8', w_chica: 'cam8', w_foxy: 'cam8'
    };
    const ROLE_NAME = {
        guard: 'GUARDIA', toy_freddy: 'TOY FREDDY', toy_bonnie: 'TOY BONNIE',
        toy_chica: 'TOY CHICA', mangle: 'MANGLE', bb: 'BALLOON BOY',
        puppet: 'LA MARIONETA', w_freddy: 'FREDDY DESTROZADO',
        w_bonnie: 'BONNIE DESTROZADO', w_chica: 'CHICA DESTROZADA', w_foxy: 'FOXY DESTROZADO'
    };
    // v5: LA VISTA DE CÁMARA ES 100% NATIVA (sprite 'Active 16').
    // Solo hace falta un mini-mapa HTML como MANDO: sus botones
    // disparan los botones NATIVOS 'cam N' del juego.
    const CAM_BUTTON_NAME = {};
    for (let n = 1; n <= 12; n++) {
        // los anclas/botones nativos se llaman 'cam 01'...'cam 12'
        CAM_BUTTON_NAME[n] = (n === 1) ? 'cam 01' : ('cam ' + n);
    }
    // mini-mapa: posición (%) de cada sala en el mando HTML
    // (layout geográfico del mapa del juego)
    const MAP_DOT = {
        cam8: [7, 6], cam3: [7, 26], cam1: [7, 46], cam5: [7, 66],
        hall1: [29, 26], hall2: [29, 46], office: [29, 66],
        cam7: [52, 6], cam4: [52, 26], cam2: [52, 46], cam6: [52, 66],
        cam9: [78, 6], cam11: [78, 26], cam10: [78, 46], cam12: [78, 66]
    };
    // color del punto por rol (mismo código de colores que el cliente)
    const ROLE_DOT_COLOR = {
        toy_freddy: '#d9a86c', toy_bonnie: '#7ec8e3', toy_chica: '#ffd54d',
        mangle: '#ff8a9e', bb: '#ff7043', puppet: '#e8d6fe',
        w_freddy: '#8d6e4a', w_bonnie: '#9a7fd4', w_chica: '#b8a22e', w_foxy: '#a33d2a'
    };
    // sala (id MP) → número de cámara nativa para re-pulsar tras movimientos
    const ROOM_TO_CAM = {
        cam1: 1, cam2: 2, cam3: 3, cam4: 4, cam5: 5, cam6: 6, cam7: 7,
        cam8: 8, cam9: 9, cam10: 10, cam11: 11, cam12: 12, hall1: 7
    };
    // v6 · HANDLES DE LAS 12 VISTAS DE SALA (extraídos e identificados
    // del imageBank del propio juego, verificados en pantalla con el
    // sprite de cámara 'Active 16'). El monitor muestra estos BITMAPS
    // ORIGINALES del juego — la vista es 100% nativa:
    //   1-4 salas de fiesta · 5/6 conductos · 7 pasillo · 8 refacciones
    //   9 escenario · 10 juegos · 11 premios · 12 caverna
    // Variantes interesantes (por si se quieren ocupantes de fábrica):
    //   176 pasillo-con-Freddy · 168 premios-iluminado · 117 refacciones-cabezas
    const CAM_VIEW_HANDLE = {
        1: 40, 2: 50, 3: 43, 4: 33,
        5: 84, 6: 84, 7: 58, 8: 92,
        9: 118, 10: 123, 11: 83, 12: 129
    };
    // posición inicial (casa) de cada botón 'cam N' del mapa nativo
    // (el guion del demo arrastra el mapa y los botones "corren" por
    // el mundo 1600x768; el ratón del juego no sale de 0..1023 → un
    // botón desplazado es inclikable → se repone a su casa y se clica)
    const CAM_HOME = {
        1: [602, 557], 2: [734, 558], 3: [602, 491], 4: [737, 491],
        5: [608, 651], 6: [723, 651], 7: [758, 431], 8: [603, 420],
        9: [915, 390], 10: [847, 509], 11: [950, 465], 12: [933, 558]
    };
    // sprites NATIVOS de los animatrónicos asomando en hall/oficina
    // (verificados contra el image bank: 'bonnie' = conejo morado
    // destrozado, 'chica' = gallina destrozada...)
    const PEEK_SPRITE = {
        w_bonnie: 'bonnie', w_chica: 'chica', w_foxy: 'foxy',
        toy_bonnie: 'toy bonnie', bb: 'BB', w_freddy: 'freddy under table'
    };
    // sprites de la caja musical nativa (CÁM 11)
    const BOX_SPRITES = ['music button', 'wind up text', 'click and hold text', 'music box counter'];
    // sprites que TAPAN la vista nativa del monitor (nacen torcidos)
    const CAM_BLIGHTS = ['white button', 'blip 2', 'flip animation'];
    // contadores de IA que hay que congelar (todos, en ambos sets)
    const AI_COUNTERS = [
        'freddy AI', 'bonie AI', 'chica AI', 'foxy AI', 'BB AI',
        'toy freddy AI', 'toy bonnie AI', 'toy chica AI', 'mangle AI', 'golden freddy AI',
        'old Freddy AI', 'old Bonnie AI', 'old Chica AI', 'old Foxy AI',
        'new Freddy AI', 'new Bonnie AI', 'new Chica AI', 'new Foxy AI',
        'Balloon Boy AI', 'Sockpuppet AI', 'Paperpals AI', 'Golden Freddy AI'
    ];

    // ---------------------------------------------------------
    // Balanceo
    // ---------------------------------------------------------
    const MANGLE_CD = 5000;       // mangle trepa más rápido
    function nightMoveCd(night) { // progresión: 6s en N1 → 3s en N5+
        return Math.max(3000, 6000 - 750 * (Math.max(1, night) - 1));
    }
    const OFFICE_MS = 8000;       // anti-camping en la oficina
    const MASK_WINDOW_MS = 3000;  // tiempo del guardia para máscarse
    const KILL_FALLBACK_MS = 30000;
    const STUN_MS = 5000;         // ⚡ destello
    const STUN_MAX = 2;
    const STUN_CD_MS = 12000;
    const BOX_KILL_MS = 4000;     // marioneta: caja agotada → ventana de kill
    const BOX_GRACE_MS = 20000;   // v4: sin marioneta jugadora → gracia para dar cuerda
    const HOUR_MS = 70000;        // cada hora del MP dura 70s (noche ~7min)
    const NIGHT_FRAME = 3;        // frame del juego = la noche

    // ----- mapa de frames del demo (ingeniería inversa, v3) -----
    // 0 splash · 2 "what day" (tarjeta previa a la noche: camino de
    // New Game) · 3 LA NOCHE · 12 "customize" = CUSTOM NIGHT ·
    // 13 "dream" = menú principal · 14/15 "error" (glitch) ·
    // 4 static · 5 next day · 6 gameover · 19/23/24 minijuegos
    const SPLASH_FRAME = 0;
    const MENU_FRAME = 13;
    const DAY_CARD_FRAME = 2;
    const CUSTOMIZE_FRAME = 12;   // la custom night: BLOQUEADA en MP
    const END_OK_FRAMES = [4, 5, 6, 14, 15, 19, 23, 24]; // flujo de fin de noche
    let rematchArmed = false;
    let lastSeenFrame = -1, frameSince = 0, lastBounceToast = 0, forcedQuitAt = 0;

    // ---------------------------------------------------------
    // Caja musical (modelo determinista del HOST)
    // El drenaje nativo del demo es ~324/s (noche de 80s); los writers
    // nativos del contador se desactivan y el nivel lo lleva el host:
    //   · drena 27/s → ~90s por caja llena (hay que dar cuerda ~4-5 veces
    //     por noche de 7 minutos)
    //   · dar cuerda (mantener el botón del overlay) recarga a 180/s
    //   · el nivel se escribe en 'music box counter' para que la BARRA
    //     nativa de la CÁM 11 y la alerta del juego sigan funcionando
    // ---------------------------------------------------------
    const BOX_MAX = 2500;
    const BOX_DRAIN = 27;
    const BOX_WIND = 180;
    const BOX_DRAIN_RUSH = 60;    // habilidad de la marioneta: drenaje 2x+

    // ---------------------------------------------------------
    // Habilidades únicas [Q] por rol (cooldown común 30s)
    // ---------------------------------------------------------
    const SPECIAL_CD = 30000;
    const ABILITIES = {
        toy_freddy: { key: 'faro', name: 'FAROL', desc: 'Anuncias tu llegada a la oficina… aunque no estés ahí (broma: banner falso 2.5s)' },
        toy_bonnie: { key: 'haze', name: 'INTERFERENCIA', desc: 'Estática en el monitor del guardia 3s' },
        toy_chica: { key: 'noise', name: 'CUPCAKE', desc: 'Golpes metálicos: el guardia no distingue de dónde vienes (4s)' },
        mangle: { key: 'radio', name: 'RADIO ROTA', desc: 'Estática a todo volumen: drena 10% de su batería (4s)' },
        bb: { key: 'blockbox', name: 'GLOBOS', desc: 'Lluvia de globos: el guardia NO puede dar cuerda a la caja 6s' },
        puppet: { key: 'rush', name: 'MELODÍA MISTERIOSA', desc: 'La caja musical se agota el doble de rápido durante 8s' },
        w_freddy: { key: 'faro', name: 'BURLA', desc: 'Tu sombra asoma en la oficina sin estar ahí (banner falso 2.5s)' },
        w_bonnie: { key: 'haze', name: 'TORMENTO', desc: 'Tu cara sin frente llena de estática el monitor 3s' },
        w_chica: { key: 'noise', name: 'CAZUELAS', desc: 'Ruido de cocina atronador: el guardia pierde la pista (4s)' },
        w_foxy: { key: 'sprint', name: 'SPRINT', desc: 'Corres el doble de rápido durante 6s' }
    };

    // ---------------------------------------------------------
    // Captura de la instancia del Runtime (sin tocar el juego)
    // ---------------------------------------------------------
    let rt = null;
    (function trapRuntime() {
        let _R;
        Object.defineProperty(window, 'Runtime', {
            configurable: true,
            enumerable: true,
            get: function () { return _R; },
            set: function (v) {
                _R = function () {
                    v.apply(this, arguments);
                    rt = this;
                    // encadenar con el estabilizador de 2/index.html: su trap
                    // de Runtime quedó reemplazado por el nuestro, así que su
                    // envoltura anti-congelamiento la instalamos desde aquí
                    try {
                        if (typeof window.__gameStabilize === 'function') {
                            window.__gameStabilize(rt.application);
                        }
                    } catch (e) { }
                    onRuntimeReady();
                    return this;
                };
            }
        });
    })();

    function loadScript(src) {
        return new Promise(res => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => res(true);
            s.onerror = () => res(false);
            document.head.appendChild(s);
        });
    }

    async function loadScriptFB(urls) {
        for (let i = 0; i < urls.length; i++) {
            if (await loadScript(urls[i])) {
                if (typeof window.Peer !== 'undefined') return true;
            }
        }
        return typeof window.Peer !== 'undefined';
    }

    // ---------------------------------------------------------
    // Utilidades del runtime
    // ---------------------------------------------------------
    function app() { return rt ? rt.application : null; }
    function find(name) {
        const a = app();
        if (!a || !a.run) return null;
        const run = a.run;
        for (let i = 0; i < run.rhNObjects; i++) {
            const o = run.rhObjectList[i];
            if (o && o.hoOiList && o.hoOiList.oilName === name) return o;
        }
        return null;
    }
    function rs(name) { const o = find(name); return (o && typeof o.rsValue === 'number') ? o.rsValue : null; }
    function setRS(name, val) {
        const o = find(name);
        if (o && typeof o.rsValue === 'number') { o.rsValue = val; return true; }
        return false;
    }
    function altVal(name, idx, val) {
        const o = find(name);
        if (!o || !o.rov || !o.rov.rvValues) return null;
        if (val === undefined) return o.rov.rvValues[idx];
        o.rov.rvValues[idx] = val;
        return true;
    }
    // teletransportar un marcador a un ancla (mangle=1 fuerza re-render)
    function tpMarker(role, roomId) {
        const m = find(MARKER[role]);
        const an = find(ANCHOR[roomId]);
        if (!m || !an) return false;
        m.hoX = an.hoX;
        m.hoY = an.hoY;
        if (m.rom) m.rom.rmMangle = 1;
        return true;
    }
    function gameClick(fx, fy) {
        const a = app();
        if (!a) return;
        const canvas = a.canvas;
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + fx * (rect.width / a.gaCxWin);
        const clientY = rect.top + fy * (rect.height / a.gaCyWin);
        const mk = (type, btns) => new PointerEvent(type, {
            bubbles: true, cancelable: true, composed: true,
            clientX, clientY, button: 0, buttons: btns,
            pointerId: 1, pointerType: 'mouse', isPrimary: true, view: window
        });
        // v5: primero MOVER el ratón del runtime a la posición (el
        // clic en objeto se evalúa contra la posición trackeada por
        // pointermove — sin esto el clic cae donde estaba el ratón)
        canvas.dispatchEvent(mk('pointermove', 0));
        canvas.dispatchEvent(mk('pointerdown', 1));
        setTimeout(() => canvas.dispatchEvent(mk('pointerup', 0)), 90);
    }

    // ---------------------------------------------------------
    // v4 · DESTIERRO DEL "blackout": el sprite nace roto (runtime 291
    // + datos 292) y cubre la oficina de negro opaco. Fuera de pantalla
    // la oficina renderiza nativa (escritorio, ventilador, pasillo,
    // linterna CTRL). Se llama del estabilizador cada 500ms.
    // ---------------------------------------------------------
    function banishBlackout() {
        const bo = find('blackout');
        if (!bo) return;
        // dentro de la ventana (con margen por el pan) → desterrar
        if (bo.hoX > -400 || bo.hoY > -400) {
            bo.hoX = -3000;
            bo.hoY = -3000;
            if (bo.rom) bo.rom.rmMangle = 1;   // fuerza re-creación del sprite
        }
    }


    // ---------------------------------------------------------
    // El INIT nativo de la noche (grupo con ~11 acciones seguidas de
    // "posicionar a objeto" sobre los marcadores) coloca a new bonnie
    // y new chica DENTRO de la oficina: el ataque nativo arranca en el
    // tick 1 y su animación termina en GOLEVEL = noche muerta aunque
    // después teletransportemos (la muerte aleatoria a los 10-30s).
    // Se desactiva ese grupo; las posiciones las fija el MP.
    // ---------------------------------------------------------
    function disableNightInitEvents() {
        const a = app();
        if (!a || !a.run || !a.run.rhEvtProg) return;
        const markerOis = {};
        try {
            const list = a.run.rhOiList;
            for (let i = 0; i < a.run.rhMaxOI; i++) {
                const oi = list[i];
                if (oi && oi.oilName) {
                    Object.keys(MARKER).forEach(role => {
                        if (oi.oilName === MARKER[role]) markerOis[i] = oi.oilName;
                    });
                }
            }
        } catch (e) { }
        const groups = a.run.rhEvtProg.events || [];
        let disabled = 0;
        groups.forEach(grp => {
            if (!grp || !grp.evgEvents) return;
            let posActs = 0, markerActs = 0;
            grp.evgEvents.forEach((ev, i) => {
                if (i < grp.evgNCond) return;   // solo acciones
                if (ev && ev.evtCode === 65538 && ev.evtOiList !== undefined && markerOis[ev.evtOiList]) {
                    posActs++; markerActs++;
                }
            });
            // el grupo-init: ≥6 reposiciones de marcadores de golpe
            if (posActs >= 6) {
                grp.evgFlags |= 0x4000;   // EVGFLAGS_INACTIVE
                disabled++;
            }
        });
        try { console.log('[MP] grupos-init desactivados: ' + disabled); } catch (e) { }
    }

    // ---------------------------------------------------------
    // Estado MP
    // ---------------------------------------------------------
    const state = {
        phase: 'boot',            // boot → lobby → night → end
        night: 1,
        mpHour: 12,               // reloj MP: la hora la marca el host
        hourAt: 0,
        players: {},              // role → {name, room, lastMove, inOffice, ready}
        host: null,               // MP.Host
        stunUntil: 0,
        stunCharges: STUN_MAX,
        stunLastUse: 0,
        boxEmptyAt: 0,
        puppetRush: false,
        endsAt: 0,
        killDone: false,
        // caja musical (modelo del host)
        boxLevel: BOX_MAX,
        boxWinding: false,        // el guardia mantiene el botón de cuerda
        boxBlockedUntil: 0,       // habilidad de BB: cuerda bloqueada
        boxRushUntil: 0,          // habilidad de la marioneta: drenaje 2x
        boxLastTick: 0,
        // habilidades [Q]
        specialAt: {},            // role → último uso
        sprintUntil: {},          // role → sprint activo hasta
        // linterna robada por BB
        batteryBlockUntil: 0
    };
    window.__MP = {
        find, rs, app: () => app(), state,
        gameClick,
        version: BRIDGE_VERSION,
        startNightForTests: () => startNight()
    };

    // ---------------------------------------------------------
    // UI del guardia (overlay HTML, sin tocar el juego)
    // ---------------------------------------------------------
    function ensureGuardUI() {
        if (document.getElementById('mp-guard-ui')) return;
        const d = document.createElement('div');
        d.id = 'mp-guard-ui';
        d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;font-family:monospace;color:#cfe8ff;background:rgba(0,0,20,.72);border:1px solid #2c4a6a;padding:8px 12px;border-radius:6px;font-size:13px;line-height:1.5;pointer-events:none;max-width:340px';
        d.innerHTML =
            '<div id="mp-g-title" style="color:#7ec8ff;font-weight:bold;letter-spacing:1px">MP · GUARDIA</div>' +
            '<div id="mp-g-line">conectando…</div>' +
            '<div id="mp-box-wrap" style="display:none;margin-top:6px">' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;color:#9db8d8"><span>🎵 CAJA MUSICAL</span><span id="mp-box-pct">100%</span></div>' +
            '<div style="width:100%;height:8px;background:#0a1522;border:1px solid #2c4a6a;border-radius:4px;overflow:hidden;margin-top:2px">' +
            '<div id="mp-box-bar" style="width:100%;height:100%;background:linear-gradient(90deg,#3d80ff,#7ec8ff)"></div></div>' +
            '<button id="mp-wind-btn" style="pointer-events:auto;width:100%;margin-top:4px;background:#123;border:1px solid #7ec8ff;color:#cfe8ff;font-family:monospace;font-weight:bold;padding:5px 8px;cursor:pointer;border-radius:4px;font-size:12px">🎵 DAR CUERDA (mantener)</button>' +
            '</div>' +
            '<button id="mp-stun-btn" style="pointer-events:auto;display:none;margin-top:6px;background:#123;border:1px solid #7ec8ff;color:#cfe8ff;font-family:monospace;font-weight:bold;padding:6px 12px;cursor:pointer;border-radius:4px">⚡ DESTELLO [F] (<span id="mp-stun-n">2</span>)</button>';
        document.body.appendChild(d);
        const b = document.getElementById('mp-stun-btn');
        b.addEventListener('click', useStun);
        // dar cuerda: mantener pulsado
        const w = document.getElementById('mp-wind-btn');
        const windOn = (e) => { e.preventDefault(); if (Date.now() < state.boxBlockedUntil) { toast('🎈 ¡GLOBOS! — no puedes dar cuerda (' + Math.ceil((state.boxBlockedUntil - Date.now()) / 1000) + 's)'); return; } state.boxWinding = true; w.style.background = '#1a4a2a'; };
        const windOff = () => { state.boxWinding = false; w.style.background = '#123'; };
        w.addEventListener('mousedown', windOn);
        w.addEventListener('touchstart', windOn, { passive: false });
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => w.addEventListener(ev, windOff));
        window.addEventListener('keydown', (e) => {
            if ((e.key === 'f' || e.key === 'F') && state.phase === 'night') useStun();
            if (e.code === 'Space' && state.phase === 'night' && e.target === document.body) { windOn(e); }
        });
        ['keyup'].forEach(ev => window.addEventListener(ev, (e) => { if (e.code === 'Space') windOff(); }));
    }
    function gline(txt) { const el = document.getElementById('mp-g-line'); if (el) el.innerHTML = txt; }
    function toast(txt, ms) {
        let t = document.getElementById('mp-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'mp-toast';
            t.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99999;font-family:monospace;color:#ffd34d;background:rgba(0,0,0,.8);border:1px solid #5a4a1a;padding:8px 16px;border-radius:6px;font-size:14px;pointer-events:none;text-align:center;max-width:80vw';
            document.body.appendChild(t);
        }
        t.textContent = txt;
        t.style.display = 'block';
        clearTimeout(t.__t);
        t.__t = setTimeout(() => { t.style.display = 'none'; }, ms || 3500);
    }

    // ---------------------------------------------------------
    // v5 · MONITOR DE CÁMARAS 100% NATIVO
    // La vista que ve el guardia la dibuja EL MOTOR ORIGINAL
    // (sprite 'Active 16' con el bitmap nativo de cada sala).
    // El driver solo:
    //   1. destierra los sprites torcidos que la tapan
    //      ('white button' rect blanco + 'blip 2'/'flip animation'
    //      overlays de transición eternos),
    //   2. fuerza 'Active 16' visible,
    //   3. quita el background CSS de la oficina mientras el
    //      monitor esté arriba (y lo repone al bajarlo),
    //   4. re-abre el monitor si el guion del demo lo cierra
    //      por su cuenta (mientras el guardia no lo haya bajado),
    //   5. muestra la caja musical nativa solo en la CÁM 11.
    // El mini-mapa HTML es SOLO un mando: cada botón dispara el
    // botón 'cam N' NATIVO del juego (la vista cambia por el
    // propio motor, verificada en vivo: 'cam 8' → Refacciones).
    // ---------------------------------------------------------
    let monitorUI = null;

    function ensureMonitorUI() {
        if (monitorUI) return;
        const d = document.createElement('div');
        d.id = 'mp-monitor-ui';
        d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9000;pointer-events:none;font-family:monospace';
        // franja central: subir/bajar el monitor (clic nativo)
        const btn = document.createElement('button');
        btn.id = 'mp-flip-btn';
        btn.textContent = '▲ SUBIR MONITOR';
        btn.style.cssText = 'pointer-events:auto;background:#0a1626;border:1px solid #7ec8ff;color:#cfe8ff;font-family:monospace;font-weight:bold;font-size:15px;letter-spacing:2px;padding:10px 30px;cursor:pointer;border-radius:6px;position:absolute;left:50%;bottom:12px;transform:translateX(-50%)';
        btn.addEventListener('click', () => { toggleMonitor(); });
        d.appendChild(btn);
        // mini-mapa: SOLO mando → botones nativos 'cam N'
        const map = document.createElement('div');
        map.id = 'mp-cam-map';
        map.style.cssText = 'position:absolute;right:14px;bottom:14px;pointer-events:auto;background:rgba(4,6,10,.82);border:1px solid #2c3140;padding:10px';
        map.innerHTML = '<div style="font-size:10px;color:#667;letter-spacing:2px;margin-bottom:6px">CÁMARAS · VISTA NATIVA</div>';
        const layout = [[8, 3, 7], [1, 5, 9, 11], [4, 2, 6, 10, 12]];
        layout.forEach(row => {
            const r = document.createElement('div');
            r.style.cssText = 'display:flex;gap:4px;margin-bottom:4px';
            row.forEach(n => {
                const b = document.createElement('button');
                b.id = 'mp-cambtn-' + n;
                b.textContent = ('0' + n).slice(-2);
                b.title = ROOM_NAME['cam' + n] || ('CÁM ' + n);
                b.style.cssText = 'width:38px;height:30px;font-family:monospace;font-weight:bold;font-size:12px;background:#0d1017;color:#7d8494;border:1px solid #2c3140;cursor:pointer';
                b.addEventListener('click', () => { clickCamButton(n); });
                r.appendChild(b);
            });
            map.appendChild(r);
        });
        d.appendChild(map);
        document.body.appendChild(d);
        monitorUI = d;
    }

    function toggleMonitor() {
        if (state.phase !== 'night') return;
        state.lastFlipClick = Date.now();
        state.wantMonitor = !state.wantMonitor;
        setNativeMonitor(state.wantMonitor);
        if (state.wantMonitor && !state.viewingMP) {
            // al abrirlo por primera vez: el ESCENARIO (como el juego)
            setTimeout(() => { if (state.monitorUp) clickCamButton(9); }, 400);
        } else if (state.wantMonitor && state.viewingMP) {
            // el monitor vuelve a la última cámara vigilada
            setTimeout(() => { if (state.monitorUp && state.viewingMP) clickCamButton(state.viewingMP); }, 400);
        }
    }

    // estado del monitor nativo: el alterable 0 del botón 'flip panel
    // button' es el estado lógico que el propio juego lee (el overlay
    // v4 ya lo usaba para detectar el monitor). Al escribirlo no
    // dependemos del clic nativo de la franja (que con 291+292 es
    // intermitente); la vista la despliega el driver.
    function setNativeMonitor(open) {
        const fp = find('flip panel button');
        if (!fp || !fp.rov || !fp.rov.rvValues) return;
        fp.rov.rvValues[0] = open ? 1 : 0;
    }

    function clickCamButton(n) {
        if (n < 1 || n > 12) return;
        // v6.1 · doble vía:
        //  (1) el BITMAP ORIGINAL de la sala directo al sprite de cámara
        //      (rcImage + rcChanged + rmMangle) y el contador para la
        //      lógica nativa (caja en CÁM 11, etc.),
        //  (2) el botón nativo 'cam N' repuesto a su posición inicial
        //      + clic — dispara el despliegue completo del juego
        //      (los eventos nativos muestran la vista cuando llegan a
        //      procesarse; el mapa del demo arrastra los botones y se
        //      vuelven inclikables, de ahí el reposicionamiento).
        setRS('viewing', n);
        setRS('last viewed', n);
        state.viewingMP = n;
        state.lastCamClick = Date.now();
        const a16 = find('Active 16');
        if (a16 && CAM_VIEW_HANDLE[n]) {
            a16.roc.rcImage = CAM_VIEW_HANDLE[n];
            a16.roc.rcChanged = true;
            if (a16.rom) a16.rom.rmMangle = 1;
        }
        const o = find(CAM_BUTTON_NAME[n]);
        if (o && CAM_HOME[n]) {
            o.hoX = CAM_HOME[n][0];
            o.hoY = CAM_HOME[n][1];
            if (o.rom) o.rom.rmMangle = 1;
            setTimeout(() => { gameClick(o.hoX, o.hoY); }, 200);
        }
        for (let k = 1; k <= 12; k++) {
            const b = document.getElementById('mp-cambtn-' + k);
            if (b) {
                const on = (k === n);
                b.style.background = on ? '#3d80ff' : '#0d1017';
                b.style.color = on ? '#fff' : '#7d8494';
                b.style.borderColor = on ? '#7ec8ff' : '#2c3140';
            }
        }
    }

    // re-pulsar la cámara vigilada tras un movimiento (refresca el
    // frame por si el motor incorpora al ocupante)
    function scheduleCamRepulse(delay) {
        clearTimeout(state.__camRepulse);
        state.__camRepulse = setTimeout(() => {
            if (state.phase !== 'night' || !state.monitorUp || !state.viewingMP) return;
            if (Date.now() - (state.lastCamClick || 0) < 400) return;
            clickCamButton(state.viewingMP);
        }, delay || 700);
    }

    function banishCamBlights() {
        CAM_BLIGHTS.forEach(nm => {
            const o = find(nm);
            if (o && (o.hoX > -400 || o.hoY > -400)) {
                o.hoX = -5000;
                o.hoY = -5000;
                if (o.rom) o.rom.rmMangle = 1;
            }
        });
    }

    // RADAR del mini-mapa: puntos con la posición EN VIVO de cada
    // animatrónico (la vista de cámara es 100% nativa del motor; los
    // puntos del mando reflejan el movimiento online de los jugadores)
    function updateMapDots() {
        const map = document.getElementById('mp-cam-map');
        if (!map) return;
        let layer = document.getElementById('mp-cam-dots');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'mp-cam-dots';
            layer.style.cssText = 'position:relative;height:64px;margin-top:8px;background:rgba(10,14,22,.6);border:1px solid #1d2736;border-radius:4px;overflow:hidden';
            map.appendChild(layer);
        }
        let html = '';
        Object.keys(MARKER).forEach(role => {
            const p = state.players[role];
            const room = p ? p.room : START_ROOM[role];
            const pos = MAP_DOT[room];
            if (!pos) return;
            html += '<div title="' + (ROLE_NAME[role] || role) + (p ? ' (' + p.name + ')' : ' · IA') +
                '" style="position:absolute;left:' + pos[0] + '%;top:' + pos[1] * 0.88 + '%;width:9px;height:9px;margin:-4px;border-radius:50%;background:' +
                (ROLE_DOT_COLOR[role] || '#888') + ';border:1px solid rgba(255,255,255,.5);box-shadow:0 0 6px ' + (ROLE_DOT_COLOR[role] || '#888') +
                ';opacity:' + (p ? 1 : .45) + '"></div>';
        });
        // la cámara vigilada
        if (state.viewingMP && MAP_DOT['cam' + state.viewingMP]) {
            const vp = MAP_DOT['cam' + state.viewingMP];
            html += '<div style="position:absolute;left:' + vp[0] + '%;top:' + vp[1] * 0.88 + '%;width:12px;height:12px;margin:-6px;border:2px solid #7ec8ff;border-radius:2px;box-shadow:0 0 8px #7ec8ff"></div>';
        }
        layer.innerHTML = html;
    }

    function driveNativeMonitor() {
        const a = app();
        const inNight = !!(a && a.currentFrame === NIGHT_FRAME && state.phase === 'night');
        if (!inNight) {
            if (state.bgHidden) { document.body.style.backgroundImage = ''; state.bgHidden = false; }
            if (monitorUI) monitorUI.style.display = 'none';
            return;
        }
        ensureMonitorUI();
        monitorUI.style.display = 'block';
        const fp = find('flip panel button');
        const open = !!(fp && fp.rov && fp.rov.rvValues && fp.rov.rvValues[0] === 1);
        state.monitorUp = open;
        const flipBtn = document.getElementById('mp-flip-btn');
        if (flipBtn) flipBtn.textContent = open ? '▼ BAJAR MONITOR' : '▲ SUBIR MONITOR';
        if (!open) {
            // el guion del demo cierra el monitor por su cuenta:
            // re-abrirlo mientras el guardia no lo haya bajado él
            if (state.wantMonitor && !state.killDone && Date.now() - (state.lastFlipClick || 0) > 1500) {
                setNativeMonitor(true);
                if (!state.viewingMP) {
                    setTimeout(() => { if (state.monitorUp) clickCamButton(9); }, 400);
                } else {
                    setTimeout(() => { if (state.monitorUp && state.viewingMP) clickCamButton(state.viewingMP); }, 400);
                }
            }
            if (state.bgHidden) { document.body.style.backgroundImage = ''; state.bgHidden = false; }
            return;
        }
        // monitor ARRIBA: la vista NATIVA manda
        if (!state.bgHidden) { document.body.style.backgroundImage = 'none'; state.bgHidden = true; }
        banishCamBlights();
        const a16 = find('Active 16');
        if (a16 && a16.ros && !(a16.ros.rsFlags & 0x20)) {
            a16.ros.rsFlags |= 0x20;      // RSFLAG_VISIBLE
            if (a16.rom) a16.rom.rmMangle = 1;
        }
        // v6 · GUERRA CON EL GUION DEL DEMO: el guion vuelve a poner su
        // mapa de "señal interrumpida" (rcImage de mapa + estática +
        // el sprite 'Active 15' — el mapa grande — encima de la vista)
        // cada pocos segundos. El driver repone el BITMAP ORIGINAL de
        // la sala vigilada cada 250ms (gana siempre), apaga la
        // estática salvo durante el flash del cambio y oculta el mapa.
        if (state.viewingMP && CAM_VIEW_HANDLE[state.viewingMP] && a16) {
            const want = CAM_VIEW_HANDLE[state.viewingMP];
            if (a16.roc.rcImage !== want) {
                a16.roc.rcImage = want;
                a16.roc.rcChanged = true;
                if (a16.rom) a16.rom.rmMangle = 1;
            }
            if (Date.now() - (state.lastCamClick || 0) > 600) {
                const st = find('static');
                if (st && st.ros && (st.ros.rsFlags & 0x20)) st.ros.rsFlags &= ~0x20;
            }
            // el mapa grande del monitor ('Active 15') ENCIMA de la vista
            const a15 = find('Active 15');
            if (a15 && a15.ros && (a15.ros.rsFlags & 0x20)) a15.ros.rsFlags &= ~0x20;
        }
        // radar del mini-mapa (posición en vivo de los animatrónicos)
        updateMapDots();
        // caja musical nativa: sus sprites solo en la CÁM 11 (los
        // eventos del juego los re-muestran si solo se ocultan →
        // se DESTIERRAN por posición y se restauran al vigilar la 11)
        const showBox = (state.viewingMP === 11);
        if (!state.__boxHome) state.__boxHome = {};
        BOX_SPRITES.forEach(nm => {
            const o = find(nm);
            if (!o) return;
            if (state.__boxHome[nm] === undefined && (o.hoX > -400 || o.hoY > -400)) {
                state.__boxHome[nm] = [o.hoX, o.hoY];
            }
            const home = state.__boxHome[nm];
            if (showBox) {
                if (home && (o.hoX !== home[0] || o.hoY !== home[1])) {
                    o.hoX = home[0]; o.hoY = home[1];
                    if (o.rom) o.rom.rmMangle = 1;
                }
            } else if (o.hoX > -400 || o.hoY > -400) {
                o.hoX = -6000; o.hoY = -6000;
                if (o.rom) o.rom.rmMangle = 1;
            }
        });
    }

    // ASOMADOS: sprites nativos del animatrónico que asoma en el
    // hall/oficina. Solo se muestran con el monitor BAJADO (la
    // oficina a la vista); el sprite SIEMPRE corresponde al rol
    // del jugador que está ahí (bug de identidad corregido:
    // 'bonnie' = el conejo morado destrozado del rol w_bonnie).
    function drivePeekSprites() {
        const a = app();
        if (!a || a.currentFrame !== NIGHT_FRAME || state.phase !== 'night') return;
        const peeks = {};
        if (!state.monitorUp) {
            Object.keys(MARKER).forEach(role => {
                const p = state.players[role];
                const room = p ? p.room : null;
                if ((room === 'hall1' || room === 'hall2' || room === 'office') && PEEK_SPRITE[role]) {
                    peeks[PEEK_SPRITE[role]] = true;
                }
            });
        }
        Object.keys(PEEK_SPRITE).forEach(role => {
            const o = find(PEEK_SPRITE[role]);
            if (!o || !o.ros) return;
            if (peeks[PEEK_SPRITE[role]]) o.ros.rsFlags |= 0x20;
            else o.ros.rsFlags &= ~0x20;
        });
    }


    // ---------------------------------------------------------
    // ⚡ DESTELLO del guardia (portado del FNAF 1 MP)
    // ---------------------------------------------------------
    function useStun() {
        if (state.phase !== 'night') return;
        const now = Date.now();
        if (now < state.stunUntil) { toast('⚡ Ya estás cegado por tu propio destello'); return; }
        if (now - state.stunLastUse < STUN_CD_MS) { toast('⚡ Destello recargando (' + Math.ceil((STUN_CD_MS - (now - state.stunLastUse)) / 1000) + 's)'); return; }
        if (state.stunCharges <= 0) { toast('⚡ Sin cargas (recarga +1 por hora)'); return; }
        state.stunCharges--;
        state.stunLastUse = now;
        state.stunUntil = now + STUN_MS;
        flashEffect();
        broadcast({ t: 'guardStun', ms: STUN_MS });
        // echa de la oficina a quien esté dentro (sin kill en curso)
        Object.keys(state.players).forEach(role => {
            const p = state.players[role];
            if (p && p.room === 'office' && !p.killing) {
                retreat(role, 'hall2', 'destello del guardia');
            }
        });
        gline('⚡ DESTELLO — cargas: ' + state.stunCharges);
        toast('⚡ ¡DESTELLO! Todos aturdidos 5s');
    }
    function flashEffect() {
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99998;pointer-events:none;opacity:.95;transition:opacity .6s';
        document.body.appendChild(f);
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.value = 110;
            g.gain.setValueAtTime(.25, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .5);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + .5);
        } catch (e) { }
        requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = '0'; }));
        setTimeout(() => f.remove(), 700);
    }


    // registro de un animatrónico conectado (con soporte de llegada tardía:
    // si la noche ya corre, se le manda su sala y el estado actual)
    function onClientJoin(entry) {
        if (!entry || !entry.role) return;
        state.players[entry.role] = {
            name: entry.name || 'Jugador', room: START_ROOM[entry.role] || 'cam8',
            lastMove: 0, inOffice: false, ready: false, killing: false
        };
        gline('jugadores: ' + Object.keys(state.players).map(r => ROLE_NAME[r]).join(', '));
        toast(ROLE_NAME[entry.role] + ' (' + entry.name + ') conectado');
        updateCurtainInfo();
        if (state.phase === 'night') {
            // late join: colocar su marcador y avisarle
            tpMarker(entry.role, START_ROOM[entry.role]);
            sendTo(entry, { t: 'nightStart', night: state.night });
        }
        broadcastPlayers();
    }

    // ---------------------------------------------------------
    // Red (host estrella: el guardia manda)
    // ---------------------------------------------------------
    function broadcast(msg) {
        if (state.host) state.host.broadcast(msg);
    }
    function sendTo(entry, msg) {
        if (state.host) state.host.send(entry, msg);
    }

    async function startNetwork() {
        const ok = await loadScriptFB([
            'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
            'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'
        ]);
        if (!ok || typeof Peer === 'undefined') {
            gline('⚠ sin módulo de red — modo local');
            return;
        }
        await loadScript(MP_URL + 'net.js?v=2');
        if (typeof MP === 'undefined') {
            gline('⚠ sin capa de red — modo local');
            return;
        }
        const host = new MP.Host();
        state.host = host;
        host.on('hello', (m, entry) => { onClientJoin(entry); });
        host.on('__disconnect', (entry) => {
            if (entry && entry.role && state.players[entry.role]) {
                toast(ROLE_NAME[entry.role] + ' se desconectó — la IA toma el control… tranquilo, sigue en su sala');
                const p = state.players[entry.role];
                if (p.room === 'office') tpMarker(entry.role, 'hall2');
                delete state.players[entry.role];
                updateCurtainInfo();
                broadcastPlayers();
            }
        });
        host.on('hello', (m, entry) => { /* registrado en __client */ });
        host.on('move', (m, entry) => { onClientMove(entry.role, m); });
        host.on('jumpscare', (m, entry) => { onClientJumpscare(entry.role, m); });
        host.on('puppetEscape', (m, entry) => { onPuppetEscape(entry.role, m); });
        host.on('special', (m, entry) => { onClientSpecial(entry.role, m); });
        host.start(ROOM, (id) => {
            gline('sala ' + ROOM + ' · esperando animatrónicos…');
            updateCurtainInfo();
        }, (entry) => {
            // onClient (tercer argumento de Host.start — net.js NO emite
            // '__client' como evento, se pasa como callback)
            onClientJoin(entry);
        });
    }

    function broadcastPlayers() {
        const list = Object.keys(state.players).map(r => ({
            role: r, name: state.players[r].name, room: state.players[r].room
        }));
        broadcast({
            t: 'players', players: list, night: state.night, phase: state.phase,
            boxPct: Math.max(0, Math.round(state.boxLevel / BOX_MAX * 100)),
            moveCd: nightMoveCd(state.night)
        });
    }

    // ---------------------------------------------------------
    // Movimiento del cliente (autoridad del host)
    // ---------------------------------------------------------
    function onClientMove(role, m) {
        if (state.phase !== 'night') return;
        const p = state.players[role];
        if (!p) return;
        const now = Date.now();
        if (now < state.stunUntil) { sendMoveDeny(role, m, 'aturdido por el destello'); return; }
        let cd = role === 'mangle' ? MANGLE_CD : nightMoveCd(state.night);
        if (state.sprintUntil[role] && now < state.sprintUntil[role]) cd = Math.max(1500, Math.round(cd / 2));
        if (now - p.lastMove < cd) {
            sendMoveDeny(role, m, 'cooldown ' + Math.ceil((cd - (now - p.lastMove)) / 1000) + 's');
            return;
        }
        const from = p.room;
        const to = m.room;
        if (!ANCHOR[to]) { sendMoveDeny(role, m, 'sala inexistente'); return; }
        if (!(ADJACENCY[from] || []).includes(to)) { sendMoveDeny(role, m, 'no es adyacente'); return; }
        // la oficina solo con la caja musical NO agotada (la marioneta es la excepción)
        p.room = to;
        p.lastMove = now;
        tpMarker(role, to);
        if (to === 'office') {
            p.enteredOfficeAt = now;
            p.inOffice = true;
            onOfficeEntry(role);
        } else {
            p.inOffice = false;
            p.killing = false;
        }
        broadcast({ t: 'moved', role: role, room: to, roomName: ROOM_NAME[to] });
        broadcastPlayers();
        // v5: si el guardia está vigilando la sala a la que ha
        // llegado el jugador → re-pulsar la cámara para que el
        // frame nativo incorpore al ocupante
        if (state.monitorUp && ROOM_TO_CAM[to] === state.viewingMP) scheduleCamRepulse(700);
    }
    function sendMoveDeny(role, m, why) {
        if (state.host) {
            state.host.conns.forEach(c => {
                if (c.role === role) state.host.send(c, { t: 'moveDeny', why: why });
            });
        }
    }

    // ---------------------------------------------------------
    // Entrada a la oficina: depende del rol
    //   · BB → apaga la linterna y se va riendo (no mata)
    //   · marioneta con caja agotada → kill directo
    //   · demás → el guardia tiene MÁSCARA; si se la pone a tiempo
    //     el animatrónico se retira; si no, kill nativo
    // ---------------------------------------------------------
    function onOfficeEntry(role) {
        const now = Date.now();
        if (role === 'bb') {
            // BB: sin kill — sabotea la linterna DE VERDAD (40s sin batería:
            // el estabilizador no repone 'battery life' mientras dure el robo)
            state.batteryBlockUntil = now + 40000;
            setRS('battery life', 0);
            broadcast({ t: 'bbSabotage', role: 'bb' });
            toast('🎈 BALLOON BOY entró: ¡te quitó la LINTERNA 40s!');
            setTimeout(() => { if (state.players.bb) retreat('bb', 'hall2', 'sabotaje completado'); }, 2500);
            return;
        }
        if (role === 'puppet' && state.boxEmptyAt && now - state.boxEmptyAt < 60000) {
            // la marioneta con la caja agotada mata SIEMPRE
            killGuard('puppet', 'la caja musical se agotó… LA MARIONETA salió');
            return;
        }
        // ataque normal: el guardia ve el banner y debe máscarse
        const p = state.players[role];
        p.killing = false;
        p.maskDeadline = now + MASK_WINDOW_MS;
        broadcast({ t: 'officeIn', role: role, windowMs: MASK_WINDOW_MS, roomName: ROOM_NAME.office });
        toast('⚠ ' + ROLE_NAME[role] + ' EN LA OFICINA — ¡PONTE LA MÁSCARA!');
        // vigilante de máscara
        checkMaskResponse(role);
    }

    function checkMaskResponse(role) {
        const p = state.players[role];
        if (!p || p.room !== 'office') return;
        const left = p.maskDeadline - Date.now();
        if (left <= 0) {
            // ventana agotada sin máscara → kill
            if (!maskUpNow()) {
                killGuard(role, 'no te pusiste la máscara a tiempo');
            } else {
                retreat(role, 'hall2', 'el guardia se puso la máscara');
            }
            return;
        }
        if (maskUpNow()) {
            // el guardia ya está máscado → retirada
            retreat(role, 'hall2', 'el guardia se puso la máscara');
            return;
        }
        setTimeout(() => checkMaskResponse(role), 250);
    }

    // ¿la máscara está puesta ahora? El botón nativo 'flip mask button'
    // lleva el estado en su alterable 0 (0=arriba/no puesta · 1=abajo/puesta)
    // — verificado en vivo contra los eventos mask up/mask come down.
    function maskUpNow() {
        try {
            const f = find('flip mask button');
            if (f && f.rov && f.rov.rvValues && f.rov.rvValues[0] === 1) return true;
            const m = find('mask up');
            if (m && m.rov && m.rov.rvValues && m.rov.rvValues[0] === 1) return true;
            const mc = find('mask come down');
            if (mc && mc.rov && mc.rov.rvValues && mc.rov.rvValues[0] === 0) return true;
        } catch (e) { }
        return false;
    }

    function retreat(role, toRoom, reason) {
        const p = state.players[role];
        if (!p) return;
        p.room = toRoom;
        p.inOffice = false;
        p.lastMove = Date.now();   // retirada = cooldown también
        tpMarker(role, toRoom);
        broadcast({ t: 'retreat', role: role, room: toRoom, roomName: ROOM_NAME[toRoom], reason: reason });
        broadcastPlayers();
        toast(ROLE_NAME[role] + ' se retira (' + reason + ')');
    }

    // ---------------------------------------------------------
    // Jumpscare decidido por el jugador (estando en la oficina)
    // ---------------------------------------------------------
    function onClientJumpscare(role, m) {
        const p = state.players[role];
        if (!p || state.phase !== 'night') return;
        if (p.room !== 'office') {
            if (state.host) state.host.conns.forEach(c => { if (c.role === role) state.host.send(c, { t: 'moveDeny', why: 'no estás en la oficina' }); });
            return;
        }
        if (role === 'bb') return; // bb no mata
        if (maskUpNow()) {
            retreat(role, 'hall2', 'máscara puesta en tu cara');
            return;
        }
        killGuard(role, 'jumpscare');
    }

    // ---------------------------------------------------------
    // Habilidades únicas [Q] — efecto en el guardia + confirmación
    // ---------------------------------------------------------
    function onClientSpecial(role, m) {
        if (state.phase !== 'night') return;
        const p = state.players[role];
        const ab = ABILITIES[role];
        if (!p || !ab) return;
        const now = Date.now();
        if (now < state.stunUntil) { sendMoveDeny(role, m, 'aturdido por el destello'); return; }
        const last = state.specialAt[role] || 0;
        if (now - last < SPECIAL_CD) {
            if (state.host) state.host.conns.forEach(c => { if (c.role === role) state.host.send(c, { t: 'specialDeny', why: 'recarga ' + Math.ceil((SPECIAL_CD - (now - last)) / 1000) + 's' }); });
            return;
        }
        state.specialAt[role] = now;
        const name = ROLE_NAME[role] || role;
        switch (ab.key) {
            case 'sprint':
                state.sprintUntil[role] = now + 6000;
                toast('🏃 ' + name + ' ha echado a CORRER (6s)');
                break;
            case 'haze':
                overlayEffect('haze', 3000);
                toast('📺 ' + name + ' ha saboteado el MONITOR (3s)');
                break;
            case 'noise':
                overlayEffect('noise', 4000);
                toast('🍲 ¡RUIDO METÁLICO EN LAS TUBERÍAS! (' + name + ')');
                break;
            case 'radio':
                overlayEffect('radio', 4000);
                { const b = rs('battery life'); if (b !== null) setRS('battery life', Math.max(0, b - 250)); }
                toast('📻 ' + name + ' CHILLA por la radio — batería -10%');
                break;
            case 'faro':
                fakeOfficeAlert(role, 2500);
                break;
            case 'blockbox':
                state.boxBlockedUntil = now + 6000;
                state.boxWinding = false;
                toast('🎈 ¡GLOBOS por todas partes! — NO puedes dar cuerda (6s)');
                break;
            case 'rush':
                state.boxRushUntil = now + 8000;
                toast('🎶 La caja se agota EL DOBLE DE RÁPIDO (8s)');
                break;
        }
        if (state.host) state.host.conns.forEach(c => { if (c.role === role) state.host.send(c, { t: 'specialOk', name: ab.name }); });
        broadcast({ t: 'specialFx', role: role, name: ab.name });
    }

    // efectos visibles sobre el guardia (overlays HTML, sin tocar el juego)
    function overlayEffect(kind, ms) {
        let d = document.getElementById('mp-fx');
        if (!d) {
            d = document.createElement('div');
            d.id = 'mp-fx';
            d.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;display:none';
            document.body.appendChild(d);
        }
        if (kind === 'haze') {
            d.style.background = 'repeating-linear-gradient(0deg,rgba(255,255,255,.14) 0 2px,rgba(0,0,0,.28) 2px 4px)';
        } else if (kind === 'noise') {
            d.style.background = 'repeating-linear-gradient(45deg,rgba(255,0,0,.06) 0 12px,rgba(255,255,255,.05) 12px 24px,rgba(0,0,0,.1) 24px 36px)';
        } else if (kind === 'radio') {
            d.style.background = 'repeating-linear-gradient(90deg,rgba(255,60,60,.12) 0 3px,rgba(60,60,255,.1) 3px 6px,rgba(0,0,0,.2) 6px 9px)';
        }
        d.style.display = 'block';
        clearTimeout(d.__t);
        d.__t = setTimeout(() => { d.style.display = 'none'; }, ms);
    }

    // banner FALSO de entrada a la oficina (farol de los freddy)
    function fakeOfficeAlert(role, ms) {
        let d = document.getElementById('mp-fake');
        if (!d) {
            d = document.createElement('div');
            d.id = 'mp-fake';
            d.style.cssText = 'position:fixed;top:16%;left:50%;transform:translateX(-50%);z-index:99999;font-family:monospace;font-weight:bold;color:#ff5b5b;background:rgba(20,0,0,.85);border:2px solid #a33;padding:14px 26px;border-radius:8px;font-size:20px;letter-spacing:2px;pointer-events:none;text-align:center';
            document.body.appendChild(d);
        }
        d.innerHTML = '⚠ ' + (ROLE_NAME[role] || '') + ' EN LA OFICINA<br><span style="font-size:12px;color:#ffb0b0">¡PONTE LA MÁSCARA!</span>';
        d.style.display = 'block';
        clearTimeout(d.__t);
        d.__t = setTimeout(() => { d.style.display = 'none'; }, ms);
    }

    // ---------------------------------------------------------
    // La Marioneta: escape por caja agotada
    // ---------------------------------------------------------
    function onPuppetEscape(role, m) {
        if (role !== 'puppet' || state.phase !== 'night') return;
        if (state.boxLevel > 120 && !state.boxEmptyAt) {
            if (state.host) state.host.conns.forEach(c => { if (c.role === role) state.host.send(c, { t: 'moveDeny', why: 'la caja aún no está agotada' }); });
            return;
        }
        state.puppetRush = true;
        const p = state.players.puppet;
        p.room = 'hall2';
        p.lastMove = Date.now();
        tpMarker('puppet', 'hall2');
        broadcast({ t: 'moved', role: 'puppet', room: 'hall2', roomName: ROOM_NAME.hall2 });
        broadcast({ t: 'puppetOut' });
        toast('🎁 LA CAJA SE AGOTÓ — ¡LA MARIONETA ESTÁ SUELTA!');
        // avanza sola hacia la oficina
        setTimeout(() => {
            if (state.phase === 'night' && state.players.puppet && state.players.puppet.room === 'hall2') {
                state.players.puppet.room = 'office';
                tpMarker('puppet', 'office');
                broadcast({ t: 'officeIn', role: 'puppet', windowMs: 0, roomName: ROOM_NAME.office });
                killGuard('puppet', 'LA MARIONETA llegó — la caja estaba agotada');
            }
        }, 6000);
    }

    // ---------------------------------------------------------
    // Kill / fin de noche
    // ---------------------------------------------------------
    function killGuard(role, reason) {
        if (state.killDone || state.phase !== 'night') return;
        state.killDone = true;
        state.phase = 'end';
        state.endAt = Date.now();
        rematchArmed = false;
        broadcast({ t: 'guardDead', by: role, byName: ROLE_NAME[role] || role, reason: reason });
        toast('💀 ' + (ROLE_NAME[role] || role) + ' te atrapó — ' + reason);
        gline('💀 ATRAPADO por ' + ROLE_NAME[role] + ' — espera: la REVANCHA se arma sola');
        // jumpscare nativo: teletransporta al asesino sobre 'got you box'
        try {
            if (role && MARKER[role]) tpMarker(role, 'box');
            setRS('being attacked by', 1);
        } catch (e) { }
        // fin de la noche nativo: deja que el juego muestre su game over
        setTimeout(() => { try { setRS('time left', 0); } catch (e) { } }, 2500);
    }

    function winNight() {
        if (state.phase !== 'night') return;
        state.phase = 'end';
        state.endAt = Date.now();
        rematchArmed = false;
        broadcast({ t: 'nightEnd', night: state.night });
        toast('🌅 6 AM — ¡SOBREVIVISTE la noche ' + state.night + '!');
        gline('🌅 SOBREVIVISTE — noche ' + state.night);
        state.night++;
        broadcastPlayers();
    }

    // ---------------------------------------------------------
    // v6 · DESACTIVA EL GUION DEL MONITOR DEL DEMO: sus grupos
    // (condicionados por los contadores 'viewing'/'last viewed')
    // vuelven a poner el mapa de "señal interrumpida" (sprite
    // 'Active 15' + estática + rcImage de mapa) CADA TICK — más
    // rápido de lo que cualquier driver pueda reponer la vista.
    // Sin ellos, la vista de cámara queda 100% en manos del
    // puente (rcImage + visibilidades + destierros), que muestra
    // el BITMAP ORIGINAL de la sala vigilada de forma estable.
    // La caja musical no se toca (nivel = contador, no viewing).
    // ---------------------------------------------------------
    function disableMonitorScript() {
        const a = app();
        if (!a || !a.run || !a.run.rhEvtProg) return;
        const targets = { 'viewing': 1, 'last viewed': 1, 'Active 15': 1, 'signal out': 1 };
        const tOi = {};
        try {
            const list = a.run.rhOiList;
            for (let i = 0; i < a.run.rhMaxOI; i++) {
                const oi = list[i];
                if (oi && oi.oilName && targets[oi.oilName]) tOi[i] = oi.oilName;
            }
        } catch (e) { }
        const groups = a.run.rhEvtProg.events || [];
        let disabled = 0;
        groups.forEach(grp => {
            if (!grp || !grp.evgEvents || (grp.evgFlags & 0x4000)) return;
            let touches = false;
            grp.evgEvents.forEach((ev, i) => {
                if (!ev) return;
                if (tOi[ev.evtOiList]) touches = true;
            });
            if (touches) {
                grp.evgFlags |= 0x4000;   // EVGFLAGS_INACTIVE
                disabled++;
            }
        });
        try { console.log('[MP] guion del monitor desactivado: ' + disabled + ' grupos'); } catch (e) { }
    }

    function disableNativeMarkerMovers() {
        const a = app();
        if (!a || !a.run || !a.run.rhEvtProg) return;
        const markerNames = {};
        Object.keys(MARKER).forEach(r => { markerNames[MARKER[r]] = true; });
        const KILL_OIS = ['being attacked by', 'got you box', 'in office', 'office occupied', 'in danger', 'who got you', 'got you stage'];
        const markerOis = {}, killOis = {};
        try {
            const list = a.run.rhOiList;
            for (let i = 0; i < a.run.rhMaxOI; i++) {
                const oi = list[i];
                if (!oi || !oi.oilName) continue;
                if (markerNames[oi.oilName]) markerOis[i] = true;
                if (KILL_OIS.indexOf(oi.oilName) !== -1) killOis[i] = true;
            }
        } catch (e) { }
        const groups = a.run.rhEvtProg.events || [];
        let disabled = 0;
        groups.forEach(grp => {
            if (!grp || !grp.evgEvents || (grp.evgFlags & 0x4000)) return;
            let positionsMarker = false, killRelated = false;
            grp.evgEvents.forEach((ev, i) => {
                if (!ev) return;
                if (i < grp.evgNCond) {
                    // condición sobre la cadena de kill → NO tocar (anim de
                    // muerte, render de oficina, etc.)
                    if (killOis[ev.evtOiList]) killRelated = true;
                } else if (ev.evtCode === 65538 && ev.evtOiList !== undefined && markerOis[ev.evtOiList]) {
                    positionsMarker = true;
                }
            });
            if (positionsMarker && !killRelated) {
                grp.evgFlags |= 0x4000;   // EVGFLAGS_INACTIVE
                disabled++;
            }
        });
        try { console.log('[MP] movers nativos de marcadores desactivados: ' + disabled); } catch (e) { }
    }

    // ---------------------------------------------------------
    // Desactiva los WRITERS nativos de la caja musical: el demo drena
    // el contador a ~324/s (noche de 80s) mediante eventos que lo
    // reescriben cada tick. El nivel pasa a ser 100% del HOST (drena
    // 27/s, cuerda con el botón del overlay) y las CONDICIONES nativas
    // siguen leyéndolo: la barra de la CÁM 11 y el kill canon de la
    // marioneta con la caja agotada siguen funcionando igual.
    // ---------------------------------------------------------
    function disableMusicBoxWriters() {
        const a = app();
        if (!a || !a.run || !a.run.rhEvtProg) return;
        let boxOi = -1;
        try {
            const list = a.run.rhOiList;
            for (let i = 0; i < a.run.rhMaxOI; i++) {
                const oi = list[i];
                if (oi && oi.oilName === 'music box counter') { boxOi = i; break; }
            }
        } catch (e) { }
        if (boxOi < 0) return;
        const groups = a.run.rhEvtProg.events || [];
        let disabled = 0;
        groups.forEach(grp => {
            if (!grp || !grp.evgEvents || (grp.evgFlags & 0x4000)) return;
            let touches = false;
            grp.evgEvents.forEach((ev, i) => {
                if (i < grp.evgNCond) return;   // solo acciones
                if (ev && ev.evtOiList === boxOi) touches = true;
            });
            if (touches) { grp.evgFlags |= 0x4000; disabled++; }
        });
        try { console.log('[MP] writers nativos de la caja desactivados: ' + disabled); } catch (e) { }
    }

    // ---------------------------------------------------------
    // CORTINA MP (v3): sustituye el menú nativo del demo, que es
    // ilegible (los textos no renderizan: runtime 291 + datos 292)
    // y ofrece la custom night desde el principio. Bloquea el
    // lienzo (pointer-events) para que el guardia no pueda pulsar
    // los botones nativos invisibles.
    // ---------------------------------------------------------
    function ensureMenuCurtain() {
        if (document.getElementById('mp-curtain')) return;
        const c = document.createElement('div');
        c.id = 'mp-curtain';
        c.style.cssText = 'position:fixed;inset:0;z-index:9500;pointer-events:auto;' +
            'background:radial-gradient(ellipse at center, rgba(8,8,12,.88) 0%, rgba(3,3,6,.96) 75%);' +
            'display:none;align-items:center;justify-content:center;text-align:center;' +
            'font-family:monospace;color:#cfcfcf';
        c.innerHTML =
            '<div style="max-width:680px;padding:24px">' +
            '<div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#e8e6df;text-shadow:0 0 22px rgba(255,255,255,.35)">THE LOST PIZZERIA</div>' +
            '<div style="font-size:11px;letter-spacing:4px;color:#8f8f8f;margin-top:6px">MULTIJUGADOR · 1 GUARDIA CONTRA 10 ANIMATRÓNICOS</div>' +
            '<div id="mp-curt-info" style="margin:24px 0 6px;font-size:16px;color:#ffd34d;letter-spacing:3px">sala ' + ROOM + '</div>' +
            '<div id="mp-curt-sub" style="font-size:12px;color:#9a9a9a;margin-bottom:20px">comparte el código con tus amigos</div>' +
            '<div id="mp-curt-players" style="font-size:12px;color:#9db8d8;margin-bottom:20px;line-height:1.7">nadie más conectado — los animatrónicos pueden unirse</div>' +
            '<button id="mp-curt-start" style="background:#032;border:1px solid #7ec8ff;color:#cfe8ff;font-family:monospace;font-weight:bold;font-size:18px;letter-spacing:2px;padding:14px 36px;cursor:pointer;border-radius:6px">▶ EMPEZAR NOCHE</button>' +
            '<div style="font-size:11px;color:#7d7d7d;margin-top:16px;line-height:1.7">El menú individual y la CUSTOM NIGHT quedan desactivados en multijugador.<br>Linterna: mantén <b>CTRL</b> · máscara [abajo-izq] · cámaras (mapa clicable) · caja musical · ⚡DESTELLO [F]</div>' +
            '</div>';
        document.body.appendChild(c);
        document.getElementById('mp-curt-start').addEventListener('click', function () {
            startNight();
        });
    }
    function showCurtain() {
        ensureMenuCurtain();
        const c = document.getElementById('mp-curtain');
        const btn = document.getElementById('mp-curt-start');
        const sub = document.getElementById('mp-curt-sub');
        if ((state.started || 0) > 0) {
            btn.textContent = '▶ REVANCHA — NOCHE ' + state.night;
            sub.textContent = state.night > 1
                ? 'noche ' + (state.night - 1) + ' superada · sigue la ' + state.night
                : 'noche ' + state.night + ' terminada · ¡otra oportunidad!';
        } else {
            btn.textContent = '▶ EMPEZAR NOCHE';
            sub.textContent = 'comparte el código con tus amigos';
        }
        c.style.display = 'flex';
        updateCurtainInfo();
    }
    function hideCurtain() {
        const c = document.getElementById('mp-curtain');
        if (c) c.style.display = 'none';
    }
    function updateCurtainInfo() {
        const el = document.getElementById('mp-curt-players');
        if (!el) return;
        const roles = Object.keys(state.players);
        if (!roles.length) {
            el.innerHTML = 'nadie más conectado — los animatrónicos pueden unirse';
        } else {
            el.innerHTML = roles.length + ' animatrónico' + (roles.length > 1 ? 's' : '') +
                ' conectado' + (roles.length > 1 ? 's' : '') + ':<br>' +
                roles.map(r => ROLE_NAME[r]).join(' · ');
        }
    }

    // ---------------------------------------------------------
    // WATCHDOG de autoridad de frames (v3)
    // · boot: salta el splash, deja el menú bajo la cortina y
    //   convierte cualquier llegada a la noche (New Game nativo)
    //   en la noche MP. La CUSTOM NIGHT (frame "customize") se
    //   devuelve al menú al instante. Pantallas raras: al menú.
    // · night: el frame 3 se fuerza SIEMPRE (sin tope de 20s).
    // · end: deja ver el game over; al volver al menú arma la
    //   REVANCHA (cortina + toLobby a los animatrónicos).
    // ---------------------------------------------------------
    function forceFrame(n) {
        const a = app();
        if (!a || !a.run) return;
        try {
            if (a.appRunningState === 3) {          // SL_FRAMELOOP (idle jugando)
                if (a.run.rhQuit === 0) {
                    // CAMINO NATIVO del juego — igual que el ACTION_GOTOLEVEL
                    // de Clickteam: el propio bucle lo procesa en el siguiente
                    // tick (fade out → endFrame → startTheFrame).
                    a.run.rhQuit = 3;                // CRun.LOOPEXIT_GOTOLEVEL
                    a.run.rhQuitParam = (0x8000 | n);
                    forcedQuitAt = Date.now();
                    return;
                }
                // nuestro salto anterior quedó sin procesar (p. ej. pausa por
                // foco ya resuelta): rearmarlo una vez pasados 4s
                if (forcedQuitAt && Date.now() - forcedQuitAt > 4000) {
                    a.run.rhQuit = 0;
                    forcedQuitAt = 0;
                }
                return;
            }
            if (a.appRunningState === 2) {           // SL_FRAMEFADEINLOOP eterno
                try { a.endFrameFadeIn(); } catch (e) { }
                return;                              // siguiente tick reintenta
            }
            if (a.appRunningState === 1) {           // SL_STARTFRAME en marcha
                a.nextFrame = n;                     // fijar el destino
            }
            // estados 4/5: transición del propio juego — dejarla terminar;
            // el watchdog reintenta cada 200ms
        } catch (e) { }
    }
    function bounceToMenu(why) {
        forceFrame(MENU_FRAME);
        const now = Date.now();
        if (now - lastBounceToast > 4000) {
            lastBounceToast = now;
            toast(why || '⛔ Esa pantalla no está disponible en multijugador');
        }
    }
    function frameWatchdog() {
        const a = app();
        if (!a || !a.run) return;
        // MP: la noche es COMPARTIDA — el juego del guardia NUNCA se pausa
        // por pérdida de foco (window.blur). El demo original se pausa
        // (checkFocus → run.pause) y con varias ventanas abiertas el bucle
        // quedaba congelado con saltos sin procesar: era el atasco del
        // arranque. Además el guardia es el host: si cambia de pestaña la
        // noche debe seguir para los animatrónicos.
        try {
            if (a.hasFocus === false || a.bStoppedFocus) {
                a.hasFocus = true;
                a.bStoppedFocus = false;
                try { a.run.resume(); } catch (e) { }
            }
        } catch (e) { }
        const cur = a.currentFrame;
        if (cur !== lastSeenFrame) { lastSeenFrame = cur; frameSince = Date.now(); forcedQuitAt = 0; }

        if (state.phase === 'night') {
            if (cur === NIGHT_FRAME) return;
            // la noche MP vive SOLO en el frame 3: forzarla sin descanso
            forceFrame(NIGHT_FRAME);
            return;
        }
        if (state.phase === 'end') {
            if (cur === MENU_FRAME) { armRematch(); return; }
            if (cur === CUSTOMIZE_FRAME) { bounceToMenu('⛔ La CUSTOM NIGHT no está disponible en multijugador'); return; }
            if (cur === NIGHT_FRAME || cur === DAY_CARD_FRAME) {
                // dejar correr la animación de kill / 6AM del propio frame
                // (el jumpscare nativo vive aquí); si el juego se atasca o
                // quiere reiniciar la noche por su cuenta, a los 8s se le
                // devuelve al menú para armar la REVANCHA
                if (Date.now() - (state.endAt || 0) > 8000) forceFrame(MENU_FRAME);
                return;
            }
            // game over / next day / glitches: dejar respirar… pero con tope
            const stuck = (END_OK_FRAMES.indexOf(cur) === -1) && (Date.now() - frameSince > 10000);
            const tooLong = Date.now() - (state.endAt || 0) > 25000;
            if (stuck || tooLong) forceFrame(MENU_FRAME);
            return;
        }
        // ---- boot ----
        if (cur === SPLASH_FRAME) { forceFrame(MENU_FRAME); return; }   // saltar el splash
        if (cur === MENU_FRAME) return;                                  // menú bajo la cortina
        if (cur === DAY_CARD_FRAME || cur === NIGHT_FRAME) {             // New Game nativo
            startNight();
            return;
        }
        if (cur === CUSTOMIZE_FRAME) {
            bounceToMenu('⛔ La CUSTOM NIGHT no está disponible en multijugador');
            return;
        }
        // pantallas de paso (error/glitch/load): tolerar 10s y al menú
        if (Date.now() - frameSince > 10000) bounceToMenu();
    }

    // revancha: el juego volvió al menú tras morir/ganar
    function armRematch() {
        if (rematchArmed) return;
        rematchArmed = true;
        state.phase = 'boot';
        state.killDone = false;
        broadcast({ t: 'toLobby', night: state.night });
        showCurtain();
        gline('revancha lista — noche ' + state.night + ' · sala ' + ROOM);
        try { console.log('[MP] revancha armada: noche ' + state.night); } catch (e) { }
    }

    // ---------------------------------------------------------
    // Arranque de la noche (autoridad de frames del watchdog)
    // ---------------------------------------------------------
    function startNight() {
        const a = app();
        if (!a) return false;
        if (state.phase === 'night') return true;   // idempotente
        rematchArmed = false;
        state.phase = 'night';
        state.started = (state.started || 0) + 1;
        state.killDone = false;
        state.stunCharges = STUN_MAX;
        state.puppetRush = false;
        state.boxEmptyAt = 0;
        state.mpHour = 12;
        state.hourAt = Date.now();
        // caja musical + habilidades: estado fresco
        state.boxLevel = BOX_MAX;
        state.boxWinding = false;
        state.boxBlockedUntil = 0;
        state.boxRushUntil = 0;
        state.boxLastTick = Date.now();
        state.boxGraceAt = 0;      // v4: ventana de gracia de la caja
        state.specialAt = {};
        state.sprintUntil = {};
        state.batteryBlockUntil = 0;
        state.wantMonitor = false;     // v5: monitor nativo
        state.viewingMP = 0;
        state.monitorUp = false;
        state.lastFlipClick = 0;
        state.lastCamClick = 0;
        hideCurtain();
        ensureGuardUI();
        ensureMonitorUI();
        document.getElementById('mp-stun-btn').style.display = 'inline-block';
        document.getElementById('mp-box-wrap').style.display = 'block';
        gline('noche ' + state.night + ' en marcha — sala ' + ROOM);
        // El salto al frame 3 lo fuerza el WATCHDOG sin tope de tiempo
        // (v2 lo intentaba 20s y se rendía: el demo seguía su propio guion
        // → parpadeos y muertes aleatorias). FIX CRÍTICO (v1/v2): además,
        // fijar los marcadores ANTES del primer tick del frame envolviendo
        // startTheFrame — un solo tick con 'new bonnie'/'new chica' en la
        // oficina dispara el ataque nativo y mata la noche.
        if (!a.__mpStartWrapped) {
            a.__mpStartWrapped = true;
            const origStart = a.startTheFrame.bind(a);
            a.startTheFrame = function () {
                const going = (this.nextFrame === NIGHT_FRAME);
                origStart.call(this);
                if (going && this.currentFrame === NIGHT_FRAME) {
                    try {
                        AI_COUNTERS.forEach(n => setRS(n, 0));
                        setRS('music box counter', 2500);
                        setRS('time left', 99999999);
                        setRS('time allowed', 99999999);
                        setRS('battery life', 9999);
                        setRS('night number', state.night);
                        setRS('time of the night', 12);
                        Object.keys(START_ROOM).forEach(role => { tpMarker(role, START_ROOM[role]); });
                        disableNightInitEvents();
                        disableMusicBoxWriters();
                        disableNativeMarkerMovers();
                        banishBlackout();   // v4: oficina visible desde el tick 1
                    } catch (e) { }
                }
            };
        }
        // congelar la noche en cuanto llegue el frame
        const iv = setInterval(() => {
            if (state.phase !== 'night') { clearInterval(iv); return; }
            if (a.currentFrame !== NIGHT_FRAME) return;
            clearInterval(iv);
            stabilizeNight();
            // arranque: re-estabilización ceñida durante los primeros 6s
            // (los objetos del frame se crean progresivamente; el primer
            // barrido puede llegar antes de que existan los marcadores)
            const tight = setInterval(() => {
                if (state.phase !== 'night') { clearInterval(tight); return; }
                const aa = app();
                if (!aa || aa.currentFrame !== NIGHT_FRAME) { clearInterval(tight); return; }
                AI_COUNTERS.forEach(n => setRS(n, 0));
                setRS('music box counter', 2500);
                setRS('battery life', 9999);
                setRS('time allowed', 99999999);
                setRS('time left', 99999999);
                setRS('night number', state.night);
                Object.keys(START_ROOM).forEach(role => { tpMarker(role, START_ROOM[role]); });
                banishBlackout();   // v4: durante el arranque también
                if (Date.now() > (state.stabilizeUntil || 0)) clearInterval(tight);
            }, 50);
        }, 50);
        return true;
    }

    // congela IA, neutraliza el límite del demo y coloca los marcadores
    function stabilizeNight() {
        const a = app();
        if (!a || a.currentFrame !== NIGHT_FRAME) return;
        AI_COUNTERS.forEach(n => setRS(n, 0));
        setRS('music box counter', Math.round(state.boxLevel));
        setRS('time left', 99999999);
        setRS('time allowed', 99999999);
        setRS('night number', state.night);
        setRS('time of the night', 12);
        setRS('battery life', 9999);
        disableMusicBoxWriters();
        disableNativeMarkerMovers();
        banishBlackout();   // v4: oficina visible
        // marcadores a sus salas de inicio
        Object.keys(START_ROOM).forEach(role => {
            tpMarker(role, START_ROOM[role]);
        });
        Object.keys(state.players).forEach(role => {
            state.players[role].room = START_ROOM[role];
        });
        state.stabilizeUntil = Date.now() + 6000;   // re-estabilizar mientras arranca
        // re-congelar periódicamente (el guion del demo toca contadores)
        if (!window.__mpStabilizer) {
            window.__mpStabilizer = setInterval(() => {
                if (state.phase !== 'night') return;
                const aa = app();
                if (!aa || aa.currentFrame !== NIGHT_FRAME) return;
                const now = Date.now();
                // v4: el blackout no puede volver a cubrir la oficina
                banishBlackout();
                AI_COUNTERS.forEach(n => { if (rs(n) !== 0) setRS(n, 0); });
                if (rs('time left') !== null && rs('time left') < 90000000) setRS('time left', 99999999);
                if (rs('time allowed') !== null && rs('time allowed') < 90000000) setRS('time allowed', 99999999);
                // batería: NO reponer mientras BB tenga la linterna robada
                if (now >= state.batteryBlockUntil && rs('battery life') !== null && rs('battery life') < 5000) {
                    setRS('battery life', 9999);
                }
                // durante el arranque: re-colocar marcadores (los objetos se
                // crean progresivamente y el primer tp puede llegar demasiado pronto)
                if (now < (state.stabilizeUntil || 0)) {
                    Object.keys(START_ROOM).forEach(role => { tpMarker(role, START_ROOM[role]); });
                    setRS('battery life', 9999);
                }
                // ---- AUTORIDAD DE MARCADORES (permanente) ----
                // el guion nativo del demo mueve los marcadores por eventos
                // que no hemos podido desactivar (movers con condiciones
                // variadas); los roles con jugador siguen su sala lógica y
                // los de IA quedan clavados en su sala de inicio. Durante un
                // kill (killDone) no se toca: el jumpscare nativo manda.
                if (!state.killDone) {
                    Object.keys(MARKER).forEach(role => {
                        const room = (state.players[role]) ? state.players[role].room : START_ROOM[role];
                        if (!room || !ANCHOR[room]) return;
                        const m = find(MARKER[role]);
                        const an = find(ANCHOR[room]);
                        if (m && an && (Math.abs(m.hoX - an.hoX) > 20 || Math.abs(m.hoY - an.hoY) > 20)) {
                            tpMarker(role, room);
                        }
                    });
                }
                // ---- 🎵 CAJA MUSICAL: modelo determinista del HOST ----
                // (los writers nativos están desactivados; el nivel se
                // escribe en el contador para que el HUD nativo lo muestre
                // y las condiciones canon de la marioneta lo sigan leyendo)
                const dt = Math.min(2, (now - (state.boxLastTick || now)) / 1000);
                state.boxLastTick = now;
                const blocked = now < state.boxBlockedUntil;
                if (state.boxWinding && !blocked) {
                    state.boxLevel = Math.min(BOX_MAX, state.boxLevel + BOX_WIND * dt);
                } else {
                    const drain = (now < state.boxRushUntil) ? BOX_DRAIN_RUSH : BOX_DRAIN;
                    state.boxLevel = Math.max(0, state.boxLevel - drain * dt);
                }
                setRS('music box counter', Math.round(state.boxLevel));
                const pct = Math.round(state.boxLevel / BOX_MAX * 100);
                const bar = document.getElementById('mp-box-bar');
                if (bar) {
                    bar.style.width = pct + '%';
                    bar.style.background = pct < 25 ? '#ff5b5b' : (pct < 50 ? '#ffb84d' : 'linear-gradient(90deg,#3d80ff,#7ec8ff)');
                }
                const pctEl = document.getElementById('mp-box-pct');
                if (pctEl) pctEl.textContent = pct + '%';
                const wb = document.getElementById('mp-wind-btn');
                if (wb) {
                    wb.disabled = blocked;
                    wb.style.opacity = blocked ? '.45' : '1';
                    if (blocked) {
                        wb.textContent = '🎈 GLOBOS (' + Math.ceil((state.boxBlockedUntil - now) / 1000) + 's)';
                        wb.style.background = '#123';
                    } else if (state.boxGraceAt) {
                        wb.textContent = '🎵 ¡DAR CUERDA YA! (' + Math.ceil((BOX_GRACE_MS - (now - state.boxGraceAt)) / 1000) + 's)';
                        wb.style.background = '#5a0a0a';
                    } else {
                        wb.textContent = '🎵 DAR CUERDA (mantener)';
                        wb.style.background = '#123';
                    }
                }
                // v4: barra en ROJO PARPADEANTE cuando queda <25%
                const wrap = document.getElementById('mp-box-wrap');
                if (wrap) {
                    const danger = pct < 25;
                    wrap.classList.toggle('mp-box-danger', danger);
                    wrap.style.animation = danger ? 'mpboxblink .8s steps(2) infinite' : 'none';
                }
                if (state.boxLevel <= 0 && !state.boxEmptyAt) {
                    state.boxEmptyAt = now;
                    state.boxGraceAt = 0;
                    broadcast({ t: 'boxEmpty' });
                    toast('🎁 ¡CAJA MUSICAL AGOTADA! Da cuerda YA — la Marioneta se acerca', 6000);
                } else if (state.boxLevel > 200 && state.boxEmptyAt) {
                    state.boxEmptyAt = 0;
                    state.boxGraceAt = 0;
                    broadcast({ t: 'boxRefilled' });
                }
                // canon: la caja vacía sin cuerda → la marioneta sale a por el
                // guardia. v4: con marioneta JUGADORA lo decide ella (kill al
                // entrar). Sin marioneta jugadora hay AVISO + ventana de gracia
                // (20s) para dar cuerda: sin la gracia la noche moría a los ~92s
                // y el bucle muerte→menú→reinicio era el "parpadeo negro".
                if (state.boxEmptyAt && now - state.boxEmptyAt > BOX_KILL_MS && !state.killDone) {
                    if (state.players.puppet && state.players.puppet.room !== 'office') {
                        // hay marioneta JUGADORA: ella ejecuta el kill al entrar
                    } else {
                        if (!state.boxGraceAt) {
                            state.boxGraceAt = now;
                            toast('⚠ LA MARIONETA SE ACERCA — ¡DAR CUERDA! (' + Math.round(BOX_GRACE_MS / 1000) + 's)', 8000);
                            broadcast({ t: 'boxWarning' });
                        } else if (now - state.boxGraceAt > BOX_GRACE_MS) {
                            killGuard('puppet', 'la caja musical se agotó… LA MARIONETA salió');
                        }
                    }
                }
                if (now - (state.__boxBcast || 0) > 2000) {
                    state.__boxBcast = now;
                    broadcast({ t: 'box', pct: pct });
                }
                // reloj MP: las horas duran HOUR_MS y las marca el HOST
                // (el demo las hace volar en ~15s; la noche MP dura minutos).
                // La hora del juego se congela a la del MP; a las 6 gana el guardia.
                const hr = rs('time of the night');
                if (hr !== null && hr !== state.mpHour && state.phase === 'night') {
                    if (hr === 6) {
                        // el propio juego llegó a las 6: aceptar la victoria
                        winNight();
                    } else {
                        setRS('time of the night', state.mpHour);   // congelar
                    }
                }
                if (state.phase === 'night' && now - (state.hourAt || now) > HOUR_MS) {
                    state.hourAt = now;
                    state.mpHour = (state.mpHour === 12) ? 1 : state.mpHour + 1;
                    if (state.mpHour >= 6) {
                        winNight();
                    } else {
                        setRS('time of the night', state.mpHour);
                        broadcast({ t: 'hour', hour: state.mpHour });
                        // recarga del destello por hora
                        if (state.stunCharges < STUN_MAX) {
                            state.stunCharges++;
                            const n = document.getElementById('mp-stun-n');
                            if (n) n.textContent = state.stunCharges;
                        }
                    }
                }
            }, 500);
        }
        broadcast({ t: 'nightStart', night: state.night });
        broadcastPlayers();
    }

    // ---------------------------------------------------------
    // Cuando el runtime está listo
    // ---------------------------------------------------------
    function onRuntimeReady() {
        // v3: el menú nativo del demo es ilegible y tramposo → cortina MP
        // + watchdog de autoridad de frames. El guardia juega desde aquí.
        ensureGuardUI();
        showCurtain();
        gline('sala ' + ROOM + ' · juego listo');
        // v4: animación del parpadeo de la caja + bucle del overlay de cámaras
        try {
            const st = document.createElement('style');
            st.textContent = '@keyframes mpboxblink{0%{box-shadow:0 0 0 1px #ff5b5b}50%{box-shadow:0 0 14px 3px rgba(255,60,60,.9)}}';
            document.head.appendChild(st);
        } catch (e) { }
        // v5: bucles del monitor de cámaras NATIVO (250ms) y de los
        // asomados (500ms) — la vista es del motor original
        if (!window.__mpMonitorDrv) {
            window.__mpMonitorDrv = setInterval(driveNativeMonitor, 250);
        }
        if (!window.__mpPeekDrv) {
            window.__mpPeekDrv = setInterval(drivePeekSprites, 500);
        }
        // MP: neutralizar la pausa por foco (blur) — la noche compartida
        // no se detiene aunque el guardia cambie de ventana
        try {
            const a = app();
            Object.defineProperty(a, 'hasFocus', {
                configurable: true,
                get: function () { return true; },
                set: function () { }
            });
            if (a.bStoppedFocus) { a.bStoppedFocus = false; try { a.run.resume(); } catch (e) { } }
        } catch (e) { }
        if (!window.__mpFrameWatchdog) {
            window.__mpFrameWatchdog = setInterval(frameWatchdog, 200);
        }
        startNetwork().then(() => {
            if (params.get('autostart') === '1') {
                setTimeout(startNight, 3000);
            }
        });
    }

    // marca de agua del bridge en el título
    try {
        const old = document.title;
        document.title = old + ' ·MP';
    } catch (e) { }
})();
