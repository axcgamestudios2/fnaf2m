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

    // ------------------- Mapa (cámaras CANON del FNAF 2) -------------------
    const ROOM_NAME = {
        cam1: 'SALA DE FIESTAS 1', cam2: 'SALA DE FIESTAS 2', cam3: 'SALA DE FIESTAS 3', cam4: 'SALA DE FIESTAS 4',
        cam5: 'CONDUCTO DE AIRE IZQ.', cam6: 'CONDUCTO DE AIRE DER.', cam7: 'PASILLO PRINCIPAL', cam8: 'REFACCIONES',
        cam9: 'ESCENARIO', cam10: 'ÁREA DE JUEGOS', cam11: 'RINCÓN DE PREMIOS', cam12: 'CAVERNA DEL NIÑO',
        hall1: 'PASILLO (TRAMO 1)', hall2: 'FRENTE A LA OFICINA', office: 'OFICINA'
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
    // salas iniciales canon: toys en el escenario, withered en refacciones,
    // BB en el área de juegos, mangle en su caverna, marioneta en premios
    const START_ROOM = {
        toy_freddy: 'cam9', toy_bonnie: 'cam9', toy_chica: 'cam9',
        mangle: 'cam12', bb: 'cam10', puppet: 'cam11',
        w_freddy: 'cam8', w_bonnie: 'cam8', w_chica: 'cam8', w_foxy: 'cam8'
    };
    // posiciones para el minimapa (layout geográfico del demo, en %)
    const MAP_POS = {
        cam8: { x: 2, y: 2, w: 18, h: 20 }, cam3: { x: 2, y: 25, w: 18, h: 18 }, cam1: { x: 2, y: 46, w: 18, h: 18 }, cam5: { x: 2, y: 67, w: 18, h: 20 },
        hall1: { x: 24, y: 25, w: 18, h: 18 }, hall2: { x: 24, y: 46, w: 18, h: 18 }, office: { x: 24, y: 67, w: 18, h: 20 },
        cam7: { x: 46, y: 2, w: 20, h: 20 }, cam4: { x: 46, y: 25, w: 20, h: 18 }, cam2: { x: 46, y: 46, w: 20, h: 18 }, cam6: { x: 46, y: 67, w: 20, h: 20 },
        cam9: { x: 72, y: 2, w: 20, h: 20 }, cam11: { x: 72, y: 25, w: 20, h: 18 }, cam10: { x: 72, y: 46, w: 20, h: 18 }, cam12: { x: 72, y: 67, w: 20, h: 20 }
    };
    const MOVE_CD = ROLE === 'mangle' ? 5000 : 6000;

    // ------------------- Habilidades [Q] por rol -------------------
    const ABILITIES = {
        toy_freddy: { name: 'FAROL', desc: 'banner falso de oficina' },
        toy_bonnie: { name: 'INTERFERENCIA', desc: 'sabotea el monitor 3s' },
        toy_chica: { name: 'CUPCAKE', desc: 'ruido metálico 4s' },
        mangle: { name: 'RADIO ROTA', desc: 'estática: -10% batería' },
        bb: { name: 'GLOBOS', desc: 'bloquea la cuerda 6s' },
        puppet: { name: 'MELODÍA MISTERIOSA', desc: 'caja se agota 2x (8s)' },
        w_freddy: { name: 'BURLA', desc: 'banner falso de oficina' },
        w_bonnie: { name: 'TORMENTO', desc: 'sabotea el monitor 3s' },
        w_chica: { name: 'CAZUELAS', desc: 'ruido atronador 4s' },
        w_foxy: { name: 'SPRINT', desc: 'corres 2x rápido 6s' }
    };
    const SPECIAL_CD = 30000;

    // ------------------- Estado -------------------
    const S = {
        phase: 'connecting',     // connecting → waiting → night → dead → win
        room: START_ROOM[ROLE] || 'cam8',
        night: 1,
        lastMove: 0,
        stunnedUntil: 0,
        inOffice: false,
        boxLevel: 1,             // nivel de la caja musical (0..1, real del host)
        boxEmpty: false,
        players: [],
        client: null,
        connected: false,
        lastSpecial: 0,          // [Q] cooldown local
        moveCd: 6000
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
        document.title = 'The Lost Pizzeria — ' + ROLE_INFO.name;
        // habilidad [Q] única por rol
        const ab = ABILITIES[ROLE];
        if (ab) {
            const q = $('ab-q');
            q.style.display = 'inline-block';
            $('ab-q-name').textContent = '[Q] ' + ab.name;
            $('cd-q').textContent = ab.desc;
            q.title = ab.desc;
        }
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

    // v3: espera VIVA (banner) en vez de pantalla negra total — el jugador
    // ve su rol, mapa y compañeros mientras el guardia arranca
    function showWait(t1, t2) {
        $('wb1').textContent = t1 || 'ESPERANDO AL GUARDIA…';
        $('wb2').textContent = t2 || 'la noche arranca cuando pulse EMPEZAR';
        $('waitbanner').style.display = 'block';
    }
    function hideWait() { $('waitbanner').style.display = 'none'; }

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
        return Date.now() - S.lastMove >= (S.moveCd || MOVE_CD);
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

    // ------------------- Habilidad [Q] -------------------
    function trySpecial() {
        if (S.phase !== 'night') return;
        if (Date.now() < S.stunnedUntil) { toast('⚡ ¡Estás aturdido!'); return; }
        if (Date.now() - S.lastSpecial < SPECIAL_CD) {
            toast('⏳ ' + ABILITIES[ROLE].name + ' recargando ' + Math.ceil((SPECIAL_CD - (Date.now() - S.lastSpecial)) / 1000) + 's');
            return;
        }
        send({ t: 'special' });
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
            showWait('ESPERANDO AL GUARDIA…',
                'la noche arranca cuando pulse EMPEZAR — tu rol y tu mapa ya están listos');
        }, (why) => {
            showScreen('NO SE PUDO CONECTAR<div class="sub">' + why + '<br>Comprueba el código o vuelve al lobby.</div>', 'lose');
        });
        c.on('players', (m) => {
            S.players = m.players || [];
            S.night = m.night || S.night;
            if (m.moveCd) S.moveCd = m.moveCd;
            if (typeof m.boxPct === 'number') S.boxLevel = m.boxPct / 100;
            if (m.phase) S.phase = m.phase === 'night' && S.phase !== 'dead' ? 'night' : S.phase;
            paintMates();
            if (S.phase === 'night') { hideScreen(); hideWait(); renderAll(); }
        });
        c.on('box', (m) => {
            if (typeof m.pct === 'number') {
                S.boxLevel = m.pct / 100;
                if (m.pct > 20) S.boxEmpty = false;
            }
        });
        c.on('boxRefilled', () => {
            S.boxEmpty = false;
            if (ROLE === 'puppet') toast('🎵 El guardia ha dado cuerda…', 2500);
        });
        c.on('nightStart', (m) => {
            S.night = m.night || 1;
            S.phase = 'night';
            S.room = START_ROOM[ROLE] || 'cam8';
            S.lastMove = Date.now();
            S.lastSpecial = 0;
            hideScreen();
            hideWait();
            renderAll();
            toast('🌙 NOCHE ' + S.night + ' — el guardia está en la oficina. ¡A cazar!');
        });
        // v3: el guardia armó la revancha — volver a la espera (sin negro)
        c.on('toLobby', (m) => {
            S.phase = 'waiting';
            S.room = START_ROOM[ROLE] || 'cam8';
            S.inOffice = false;
            S.lastMove = Date.now();
            S.boxEmpty = false;
            $('doorbanner').style.display = 'none';
            $('stunbar').style.display = 'none';
            hideScreen();
            showWait('ESPERANDO AL GUARDIA…',
                'revancha: la noche ' + (m.night || '') + ' empieza en breve');
            renderAll();
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
        c.on('specialOk', (m) => {
            S.lastSpecial = Date.now();
            toast('✴ ' + (m.name || 'Habilidad') + ' usada');
            renderAll();
        });
        c.on('specialDeny', (m) => { toast('✖ ' + (m.why || 'habilidad no disponible')); });
        c.on('specialFx', (m) => {
            if (m.role !== ROLE && m.name) toast((ROLES[m.role] ? ROLES[m.role].name : m.role) + ' usó ' + m.name, 2500);
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
            hideWait();
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
            hideWait();
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
        // habilidad [Q]: recarga en vivo
        const q = $('ab-q'), cdq = $('cd-q');
        if (ABILITIES[ROLE]) {
            const left = SPECIAL_CD - (Date.now() - S.lastSpecial);
            q.disabled = S.phase !== 'night' || left > 0;
            cdq.textContent = left > 0 ? 'recarga ' + Math.ceil(left / 1000) + 's' : ABILITIES[ROLE].desc;
        }
    }

    // ------------------- Caja musical (nivel REAL del host) -------------------
    function tickBox() {
        if (ROLE !== 'puppet') return;
        const el = $('boxfill');
        if (el) {
            const pct = Math.max(0, Math.min(100, S.boxLevel * 100));
            el.style.width = pct + '%';
            el.style.background = pct < 25 ? '#ff5b5b' : (pct < 50 ? '#ffb84d' : '#e8d6fe');
        }
        const hb = $('hb-box');
        if (hb) hb.classList.toggle('danger', S.boxLevel < 0.25);
    }
    setInterval(tickBox, 500);

    // ------------------- Eventos UI -------------------
    $('ab-jump').addEventListener('click', tryJumpscare);
    $('ab-puppet').addEventListener('click', tryPuppetEscape);
    $('ab-q').addEventListener('click', trySpecial);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); tryJumpscare(); }
        if (e.key === 'e' || e.key === 'E') tryPuppetEscape();
        if (e.key === 'q' || e.key === 'Q') trySpecial();
    });

    // refresco de botones por cooldown (nav + habilidad Q)
    setInterval(() => { if (S.phase === 'night') { renderNav(); refreshQ(); } }, 500);
    function refreshQ() {
        if (!ABILITIES[ROLE]) return;
        const q = $('ab-q'), cdq = $('cd-q');
        const left = SPECIAL_CD - (Date.now() - S.lastSpecial);
        q.disabled = S.phase !== 'night' || left > 0;
        cdq.textContent = left > 0 ? 'recarga ' + Math.ceil(left / 1000) + 's' : ABILITIES[ROLE].desc;
    }
    // reloj decorado
    setInterval(() => {
        if (S.phase !== 'night') return;
        const h = ['12:00', '1:00', '2:00', '3:00', '4:00', '5:00'][Math.min(5, Math.floor((Date.now() % 3600000) / 600000))];
        $('h-hour').textContent = h + ' AM';
    }, 1000);

    // ------------------- Arranque -------------------
    window.__A = { S, ROLES, ROOM_NAME, ADJACENCY, send, tryMove, tryJumpscare, trySpecial, ABILITIES };
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
