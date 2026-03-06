/* ==========================================================
   CONFIGURACIÓN & CONSTANTES
   ========================================================== */
const CONFIG = {
    API_KEY: window.ENV?.API_KEY || "NO_API_KEY",
    MODEL: window.ENV?.MODEL_ID || "gemma-2-27b-it",
    WHATSAPP_PHONE: "593996089541",
    MAX_TABS: 8
};

/* ==========================================================
   MODULE: AI SERVICE (REST API)
   ========================================================== */
const AIService = {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",

    async ask(userPrompt, systemRole = "") {
        if (!CONFIG.API_KEY || CONFIG.API_KEY.includes("TU_API_KEY")) {
            console.error("⛔ AIService: Falta API KEY correcta en env.js");
            return null;
        }

        const url = `${this.baseUrl}/${CONFIG.MODEL}:generateContent?key=${CONFIG.API_KEY}`;

        let finalPrompt = userPrompt;
        if (systemRole) {
            finalPrompt = `${systemRole}\n\n---\nTAREA DEL USUARIO:\n${userPrompt}`;
        }

        const payload = {
            contents: [{ parts: [{ text: finalPrompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        };

        try {
            console.log(`📡 Enviando petición a ${CONFIG.MODEL}...`);
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("🔥 Error Google API:", data);
                if (data.error?.code === 404) console.warn("💡 Tip: Verifica que el MODEL_ID en env.js sea correcto.");
                return null;
            }

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                console.log("✅ IA Respondió:", text);
                return text;
            } else {
                console.warn("⚠️ IA respondió vacío (Posible filtro):", data);
                return null;
            }
        } catch (error) {
            console.error("❌ Error de Conexión IA:", error);
            return null;
        }
    }
};

/* ==========================================================
   1. UX / INTERACCIONES GENERALES
   ========================================================== */
const UX = {
    init() {
        this.setupCarousel();
        this.setupGame();
        this.setupQuickContact();
    },

    setupQuickContact() {
        const form = document.getElementById('quickContactForm');
        const btnWa = document.getElementById('btn-qc-whatsapp');
        if (!form || !btnWa) return;

        btnWa.addEventListener('click', async (e) => {
            e.preventDefault();
            const name = document.getElementById('qcName').value.trim() || 'Visitante';
            const email = document.getElementById('qcEmail').value.trim();
            const rawMsg = document.getElementById('qcMsg').value.trim();

            if (!rawMsg) {
                window.open(`https://wa.me/${CONFIG.WHATSAPP_PHONE}`, '_blank');
                return;
            }

            const originalHTML = btnWa.innerHTML;
            btnWa.disabled = true;
            btnWa.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

            let finalMessage = "";
            try {
                const prompt = `Instrucción: Genera un mensaje de WhatsApp para enviar al portafolio de Yurak Chalen.\nDATOS: Cliente: ${name}, Email: ${email || "N/A"}, Mensaje: "${rawMsg}"\nREGLAS: Corrige ortografía, integra mensaje suavemente y saluda a Yurak. Solo dame el texto final.`;
                const aiText = await AIService.ask(prompt, "Eres un asistente de redacción personal.");
                if (aiText) finalMessage = aiText.trim();
                else throw new Error("Vacío");
            } catch (error) {
                finalMessage = `Hola Yurak, soy ${name}. ${rawMsg}` + (email ? ` (Mi correo: ${email})` : '');
            } finally {
                btnWa.disabled = false;
                btnWa.innerHTML = originalHTML;
            }

            window.open(`https://wa.me/${CONFIG.WHATSAPP_PHONE}?text=${encodeURIComponent(finalMessage)}`, '_blank');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('qcName').value.trim();
            const email = document.getElementById('qcEmail').value.trim();
            const msg = document.getElementById('qcMsg').value.trim();
            const btn = document.getElementById('btn-qc-submit');
            const feedback = document.getElementById('qc-feedback');

            if (!name || !email || !msg) return;

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                feedback.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-circle"></i> Ingresa un correo electrónico válido.</span>';
                feedback.className = "small mt-2 d-block";
                return;
            }

            btn.disabled = true;
            btn.querySelector('.qc-btn-text').classList.add('d-none');
            btn.querySelector('.qc-btn-loader').classList.remove('d-none');
            feedback.className = "small mt-2 d-none";

            try {
                const response = await fetch("https://formsubmit.co/ajax/yurakchalenp@gmail.com", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ nombre: name, correo: email, mensaje: msg })
                });

                if (response.ok) {
                    form.reset();
                    feedback.innerHTML = '<span class="text-accent-green"><i class="bi bi-check-circle"></i> Mensaje enviado correctamente. ¡Pronto te responderé!</span>';
                    feedback.className = "small mt-2 d-block";
                } else throw new Error();
            } catch (error) {
                feedback.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-circle"></i> Ocurrió un error en el servidor. Por favor, usa el botón de WhatsApp.</span>';
                feedback.className = "small mt-2 d-block";
            } finally {
                btn.disabled = false;
                btn.querySelector('.qc-btn-text').classList.remove('d-none');
                btn.querySelector('.qc-btn-loader').classList.add('d-none');
            }
        });
    },

    setupCarousel() {
        const btn = document.getElementById('btn-carousel-next');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const track = document.getElementById('projectTrack');
            if (!track || !track.firstElementChild) return;
            if (track.style.transition.includes('transform')) return;

            const firstItem = track.firstElementChild;
            const gap = parseFloat(window.getComputedStyle(track).gap) || 24;
            const moveAmount = firstItem.offsetWidth + gap;

            // Curva mecánica aplicada según Manual de Estilo
            track.style.transition = "transform 0.6s cubic-bezier(0.7, 0, 0.3, 1)";
            track.style.transform = `translateX(-${moveAmount}px)`;

            track.addEventListener('transitionend', () => {
                track.style.transition = "none";
                track.appendChild(firstItem);
                track.style.transform = "translateX(0)";
                void track.offsetWidth;
            }, { once: true });
        });
    },

    setupGame() {
        const container = document.querySelector('.interactivos-game');
        if (!container) return;
        const ball = document.querySelector('.the-ball');
        const elements = [ball, document.querySelector('.player-I'), document.querySelector('.player-i'), document.querySelector('.crowd')].filter(el => el);
        let isHover = false;
        container.addEventListener('mouseenter', () => { isHover = true; elements.forEach(el => el.classList.add('is-playing')); });
        container.addEventListener('mouseleave', () => isHover = false);
        if (ball) {
            ball.addEventListener('animationiteration', () => { if (!isHover) elements.forEach(el => el.classList.remove('is-playing')); });
            ball.addEventListener('animationend', () => { elements.forEach(el => el.classList.remove('is-playing')); });
        }
    }
};

/* ==========================================================
   2. GESTOR DE LAYOUT (CV VIEW)
   ========================================================== */
const layoutManager = {
    els: {
        get pdfView() { return document.getElementById('pdf-view'); },
        get introView() { return document.getElementById('intro-view'); },
        get rightContainer() { return document.getElementById('expanded-cv-container'); },
        get pdfObject() { return document.querySelector('#pdf-view object') || document.querySelector('#pdf-view iframe'); }
    },
    moveCvToRight() {
        const { pdfView, rightContainer, pdfObject, introView } = this.els;
        if (!pdfView || !rightContainer) return;
        rightContainer.classList.remove('d-none');
        setTimeout(() => rightContainer.classList.add('show'), 10);
        rightContainer.appendChild(pdfView);
        if (pdfObject) pdfObject.parentElement.classList.add('cv-expanded-mode');
        pdfView.classList.remove('view-pdf');
        pdfView.classList.add('w-100', 'active');
        if (introView) introView.classList.remove('hidden');
    },
    moveCvToLeft(keepActive = false) {
        const { pdfView, introView, rightContainer, pdfObject } = this.els;
        if (!pdfView || !introView) return;
        if (pdfView.parentElement !== introView.parentElement) introView.insertAdjacentElement('afterend', pdfView);
        if (pdfObject) pdfObject.parentElement.classList.remove('cv-expanded-mode');
        pdfView.classList.add('view-pdf');
        pdfView.classList.remove('w-100');
        if (rightContainer) {
            rightContainer.classList.remove('show');
            rightContainer.classList.add('d-none');
        }
        void pdfView.offsetWidth;
        pdfView.style.pointerEvents = "";
        pdfView.style.zIndex = "";
        introView.style.zIndex = "";
        if (keepActive) {
            introView.classList.add('hidden', 'z-low');
            introView.classList.remove('z-top');
            pdfView.classList.add('active', 'z-top');
            pdfView.classList.remove('z-low');
        } else {
            introView.classList.remove('hidden', 'z-low');
            introView.classList.add('z-top');
            pdfView.classList.remove('active', 'z-top');
            pdfView.classList.add('z-low');
        }
    },
    toggleCVMode() {
        const { pdfView, introView } = this.els;
        const terminal = document.getElementById('mainTerminalContainer');
        const isTerminalClosed = terminal && (terminal.classList.contains('hidden') || terminal.classList.contains('d-none') || window.getComputedStyle(terminal).display === 'none');
        if (isTerminalClosed) {
            const isCvExpanded = this.els.rightContainer.contains(pdfView);
            !isCvExpanded ? this.moveCvToRight() : this.moveCvToLeft(false);
        } else {
            const isCvActive = pdfView.classList.contains('active');
            pdfView.style.pointerEvents = "";
            pdfView.style.zIndex = "";
            introView.style.zIndex = "";
            if (!isCvActive) {
                introView.classList.add('hidden', 'z-low');
                introView.classList.remove('z-top');
                pdfView.classList.add('active', 'z-top');
                pdfView.classList.remove('z-low');
            } else {
                introView.classList.remove('hidden', 'z-low');
                introView.classList.add('z-top');
                pdfView.classList.remove('active', 'z-top');
                pdfView.classList.add('z-low');
            }
        }
    }
};

/* ==========================================================
   3. GESTOR DE TERMINAL (CORE)
   ========================================================== */
const tabManager = {
    tabs: [],
    activeTabId: null,
    savedFirstForm: null,
    dom: {},

    init() {
        this.dom.tabsContainer = document.getElementById('tabsContainer');
        if (!this.dom.tabsContainer) return;
        this.dom.actionsContainer = document.getElementById('actionsContainer');
        this.dom.terminalContent = document.getElementById('terminalContent');
        this.dom.winContainer = document.getElementById('mainTerminalContainer');
        this.dom.restoreContainer = document.getElementById('restoreTerminalContainer');
        this.dom.restoreBtn = document.getElementById('btn-restore-terminal');
        this.dom.winControls = document.querySelector('.win-controls');

        this.setupEvents();
        this.addTab();
    },

    setupEvents() {
        this.dom.tabsContainer.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.close-tab-btn');
            const tabItem = e.target.closest('.win-tab');
            if (closeBtn) { e.stopPropagation(); this.closeTab(parseInt(closeBtn.dataset.id)); }
            else if (tabItem) { this.switchTab(parseInt(tabItem.dataset.id)); }
        });

        this.dom.actionsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.add-tab-btn')) this.addTab();
            if (e.target.closest('.help-tab-btn')) this.showHelp();
            if (e.target.closest('.whatsapp-btn-menu')) this.handleWhatsAppLogic();
            if (e.target.closest('.maximize-btn-menu')) this.toggleMaximize();
        });

        this.dom.winControls.addEventListener('click', (e) => {
            const btn = e.target.closest('.control-btn');
            if (!btn) return;
            const label = btn.getAttribute('aria-label');
            if (label === 'Minimizar' || label === 'Cerrar') this.hideWindow();
            if (label === 'Maximizar') this.toggleMaximize();
        });

        if (this.dom.restoreBtn) this.dom.restoreBtn.addEventListener('click', () => this.restoreTerminal());

        this.dom.terminalContent.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.id === 'btn-whatsapp') this.handleWhatsAppLogic(e);
            else if (btn.dataset.action === 'new-session') this.render();
        });

        this.dom.terminalContent.addEventListener('submit', (e) => {
            if (e.target.id === 'terminalForm') this.handleFormSubmit(e);
        });

        this.dom.terminalContent.addEventListener('input', (e) => {
            const target = e.target;
            if (target.id === 'userMsg') {
                target.style.height = 'auto';
                target.style.height = (target.scrollHeight) + 'px';
            }
            if (!this.activeTabId) return;
            const currentTab = this.tabs.find(t => t.id === this.activeTabId);
            if (currentTab) {
                if (target.id === 'userName') currentTab.data.name = target.value;
                if (target.id === 'userEmail') currentTab.data.email = target.value;
                if (target.id === 'userMsg') currentTab.data.msg = target.value;
            }
        });
    },

    addTab(restoredData = null) {
        if (this.tabs.length >= CONFIG.MAX_TABS) return;
        const id = Date.now();
        this.tabs.push({ id, title: "Windows PowerShell", data: restoredData || { name: '', email: '', msg: '' } });
        this.switchTab(id);
    },
    switchTab(id) { this.activeTabId = id; this.render(); },
    closeTab(id) {
        const idx = this.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;
        if (idx === 0 || this.tabs[idx].data.name) this.savedFirstForm = { ...this.tabs[idx].data };
        this.tabs.splice(idx, 1);
        this.tabs.length === 0 ? this.hideWindow() : this.switchTab((this.tabs[idx - 1] || this.tabs[this.tabs.length - 1]).id);
    },

    render() {
        this.dom.tabsContainer.innerHTML = this.tabs.map(t => `
            <div class="win-tab ${t.id === this.activeTabId ? 'active' : ''}" data-id="${t.id}">
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/PowerShell_5.0_icon.png" width="14" class="me-2" aria-hidden="true">
                <span>${t.title}</span>
                <i class="bi bi-x small ms-auto close-tab-btn" data-id="${t.id}" role="button" aria-label="Cerrar"></i>
            </div>
        `).join('');

        this.dom.actionsContainer.innerHTML = `
            <div class="d-flex align-items-center ms-2 position-relative">
                <div class="win-action-btn add-tab-btn p-1 px-2" role="button" aria-label="Nueva Pestaña"><i class="bi bi-plus-lg" aria-hidden="true"></i></div>
                <div class="win-action-divider bg-secondary mx-1" style="width: 1px; height: 14px; opacity: 0.3;"></div>
                <div class="win-action-btn help-tab-btn p-1 px-2" role="button" aria-label="Menú"><i class="bi bi-chevron-down" aria-hidden="true"></i></div>
                <div id="terminal-help-dropdown" class="terminal-dropdown d-none">
                    <div class="dropdown-header">ACCIONES</div>
                    <div class="terminal-dropdown-item maximize-btn-menu"><span class="dropdown-icon"><i class="bi bi-window-fullscreen" aria-hidden="true"></i></span><span class="dropdown-text">Modo Inmersivo</span></div>
                    <div class="terminal-dropdown-item whatsapp-btn-menu"><span class="dropdown-icon text-accent-green"><i class="bi bi-whatsapp" aria-hidden="true"></i></span><span class="dropdown-text">Enviar a WhatsApp</span></div>
                </div>
            </div>
        `;

        const active = this.tabs.find(t => t.id === this.activeTabId);
        if (active) {
            this.dom.terminalContent.innerHTML = `
                <form id="terminalForm" novalidate class="h-100 d-flex flex-column">
                    <div class="form-scroll-area">
                        <p class="ps-header mb-3">Yurak PowerShell<br>Contactame y empecemos a trabajar.</p>
                        <div class="mb-4">
                            <label class="ps-label">PS C:\\Users\\guest> Name</label>
                            <input type="text" id="userName" class="ps-input" value="${active.data.name}" placeholder="Ej: Juan Pérez" autocomplete="off">
                            <div id="error-userName"></div>
                        </div>
                        <div class="mb-4">
                            <label class="ps-label">PS C:\\Users\\guest> Email</label>
                            <input type="email" id="userEmail" class="ps-input" value="${active.data.email}" placeholder="Ej: contacto@email.com" autocomplete="off">
                            <div id="error-userEmail"></div>
                        </div>
                        <div class="mb-4">
                            <label class="ps-label">PS C:\\Users\\guest> Message</label>
                            <textarea id="userMsg" class="ps-input" rows="1" placeholder="Escribe tu mensaje...">${active.data.msg}</textarea>
                            <div id="error-userMsg"></div>
                        </div>
                    </div>
                    <div class="form-actions d-flex gap-3">
                        <button id="btn-whatsapp" class="btn btn-accent-green flex-grow-1 py-3" type="button">
                            <i class="bi bi-whatsapp me-2" aria-hidden="true"></i> WhatsApp
                        </button>
                        <button id="btn-submit" class="btn btn-accent-green flex-grow-1 py-3" type="submit">
                            <span class="btn-text">Start-Process "Enviar" <i class="bi bi-send-fill ms-2" aria-hidden="true"></i></span>
                            <span class="btn-loader d-none"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span></span>
                        </button>
                    </div>
                </form>
            `;
        } else {
            this.dom.terminalContent.innerHTML = '';
        }
    },

    async handleWhatsAppLogic() {
        if (typeof event !== 'undefined') {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        const name = document.getElementById('userName')?.value.trim() || "Visitante";
        const email = document.getElementById('userEmail')?.value.trim();
        const rawMsg = document.getElementById('userMsg')?.value.trim();
        const btn = document.getElementById('btn-whatsapp');

        if (!rawMsg) {
            window.open(`https://wa.me/${CONFIG.WHATSAPP_PHONE}`, '_blank');
            return;
        }

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Generando Link...`;

        let finalMessage = "";

        try {
            const persona = "Eres un asistente de comunicación personal. Tu objetivo es estructurar mensajes de clientes para que sean claros, directos y gramaticalmente correctos.";
            const prompt = `
            Instrucción: Genera un mensaje de WhatsApp listo para enviar, unificando los siguientes datos.
            
            DATOS DE ENTRADA:
            - Cliente: ${name}
            - Email: ${email || "No especificado"}
            - Mensaje original: "${rawMsg}"
            
            REGLAS OBLIGATORIAS:
            1. NO repitas saludos ni despedidas innecesarias.
            2. Integra el mensaje original corrigiendo ortografía y gramática.
            3. Si hay email, agrégalo al final con un conector tipo "Mi correo es...".
            4. Salida: SOLO el texto final, sin comillas ni explicaciones.
            5. Siempre agrega un saludo por parte del usuario hacia Yurak "Hola Yurak yo soy ${name}" "Hola Yurak, soy ${name}"
            6. Si el mensaje del usuario ya tiene todos los componentes solo en ese caso deja el mensaje tal como está y devuelve eso mismo
            `;
            const aiText = await AIService.ask(prompt, persona);

            if (aiText && aiText.trim().length > 0) finalMessage = aiText.trim();
            else throw new Error("Respuesta IA vacía");
        } catch (error) {
            console.warn("Fallo IA, usando texto original:", error);
            finalMessage = `Hola Yurak, soy ${name}. ${rawMsg}`;
            if (email) finalMessage += ` (Mi correo es: ${email})`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }

        const url = `https://wa.me/${CONFIG.WHATSAPP_PHONE}?text=${encodeURIComponent(finalMessage)}`;
        window.open(url, '_blank');
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const msg = document.getElementById('userMsg').value.trim();
        const btn = document.getElementById('btn-submit');

        const showError = (id, text) => { document.getElementById(id).innerHTML = `<span class="ps-error-msg">> [ERROR]: ${text}</span>`; };
        document.querySelectorAll('[id^="error-"]').forEach(el => el.innerHTML = '');

        let hasError = false;
        if (!name) { showError('error-userName', "Nombre requerido."); hasError = true; }
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showError('error-userEmail', "Email inválido."); hasError = true; }
        if (!msg) { showError('error-userMsg', "Mensaje vacío."); hasError = true; }

        if (hasError) return;

        btn.disabled = true;
        btn.querySelector('.btn-text').classList.add('d-none');
        btn.querySelector('.btn-loader').classList.remove('d-none');

        try {
            const response = await fetch("https://formsubmit.co/ajax/yurakchalenp@gmail.com", {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ nombre: name, correo: email, mensaje: msg })
            });

            if (response.ok) {
                const activeTab = this.tabs.find(t => t.id === this.activeTabId);
                if (activeTab) activeTab.data = { name: '', email: '', msg: '' };
                this.dom.terminalContent.innerHTML = `
                    <div class="h-100 d-flex flex-column justify-content-center align-items-center text-center fade-transition show">
                        <i class="bi bi-check-circle-fill text-accent-green display-4 mb-3" aria-hidden="true"></i>
                        <h4 class="text-white">Transmisión Exitosa</h4>
                        <p class="text-muted-custom font-monospace small">
                            > [STATUS]: 200 OK<br>> [TIME]: ${new Date().toLocaleTimeString()}
                        </p>
                        <button class="btn btn-outline-light btn-sm mt-3" data-action="new-session">
                            <i class="bi bi-arrow-counterclockwise me-2" aria-hidden="true"></i>Nueva Sesión
                        </button>
                    </div>
                `;
            } else throw new Error('Network response was not ok');
        } catch (error) {
            alert("Error de conexión: " + error.message);
            btn.disabled = false;
            btn.querySelector('.btn-text').classList.remove('d-none');
            btn.querySelector('.btn-loader').classList.add('d-none');
        }
    },

    hideWindow() {
        this.dom.winContainer?.classList.add('hidden');
        this.dom.restoreContainer?.classList.remove('d-none');
        layoutManager.moveCvToRight();
    },
    restoreTerminal() {
        this.dom.winContainer?.classList.remove('hidden');
        this.dom.restoreContainer?.classList.add('d-none');
        layoutManager.moveCvToLeft(true);
        if (this.tabs.length === 0 && this.savedFirstForm) this.addTab(this.savedFirstForm);
        else if (this.tabs.length === 0) this.addTab();
    },
    toggleMaximize() { this.dom.winContainer?.classList.toggle('maximized'); },
    showHelp() { document.getElementById('terminal-help-dropdown')?.classList.remove('d-none'); setTimeout(() => { document.addEventListener('click', (e) => { if (!e.target.closest('#terminal-help-dropdown') && !e.target.closest('.help-tab-btn')) document.getElementById('terminal-help-dropdown')?.classList.add('d-none'); }, { once: true }); }, 10); }
};

/* ==========================================================
   4. SERVICIO DE DATOS (PROYECTOS)
   ========================================================== */
const ProjectService = {
    async getAll() {
        try {
            const response = await fetch('proyectos.json?v=' + new Date().getTime());
            const data = await response.json();
            return data.proyectos;
        } catch (error) {
            console.error("Error cargando base de datos de proyectos:", error);
            return [];
        }
    },
    async getById(id) {
        const proyectos = await this.getAll();
        return proyectos.find(p => p.id === id);
    }
};

/* ==========================================================
   5. RENDERIZADORES DINÁMICOS
   ========================================================== */
const projectApp = {
    async init() {
        const path = window.location.pathname;

        const trackContainer = document.getElementById('projectTrack');
        if (trackContainer) {
            const proyectos = await ProjectService.getAll();
            trackContainer.innerHTML = proyectos.map(p => this.templateCarouselItem(p)).join('');
        }

        if (path.includes('proyectos.html')) {
            const container = document.querySelector('.project-archive-grid');
            if (!container) return;
            const proyectos = await ProjectService.getAll();
            container.innerHTML = proyectos.map(p => this.templateDossier(p)).join('');
        }

        if (path.includes('proyecto-detalle.html')) {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            const proyecto = await ProjectService.getById(id);

            if (proyecto) this.renderDetail(proyecto);
            else window.location.href = 'proyectos.html';
        }
    },

    templateCarouselItem(p) {
        const icon = p.icon || 'bi-folder';
        const categoryTag = p.category.split('/')[0].trim().toUpperCase();
        return `
            <div class="project-item">
                <a href="proyecto-detalle.html?id=${p.id}" class="project-card p-4">
                    <div class="project-card-bg" style="background-image: url('${p.image}');"></div>
                    <div class="project-card-overlay"></div>
                    <div class="project-card-content">
                        <div class="icon-box mb-3 text-white"><i class="bi ${icon}"></i></div>
                        <span class="category-tag text-uppercase mb-2 d-block small text-accent-blue fw-bold">${categoryTag}</span>
                        <h3 class="h4 fw-bold mb-3 text-white">${p.title}</h3>
                        <p class="text-white opacity-75 small mb-4 flex-grow-1">${p.short_desc}</p>
                        <div class="small fw-semibold mt-auto text-accent-blue">Saber más <i class="bi bi-box-arrow-up-right ms-1"></i></div>
                    </div>
                </a>
            </div>`;
    },

    templateDossier(p) {
        return `
            <article class="project-dossier position-relative" style="cursor: pointer; border-radius: 8px;">
                <div class="dossier-header">
                    <span class="dossier-id">REF: ${p.id.toUpperCase()}</span>
                    <span class="dossier-status">${p.status}</span>
                </div>
                <div class="dossier-body">
                    <div class="row align-items-center">
                        <div class="col-lg-4">
                            <div class="dossier-preview">
                                <img src="${p.image}" alt="${p.alt || `Vista previa de ${p.title}`}">
                                <div class="scan-line" aria-hidden="true"></div>
                            </div>
                        </div>
                        <div class="col-lg-5">
                            <h2 class="h3 fw-bold text-white mb-2">${p.title}</h2>
                            <p class="text-muted-custom small mb-3">${p.short_desc}</p>
                            <div class="tech-stack font-monospace">
                                ${p.tech.map(t => `<span>${t}</span>`).join('')}
                            </div>
                        </div>
                        <div class="col-lg-3 text-lg-end">
                            <a href="proyecto-detalle.html?id=${p.id}" class="btn-dossier-link stretched-link" aria-label="Ver detalles del proyecto ${p.title}">
                                <span class="text">VER RECURSOS</span>
                                <i class="bi bi-cpu" aria-hidden="true"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </article>`;
    },

    async renderDetail(p) {
        document.title = `${p.title} | Yurak Chalen`;
        document.querySelector('.display-3').innerText = p.title;
        document.querySelector('.meta-category').innerText = p.category;
        document.querySelector('.meta-platform').innerText = p.platform;

        const statusEl = document.querySelector('.status-text');
        statusEl.innerHTML = `<i class="bi bi-record-fill me-1" aria-hidden="true"></i> ${p.status}`;

        document.querySelector('#desc-problema').innerText = p.problem;
        document.querySelector('#desc-ux').innerText = p.ux;
        document.querySelector('#desc-dev').innerText = p.dev;

        const mediaContainer = document.querySelector('.project-media-container');
        if (p.gallery && p.gallery.length > 0) {
            let indicators = '';
            let inner = '';
            p.gallery.forEach((imgUrl, i) => {
                const active = i === 0 ? 'active' : '';
                indicators += `<button type="button" data-bs-target="#projectGallery" data-bs-slide-to="${i}" class="${active}" aria-current="true" aria-label="Slide ${i + 1}"></button>`;
                inner += `
                    <div class="carousel-item ${active}">
                        <img src="${imgUrl}" class="d-block w-100 img-fluid rounded-3" alt="Vista ${i + 1} de ${p.title}">
                    </div>`;
            });

            mediaContainer.innerHTML = `
                <div id="projectGallery" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-indicators">${indicators}</div>
                    <div class="carousel-inner rounded-3">${inner}</div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#projectGallery" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Anterior</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#projectGallery" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Siguiente</span>
                    </button>
                    <div class="media-overlay"></div>
                </div>
            `;
        } else {
            mediaContainer.innerHTML = `
                <img src="${p.image}" alt="${p.alt || `Vista previa de ${p.title}`}" class="img-fluid rounded-3 w-100">
                <div class="media-overlay"></div>
            `;
        }

        const tags = document.querySelector('.tech-tags-container');
        tags.innerHTML = p.tech.map(t => `<span class="tag-fira">${t}</span>`).join('');

        const demoBtn = document.getElementById('btn-demo');
        if (demoBtn) {
            demoBtn.href = p.demoUrl || '#';
            if (!p.demoUrl || p.demoUrl === '#') {
                demoBtn.classList.add('d-none'); // Ocultar si no hay web
            } else {
                const label = p.demoLabel || 'Ejecutar Demo';
                const icon = p.demoIcon || 'bi-play-circle';
                demoBtn.innerHTML = `${label} <i class="bi ${icon} ms-2" aria-hidden="true"></i>`;
                demoBtn.classList.remove('d-none');
            }
        }

        const repoBtn = document.getElementById('btn-repo');
        if (repoBtn) {
            repoBtn.href = p.repoUrl || '#';
            if (!p.repoUrl || p.repoUrl === '#') {
                repoBtn.classList.add('opacity-50');
                repoBtn.style.pointerEvents = 'none';
            }
        }

        const relatedContainer = document.getElementById('related-projects-container');
        if (relatedContainer) {
            const allProj = await ProjectService.getAll();
            const related = allProj.filter(proj => proj.id !== p.id).sort(() => 0.5 - Math.random()).slice(0, 2);

            relatedContainer.innerHTML = related.map(rp => `
                <div class="col-md-6">
                    <a href="proyecto-detalle.html?id=${rp.id}" class="project-card border-secondary p-4 h-100 d-block text-decoration-none" style="min-height: 200px;">
                        <div class="project-card-bg" style="background-image: url('${rp.image}');"></div>
                        <div class="project-card-overlay"></div>
                        <div class="project-card-content position-relative z-index-2">
                            <span class="category-tag text-uppercase mb-2 d-block small text-accent-blue fw-bold">${(rp.category || "").split('/')[0].trim().toUpperCase()}</span>
                            <h4 class="h5 fw-bold text-white mb-2">${rp.title}</h4>
                            <p class="text-white opacity-75 small m-0">${rp.short_desc.substring(0, 80)}...</p>
                        </div>
                    </a>
                </div>
            `).join('');
        }
    }
};

/* ==========================================================
   INICIALIZACIÓN GLOBAL ÚNICA
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar UI General
    UX.init();

    // 2. Inicializar Terminal (si existe en la página)
    tabManager.init();

    // 3. Inicializar App de Proyectos (Lista y Detalles)
    projectApp.init();

    // 4. Delegación de Eventos (CV Toggle)
    document.body.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-action="toggle-cv"]');
        if (trigger) {
            e.preventDefault();
            layoutManager.toggleCVMode();
        }
    });
});