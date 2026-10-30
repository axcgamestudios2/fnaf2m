// ============================================================
// FNAF 2 MP — Cliente del ANIMATRÓNICO (v1)
// URL: anim.html?mp=<CODIGO>&role=<rol>&name=<nombre>
// El GUARDIA (host) mueve los marcadores nativos del juego
// original: las cámaras que ve el guardia se re-renderizan
// solas. Aquí solo se pide mover / atacar y se refleja estado.
// ============================================================

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const ROOM = params.get('mp');
    const ROLE = params.get('role');
    const NAME = (params.get('name') || 'Jugador').slice(0, 12);
    if (!ROOM || !ROLE) {
        document.getElementById('screen').style.display = 'block';
        document.getElementById('screen').innerHTML = 'Faltan parámetros (código / rol).';
        return;
    }

    // ------------------- Roles -------------------
    const ROLES = {
        toy_freddy: { name: 'TOY FREDDY', img: 'assets/roles/toy_freddy.png', color: '#d9a86c', marker: 'new freddy' },
        toy_bonnie: { name: 'TOY BONNIE', img: 'assets/roles/toy_bonnie.png', color: '#7ec8e3', marker: 'new bonnie' },
        toy_chica: { name: 'TOY CHICA', img: 'assets/roles/toy_chica.png', color: '#ffd54d', marker: 'new chica' },
        mangle: { name: 'MANGLE', img: 'assets/roles/toy_foxy.png', color: '#ff8a9e', marker: 'new foxy' },
        bb: { name: 'BALLOON BOY', img: 'assets/roles/BB.png', color: '#ff7043', marker: 'balloon boy' },
        puppet: { name: 'LA MARIONETA', img: 'assets/roles/gold_freddy.png', color: '#e8d6fe', marker: 'sockpuppet' },
        w_freddy: { name: 'FREDDY DESTROZADO', img: 'assets/roles/freddy.png', color: '#8d6e4a', marker: 'old freddy' },
        w_bonnie: { name: 'BONNIE DESTROZADO', img: 'assets/roles/bonnie.png', color: '#5e4a8a', marker: 'old bonnie' },
        w_chica: { name: 'CHICA DESTROZADA', img: 'assets/roles/chica.png', color: '#b8a22e', marker: 'old chica' },
        w_foxy: { name: 'FOXY DESTROZADO', img: 'assets/roles/foxy.png', color: '#a33d2a', marker: 'old foxy' }
    };
    const ROLE_INFO = ROLES[ROLE] || { name: ROLE, img: 'assets/roles/guard.png', color: '#999', marker: '?' };

    // ------------------- Mapa -------------------
    const ROOM_NAME = {
        cam8: 'ALA NORTE', cam3: 'PASILLO OESTE', cam1: 'REFACCIONES', cam5: 'SALA OESTE',
        cam7: 'COMEDOR', cam4: 'PASILLO CENTRAL', cam2: 'ÁREA DE JUEGOS', cam6: 'SALA SUR',
        cam9: 'ESCUCHA SOLA', cam11: 'RINCÓN DE PREMIOS', cam10: 'SALA ESTE', cam12: 'CAVERNA DEL NIÑO',
        hall1: 'PASILLO 1', hall2: 'PASILLO 2', office: 'OFICINA'
    };
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
    const START_ROOM = {
        toy_freddy: 'cam7', toy_bonnie: 'cam9', toy_chica: 'cam8',
        mangle: 'cam12', bb: 'cam5', puppet: 'cam11',
        w_freddy: 'cam1', w_bonnie: 'cam1', w_chica: 'cam1', w_foxy: 'cam3'
    };
    // posiciones para el minimapa (layout geográfico del demo, en %)
    const MAP_POS = {
        cam8: { x: 2, y: 2, w: 18, h: 20 }, cam3: { x: 2, y: 25, w: 18, h: 18 }, cam1: { x: 2, y: 46, w: 18, h: 18 }, cam5: { x: 2, y: 67, w: 18, h: 20 },
        hall1: { x: 24, y: 25, w: 18, h: 18 }, hall2: { x: 24, y: 46, w: 18, h: 18 }, office: { x: 24, y: 67, w: 18, h: 20 },
        cam7: { x: 46, y: 2, w: 20, h: 20 }, cam4: { x: 46, y: 25, w: 20, h: 18 }, cam2: { x: 46, y: 46, w: 20, h: 18 }, cam6: { x: 46, y: 67, w: 20, h: 20 },
        cam9: { x: 72, y: 2, w: 20, h: 20 }, cam11: { x: 72, y: 25, w: 20, h: 18 }, cam10: { x: 72, y: 46, w: 20, h: 18 }, cam12: { x: 72, y: 67, w: 20, h: 20 }
    };
    const MOVE_CD = ROLE === 'mangle' ? 5000 : 6000;

    // ------------------- Estado -------------------
    const S = {
        phase: 'connecting',     // connecting → waiting → night → dead → win
        room: START_ROOM[ROLE] || 'cam1',
        night: 1,
        lastMove: 0,
        stunnedUntil: 0,
        inOffice: false,
        boxLevel: 1,             // nivel de la caja musical (0..1)
        boxEmpty: false,
        players: [],
        client: null,
        connected: false
    };
    const NAV_ARROW = {
        cam8: { cam3: '↓', cam7: '→' },
        cam3: { cam8: '↑', cam1: '↓', hall1: '→' },
        cam1: { cam3: '↑', cam5: '↓', hall2: '→' },
        cam5: { cam1: '↑', cam6: '→' },
        cam6: { cam5: '←', cam2: '↑' },
        cam7: { cam8: '←', cam4: '↓', cam9: '→' },
        cam4: { cam7: '↑', cam2: '↓', hall1: '←' },
        cam2: { cam4: '↑', cam6: '↓', hall2: '←' },
        cam9: { cam7: '←', cam11: '↓' },
        cam11: { cam9: '↑', cam10: '↓', cam12: '→' },
        cam10: { cam11: '↑', hall2: '←' },
        cam12: { cam11: '←' },
        hall1: { cam3: '←', cam4: '→', hall2: '↓' },
        hall2: { cam1: '←', cam2: '→', cam10: '→', hall1: '↑', office: '↓' },
        office: { hall2: '↑' }
    };

    // ------------------- DOM -------------------
    const $ = (id) => document.getElementById(id);

    function setRoleUI() {
        $('role-icon').src = ROLE_INFO.img;
        $('role-name').textContent = ROLE_INFO.name;
        $('role-name').style.color = ROLE_INFO.color;
        $('role-player').textContent = NAME;
        document.title = 'FNAF 2 MP — ' + ROLE_INFO.name;
        // la caja musical solo interesa a la marioneta (y al guardia)
        $('hb-box').style.display = ROLE === 'puppet' ? 'flex' : 'none';
        if (ROLE === 'puppet') $('ab-puppet').style.display = 'inline-block';
        if (ROLE === 'bb') $('cd-jump').textContent = 'entras, robas la linterna y sales';
    }

    function toast(txt, ms) {
        const t = $('toast');
        t.textContent = txt;
        t.style.display = 'block';
        clearTimeout(t.__t);
        t.__t = setTimeout(() => { t.style.display = 'none'; }, ms || 3200);
    }

    function showScreen(html, cls) {
        const s = $('screen');
        s.className = cls || '';
        s.innerHTML = html;
        s.style.display = 'block';
    }
    function hideScreen() { $('screen').style.display = 'none'; }

    // ------------------- Minimapa -------------------
    function buildMap() {
        const m = $('minimap');
        m.innerHTML = '';
        Object.keys(MAP_POS).forEach(r => {
            const p = MAP_POS[r];
            const d = document.createElement('div');
            d.className = 'mroom';
            d.id = 'mr-' + r;
            d.style.cssText = 'left:' + p.x + '%;top:' + p.y + '%;width:' + p.w + '%;height:' + p.h + '%';
            d.textContent = ROOM_NAME[r];
            m.appendChild(d);
        });
    }
    function paintMap() {
        Object.keys(MAP_POS).forEach(r => {
            const d = $('mr-' + r);
            if (!d) return;
            d.classList.toggle('me', r === S.room);
            d.classList.toggle('mate', r !== S.room && S.players.some(p => p.room === r));
        });
    }

    // ------------------- Navegación -------------------
    function renderNav() {
        const nav = $('nav');
        nav.innerHTML = '';
        if (S.phase !== 'night') return;
        const adj = ADJACENCY[S.room] || [];
        adj.forEach(to => {
            const b = document.createElement('button');
            const attack = (to === 'office');
            if (attack) b.className = 'attack';
            const arrow = (NAV_ARROW[S.room] && NAV_ARROW[S.room][to]) || '·';
            b.innerHTML = '<span class="arrow">' + arrow + '</span>' + ROOM_NAME[to] +
                (attack && ROLE === 'bb' ? ' 🎈' : (attack ? ' ⚠' : ''));
            b.disabled = !canMove();
            b.addEventListener('click', () => tryMove(to));
            nav.appendChild(b);
        });
    }
    function canMove() {
        if (S.phase !== 'night') return false;
        if (Date.now() < S.stunnedUntil) return false;
        return Date.now() - S.lastMove >= MOVE_CD;
    }
    function tryMove(to) {
        if (!canMove()) return;
        send({ t: 'move', room: to });
        // el host confirma con 'moved'; optimista: bloquear botones ya
        renderNav();
    }

    // ------------------- Oficina / jumpscare -------------------
    function tryJumpscare() {
        if (S.phase !== 'night') return;
        if (!S.inOffice) { toast('Solo puedes asustar DENTRO de la oficina'); return; }
        if (Date.now() < S.stunnedUntil) { toast('⚡ ¡Estás aturdido!'); return; }
        send({ t: 'jumpscare' });
    }
    function tryPuppetEscape() {
        if (ROLE !== 'puppet' || S.phase !== 'night') return;
        send({ t: 'puppetEscape' });
    }

    // ------------------- Red -------------------
    function send(msg) {
        if (S.client) S.client.send(msg);
    }
    function connect() {
        showScreen('CONECTANDO CON LA PARTIDA ' + ROOM + '…<div class="sub">guardia: ' + (params.get('host') || ROOM) + '</div>');
        const c = new MP.Client();
        S.client = c;
        c.on('__open', () => { });
        c.connect(ROOM, NAME, ROLE, () => {
            S.connected = true;
            S.phase = 'waiting';
            hideScreen();
            showScreen('ESPERANDO AL GUARDIA…<div class="sub">la noche empieza cuando pulse EMPEZAR</div>');
        }, (why) => {
            showScreen('NO SE PUDO CONECTAR<div class="sub">' + why + '<br>Comprueba el código o vuelve al lobby.</div>', 'lose');
        });
        c.on('players', (m) => {
            S.players = m.players || [];
            S.night = m.night || S.night;
            if (m.phase) S.phase = m.phase === 'night' && S.phase !== 'dead' ? 'night' : S.phase;
            paintMates();
            if (S.phase === 'night') { hideScreen(); renderAll(); }
        });
        c.on('nightStart', (m) => {
            S.night = m.night || 1;
            S.phase = 'night';
            S.room = START_ROOM[ROLE] || 'cam1';
            S.lastMove = Date.now();
            hideScreen();
            renderAll();
            toast('🌙 NOCHE ' + S.night + ' — el guardia está en la oficina. ¡A cazar!');
        });
        c.on('moved', (m) => {
            if (m.role === ROLE) {
                S.room = m.room;
                S.lastMove = Date.now();
                S.inOffice = m.room === 'office';
                renderAll();
            }
        });
        c.on('moveDeny', (m) => { toast('✖ ' + (m.why || 'movimiento rechazado')); renderNav(); });
        c.on('officeIn', (m) => {
            if (m.role === ROLE) {
                S.inOffice = true;
                const b = $('doorbanner');
                b.style.display = 'block';
                b.innerHTML = 'ESTÁS EN LA OFICINA' +
                    '<div class="sub">' + (ROLE === 'bb' ? '¡Roba la linterna! (automático)' : 'Pulsa [ESP] JUMPSCARE antes de que se máSQUE') + '</div>';
                renderNav();
            }
        });
        c.on('retreat', (m) => {
            if (m.role === ROLE) {
                S.room = m.room;
                S.inOffice = false;
                $('doorbanner').style.display = 'none';
                renderAll();
                toast('↩ Te retiras: ' + (m.reason || ''));
            }
        });
        c.on('guardStun', (m) => {
            S.stunnedUntil = Date.now() + (m.ms || 5000);
            const sb = $('stunbar');
            sb.style.display = 'block';
            sb.innerHTML = '⚡ ATURDIDO POR EL DESTELLO';
            const tick = setInterval(() => {
                const left = S.stunnedUntil - Date.now();
                if (left <= 0) { clearInterval(tick); sb.style.display = 'none'; renderNav(); return; }
                sb.innerHTML = '⚡ ATURDIDO — ' + Math.ceil(left / 1000) + 's';
            }, 200);
            renderNav();
        });
        c.on('bbSabotage', (m) => {
            if (m.role === ROLE) toast('🎈 ¡LINTERNA ROBADA! El guardia no puede alumbrar');
        });
        c.on('boxEmpty', () => {
            S.boxEmpty = true;
            if (ROLE === 'puppet') toast('🎁 ¡LA CAJA ESTÁ AGOTADA! Pulsa [E] para SALIR', 6000);
        });
        c.on('puppetOut', () => {
            if (ROLE === 'puppet') toast('🎁 ¡ESTÁS SUELTA! Avanzas sola hacia la oficina…', 5000);
        });
        c.on('guardDead', (m) => {
            S.phase = 'dead';
            $('doorbanner').style.display = 'none';
            $('stunbar').style.display = 'none';
            if (m.by === ROLE) {
                showScreen('¡ATRAPEASTE AL GUARDIA!<div class="big">💀 ' + (m.byName || '') + ' GANA</div><div class="sub">' + (m.reason || '') + '</div>', 'lose');
            } else {
                showScreen('EL GUARDIA HA CAÍDO<div class="big">💀</div><div class="sub">lo atrapó ' + (m.byName || m.by || '?') + '</div>', 'lose');
            }
        });
        c.on('nightEnd', (m) => {
            S.phase = 'win';
            $('doorbanner').style.display = 'none';
            showScreen('🌅 6 AM<div class="big">SOBREVIVIERON A LA NOCHE ' + (m.night || S.night) + '</div><div class="sub">el guardia sigue vivo… de momento</div>', 'win');
        });
        c.on('__disconnect', () => {
            if (S.phase === 'night') {
                showScreen('CONEXIÓN PERDIDA<div class="sub">el guardia se desconectó</div>', 'lose');
                S.phase = 'dead';
            }
        });
    }

    // ------------------- HUD -------------------
    function paintMates() {
        const m = $('mates');
        const lines = S.players.map(p => {
            const info = ROLES[p.role];
            const nm = info ? info.name : p.role;
            const rm = ROOM_NAME[p.room] || p.room;
            return '<span class="mk" style="color:' + (info ? info.color : '#999') + '">' + nm + '</span> · ' + rm;
        });
        m.innerHTML = '<div style="color:#667;letter-spacing:2px;margin-bottom:4px">JUGADORES</div>' + (lines.join('<br>') || '—');
    }
    function renderAll() {
        $('roomname').textContent = '▸ ' + (ROOM_NAME[S.room] || S.room);
        $('h-night').textContent = 'NOCHE ' + S.night;
        paintMap();
        renderNav();
        $('cd-jump').textContent = S.inOffice ? (ROLE === 'bb' ? '¡roba y corre!' : '¡AHORA! antes de la máscara') : 'solo en la OFICINA';
        $('ab-jump').disabled = !S.inOffice || S.phase !== 'night';
    }

    // ------------------- Caja musical (solo marioneta) -------------------
    function tickBox() {
        if (ROLE !== 'puppet') return;
        // estimación local: drena ~15/s desde 2500 cuando el guardia NO la da cuerda
        const el = $('boxfill');
        if (el) el.style.width = Math.max(0, Math.min(100, S.boxLevel * 100)) + '%';
    }
    setInterval(tickBox, 500);
    // el host informa el nivel real en 'players' (futuro); por ahora se drena local
    setInterval(() => { if (S.phase === 'night' && ROLE === 'puppet' && !S.boxEmpty) { S.boxLevel = Math.max(0, S.boxLevel - 0.0075); } }, 500);

    // ------------------- Eventos UI -------------------
    $('ab-jump').addEventListener('click', tryJumpscare);
    $('ab-puppet').addEventListener('click', tryPuppetEscape);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); tryJumpscare(); }
        if (e.key === 'e' || e.key === 'E') tryPuppetEscape();
    });

    // refresco de botones por cooldown
    setInterval(() => { if (S.phase === 'night') renderNav(); }, 500);
    // reloj decorado
    setInterval(() => {
        if (S.phase !== 'night') return;
        const h = ['12:00', '1:00', '2:00', '3:00', '4:00', '5:00'][Math.min(5, Math.floor((Date.now() % 3600000) / 600000))];
        $('h-hour').textContent = h + ' AM';
    }, 1000);

    // ------------------- Arranque -------------------
    window.__A = { S, ROLES, ROOM_NAME, ADJACENCY, send, tryMove, tryJumpscare };
    setRoleUI();
    buildMap();
    paintMap();
    renderAll();
    // esperar a PeerJS
    let waited = 0;
    const iv = setInterval(() => {
        waited += 200;
        if (typeof Peer !== 'undefined' && typeof MP !== 'undefined') {
            clearInterval(iv);
            connect();
        } else if (waited > 10000) {
            clearInterval(iv);
            showScreen('NO SE PUDO CARGAR LA RED<div class="sub">revisa tu conexión y recarga</div>', 'lose');
        }
    }, 200);
})();
