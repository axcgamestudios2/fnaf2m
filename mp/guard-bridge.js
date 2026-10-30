// ============================================================
// FNAF 2 MP — Puente del GUARDIA (v1)
// Se carga en 2/index.html SOLO cuando ?mp=<CODIGO> existe.
// Sin el parámetro, el juego queda 100% original (un jugador).
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

    const BRIDGE_VERSION = 'v1-fnaf2';
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
    const ROOM_NAME = {
        cam8: 'ALA NORTE (CÁM 8)', cam3: 'PASILLO OESTE (CÁM 3)', cam1: 'REFACCIONES (CÁM 1)',
        cam5: 'SALA OESTE (CÁM 5)', cam7: 'COMEDOR (CÁM 7)', cam4: 'PASILLO CENTRAL (CÁM 4)',
        cam2: 'ÁREA DE JUEGOS (CÁM 2)', cam6: 'SALA SUR (CÁM 6)', cam9: 'ESCUCHA SOLA (CÁM 9)',
        cam11: 'RINCÓN DE PREMIOS (CÁM 11)', cam10: 'SALA ESTE (CÁM 10)', cam12: 'CAVERNA DEL NIÑO (CÁM 12)',
        hall1: 'PASILLO PRINCIPAL 1', hall2: 'PASILLO PRINCIPAL 2', office: 'OFICINA'
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
    // sala inicial por rol
    const START_ROOM = {
        toy_freddy: 'cam7', toy_bonnie: 'cam9', toy_chica: 'cam8',
        mangle: 'cam12', bb: 'cam5', puppet: 'cam11',
        w_freddy: 'cam1', w_bonnie: 'cam1', w_chica: 'cam1', w_foxy: 'cam3'
    };
    const ROLE_NAME = {
        guard: 'GUARDIA', toy_freddy: 'TOY FREDDY', toy_bonnie: 'TOY BONNIE',
        toy_chica: 'TOY CHICA', mangle: 'MANGLE', bb: 'BALLOON BOY',
        puppet: 'LA MARIONETA', w_freddy: 'FREDDY DESTROZADO',
        w_bonnie: 'BONNIE DESTROZADO', w_chica: 'CHICA DESTROZADA', w_foxy: 'FOXY DESTROZADO'
    };
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
    const MOVE_CD = 6000;         // ms entre salas
    const MANGLE_CD = 5000;       // mangle trepa más rápido
    const OFFICE_MS = 8000;       // anti-camping en la oficina
    const MASK_WINDOW_MS = 3000;  // tiempo del guardia para máscarse
    const KILL_FALLBACK_MS = 30000;
    const STUN_MS = 5000;         // ⚡ destello
    const STUN_MAX = 2;
    const STUN_CD_MS = 12000;
    const BOX_KILL_MS = 4000;     // marioneta: caja agotada → ventana de kill
    const HOUR_MS = 70000;        // cada hora del MP dura 70s (noche ~7min)
    const NIGHT_FRAME = 3;        // frame del juego = la noche

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
        canvas.dispatchEvent(mk('pointerdown', 1));
        setTimeout(() => canvas.dispatchEvent(mk('pointerup', 0)), 90);
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
        boxEmptyAt: 0,            // momento en que la caja se agotó
        puppetRush: false,
        endsAt: 0,
        killDone: false
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
            '<button id="mp-stun-btn" style="pointer-events:auto;display:none;margin-top:6px;background:#123;border:1px solid #7ec8ff;color:#cfe8ff;font-family:monospace;font-weight:bold;padding:6px 12px;cursor:pointer;border-radius:4px">⚡ DESTELLO [F] (<span id="mp-stun-n">2</span>)</button>';
        document.body.appendChild(d);
        const b = document.getElementById('mp-stun-btn');
        b.addEventListener('click', useStun);
        window.addEventListener('keydown', (e) => {
            if ((e.key === 'f' || e.key === 'F') && state.phase === 'night') useStun();
        });
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
                retreat(role, 'cam1', 'destello del guardia');
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
            name: entry.name || 'Jugador', room: START_ROOM[entry.role] || 'cam1',
            lastMove: 0, inOffice: false, ready: false, killing: false
        };
        gline('jugadores: ' + Object.keys(state.players).map(r => ROLE_NAME[r]).join(', '));
        toast(ROLE_NAME[entry.role] + ' (' + entry.name + ') conectado');
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
        await loadScript(MP_URL + 'net.js?v=1');
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
                broadcastPlayers();
            }
        });
        host.on('hello', (m, entry) => { /* registrado en __client */ });
        host.on('move', (m, entry) => { onClientMove(entry.role, m); });
        host.on('jumpscare', (m, entry) => { onClientJumpscare(entry.role, m); });
        host.on('puppetEscape', (m, entry) => { onPuppetEscape(entry.role, m); });
        host.start(ROOM, (id) => {
            gline('sala ' + ROOM + ' · esperando animatrónicos…');
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
        broadcast({ t: 'players', players: list, night: state.night, phase: state.phase });
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
        const cd = role === 'mangle' ? MANGLE_CD : MOVE_CD;
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
            // BB: sin kill — sabotea la linterna
            setRS('battery life', 0);
            broadcast({ t: 'bbSabotage', role: 'bb' });
            toast('🎈 BALLOON BOY entró: ¡te quitó la linterna!');
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
    // La Marioneta: escape por caja agotada
    // ---------------------------------------------------------
    function onPuppetEscape(role, m) {
        if (role !== 'puppet' || state.phase !== 'night') return;
        const box = rs('music box counter');
        if (box === null || box > 120) {
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
        broadcast({ t: 'guardDead', by: role, byName: ROLE_NAME[role] || role, reason: reason });
        toast('💀 ' + (ROLE_NAME[role] || role) + ' te atrapó — ' + reason);
        gline('💀 ATRAPADO por ' + ROLE_NAME[role] + ' — recarga para revancha');
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
        broadcast({ t: 'nightEnd', night: state.night });
        toast('🌅 6 AM — ¡SOBREVIVISTE la noche ' + state.night + '!');
        gline('🌅 SOBREVIVISTE — noche ' + state.night);
        state.night++;
        broadcastPlayers();
    }

    // ---------------------------------------------------------
    // Arranque de la noche (salto directo al frame del juego)
    // ---------------------------------------------------------
    function startNight() {
        const a = app();
        if (!a) return false;
        state.phase = 'night';
        state.killDone = false;
        state.stunCharges = STUN_MAX;
        state.puppetRush = false;
        state.boxEmptyAt = 0;
        state.mpHour = 12;
        state.hourAt = Date.now();
        a.nextFrame = NIGHT_FRAME;
        a.appRunningState = 1; // SL_STARTFRAME
        ensureGuardUI();
        document.getElementById('mp-stun-btn').style.display = 'inline-block';
        gline('noche ' + state.night + ' en marcha — sala ' + ROOM);
        // FIX CRÍTICO: fijar los marcadores ANTES del primer tick del frame.
        // Un solo tick con 'new bonnie'/'new chica' en la oficina dispara la
        // animación de ataque nativa → al terminar, GOLEVEL = muerte de la
        // noche aunque después los teletransportemos (era la muerte aleatoria
        // a los 10-30s). Envolviendo startTheFrame, el reset ocurre con los
        // objetos ya creados pero antes de que corra el bucle de eventos.
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
                } catch (e) { }
            }
        };
        // congelar la noche en cuanto llegue el frame
        const iv = setInterval(() => {
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
                if (Date.now() > (state.stabilizeUntil || 0)) clearInterval(tight);
            }, 50);
        }, 50);
        // vigilante: si en 12s no llegó, reintentar
        setTimeout(() => {
            if (a.currentFrame !== NIGHT_FRAME && state.phase === 'night') {
                a.nextFrame = NIGHT_FRAME;
                a.appRunningState = 1;
            }
        }, 12000);
        return true;
    }

    // congela IA, neutraliza el límite del demo y coloca los marcadores
    function stabilizeNight() {
        const a = app();
        if (!a || a.currentFrame !== NIGHT_FRAME) return;
        AI_COUNTERS.forEach(n => setRS(n, 0));
        setRS('music box counter', 2500);
        setRS('time left', 99999999);
        setRS('time allowed', 99999999);
        setRS('night number', state.night);
        setRS('time of the night', 12);
        setRS('battery life', 9999);
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
                AI_COUNTERS.forEach(n => { if (rs(n) !== 0) setRS(n, 0); });
                if (rs('time left') !== null && rs('time left') < 90000000) setRS('time left', 99999999);
                if (rs('time allowed') !== null && rs('time allowed') < 90000000) setRS('time allowed', 99999999);
                if (rs('battery life') !== null && rs('battery life') < 5000) setRS('battery life', 9999);
                // durante el arranque: re-colocar marcadores (los objetos se
                // crean progresivamente y el primer tp puede llegar demasiado pronto)
                if (Date.now() < (state.stabilizeUntil || 0)) {
                    Object.keys(START_ROOM).forEach(role => { tpMarker(role, START_ROOM[role]); });
                    setRS('music box counter', 2500);
                    setRS('battery life', 9999);
                }
                // la caja sigue drenando: el guardia la da cuerda con el juego real
                const box = rs('music box counter');
                if (box !== null && box <= 0 && !state.boxEmptyAt) {
                    state.boxEmptyAt = Date.now();
                    broadcast({ t: 'boxEmpty' });
                    toast('🎁 ¡CAJA MUSICAL AGOTADA! La Marioneta puede escapar');
                } else if (box !== null && box > 200) {
                    state.boxEmptyAt = 0;
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
                if (state.phase === 'night' && Date.now() - (state.hourAt || Date.now()) > HOUR_MS) {
                    state.hourAt = Date.now();
                    state.mpHour = (state.mpHour === 12) ? 1 : state.mpHour + 1;
                    if (state.mpHour >= 6) {
                        winNight();
                    } else {
                        setRS('time of the night', state.mpHour);
                        broadcast({ t: 'hour', hour: state.mpHour });
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
        // el juego arranca en el título; el guardia ve el juego normal
        // hasta que pulse EMPEZAR (o auto-start con ?autostart=1 para pruebas)
        ensureGuardUI();
        gline('sala ' + ROOM + ' · juego listo');
        startNetwork().then(() => {
            if (params.get('autostart') === '1') {
                setTimeout(startNight, 3000);
            } else {
                // botón EMPEZAR NOCHE en el overlay
                const ui = document.getElementById('mp-guard-ui');
                const b = document.createElement('button');
                b.id = 'mp-start-btn';
                b.textContent = '▶ EMPEZAR NOCHE (con los conectados; el resto IA)';
                b.style.cssText = 'pointer-events:auto;display:block;margin-top:6px;background:#032;border:1px solid #7ec8ff;color:#cfe8ff;font-family:monospace;font-weight:bold;padding:6px 10px;cursor:pointer;border-radius:4px';
                b.addEventListener('click', () => {
                    b.remove();
                    startNight();
                });
                ui.appendChild(b);
            }
        });
    }

    // marca de agua del bridge en el título
    try {
        const old = document.title;
        document.title = old + ' ·MP';
    } catch (e) { }
})();
