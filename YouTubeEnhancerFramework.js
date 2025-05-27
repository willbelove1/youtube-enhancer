(function () {
    "use strict";

    // Core Framework Class
    class YouTubeEnhancerCore {
        constructor() {
            this.modules = new Map();
            this.observers = [];
            this.settings = {};
            this.uiContainer = null;
        }

        // Register a new module
        registerModule(module) {
            this.modules.set(module.id, module);
            this.settings[module.id] = {
                enabled: GM_getValue(`module_${module.id}_enabled`, module.defaultEnabled),
                config: GM_getValue(`module_${module.id}_config`, module.defaultConfig || {})
            };
            module.core = this;
            if (this.settings[module.id].enabled) {
                this.runModule(module.id);
            }
        }

        // Run a module
        runModule(moduleId) {
            const module = this.modules.get(moduleId);
            if (module && this.settings[moduleId].enabled) {
                try {
                    module.run();
                    console.log(`[YouTubeEnhancer] Module ${module.name} started`);
                } catch (e) {
                    console.error(`[YouTubeEnhancer] Error running module ${module.name}:`, e);
                }
            }
        }

        // Toggle module enabled state
        toggleModule(moduleId, enabled) {
            this.settings[moduleId].enabled = enabled;
            GM_setValue(`module_${moduleId}_enabled`, enabled);
            if (enabled) {
                this.runModule(moduleId);
            } else {
                this.modules.get(moduleId)?.stop?.();
            }
            this.renderSettingsUI();
        }

        // Update module config
        updateConfig(moduleId, config) {
            this.settings[moduleId].config = config;
            GM_setValue(`module_${moduleId}_config`, config);
            if (this.settings[moduleId].enabled) {
                this.runModule(moduleId);
            }
        }

        // Setup DOM observer
        setupObserver(target, config, callback) {
            const observer = new MutationObserver(this.throttle(callback, 150));
            observer.observe(target, config);
            this.observers.push(observer);
        }

        // Throttle function
        throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => (inThrottle = false), limit);
                }
            };
        }

        // Render Settings UI
        renderSettingsUI() {
            if (!this.uiContainer) {
                this.uiContainer = document.createElement("div");
                this.uiContainer.id = "youtube-enhancer-settings";
                document.body.appendChild(this.uiContainer);
            }

            this.uiContainer.innerHTML = `
                <style>
                    @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
                    #youtube-enhancer-settings {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 350px;
                        max-height: 80vh;
                        overflow-y: auto;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        z-index: 10000;
                        padding: 16px;
                        font-family: Arial, sans-serif;
                    }
                    #youtube-enhancer-settings.hidden {
                        display: none;
                    }
                    .module-item {
                        margin-bottom: 16px;
                    }
                    .module-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .module-config {
                        margin-top: 8px;
                        padding-left: 16px;
                    }
                    .toggle-button {
                        cursor: pointer;
                    }
                </style>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold">YouTube Enhancer Settings</h2>
                    <button class="toggle-button bg-gray-200 px-2 py-1 rounded" onclick="document.getElementById('youtube-enhancer-settings').classList.toggle('hidden')">X</button>
                </div>
                <div>
                    ${Array.from(this.modules.entries())
                        .map(
                            ([id, module]) => `
                                <div class="module-item">
                                    <div class="module-header">
                                        <span>${module.name}</span>
                                        <input type="checkbox" class="toggle-button" data-module-id="${id}" ${
                                            this.settings[id].enabled ? "checked" : ""
                                        }>
                                    </div>
                                    ${module.renderConfig?.(this.settings[id].config) || ""}
                                </div>
                            `
                        )
                        .join("")}
                </div>
            `;

            this.uiContainer.querySelectorAll(".toggle-button[data-module-id]").forEach((button) => {
                button.addEventListener("change", (e) => {
                    const moduleId = e.target.dataset.moduleId;
                    this.toggleModule(moduleId, e.target.checked);
                });
            });

            this.modules.forEach((module, id) => {
                if (module.bindConfigEvents) {
                    module.bindConfigEvents(this.uiContainer, this.settings[id].config, (newConfig) =>
                        this.updateConfig(id, newConfig)
                    );
                }
            });
        }

        // Initialize framework
        init() {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => this.start());
            } else {
                this.start();
            }
        }

        // Start framework
        start() {
            this.renderSettingsUI();
            this.modules.forEach((module, id) => {
                if (this.settings[id].enabled) {
                    this.runModule(id);
                }
            });
            console.log("[YouTubeEnhancer] Framework initialized");
        }
    }

    // Module Interface
    class Module {
        constructor(id, name, defaultEnabled = true, defaultConfig = {}) {
            this.id = id;
            this.name = name;
            this.defaultEnabled = defaultEnabled;
            this.defaultConfig = defaultConfig;
            this.core = null;
        }

        run() {}
        stop() {}
        renderConfig() {}
        bindConfigEvents() {}
    }

    // Module: Remove YouTube Share Identifier
    class RemoveShareIdentifierModule extends Module {
        constructor() {
            super("remove-share-identifier", "Remove Share Identifier", true);
        }

        run() {
            const observer = new MutationObserver((mutations) => {
                const shareNodes = mutations
                    .filter((m) => m.addedNodes[0]?.tagName === "YT-COPY-LINK-RENDERER")
                    .map((m) => m.addedNodes[0]);
                if (!shareNodes.length) return;
                const input = shareNodes[0].querySelector("input#share-url");
                if (!input) return;
                const cleanUrl = input.value
                    .split(/[?&]/)
                    .filter((part) => !part.includes("si="))
                    .join(input.value.includes("?") ? "&" : "?");
                input.value = cleanUrl;
                let currentUrl = cleanUrl;
                const updateUrl = () => {
                    if (!input || input.value === currentUrl) return;
                    const newParts = input.value
                        .split(/[?&]/)
                        .filter((part) => !part.includes("si="));
                    input.value = newParts.length > 1 ? `${newParts[0]}?${newParts.slice(1).join("&")}` : newParts[0];
                    currentUrl = input.value;
                    window.requestAnimationFrame(updateUrl);
                };
                window.requestAnimationFrame(updateUrl);
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            this.core.observers.push(observer);
        }
    }

    // Module: YouTube Plus
    class YouTubePlusModule extends Module {
        constructor() {
            super("youtube-plus", "YouTube Plus", true, {
                maxVolume: true,
                speedButton: true,
                speed3Button: false,
                premiumQuality: true,
                hidePiPButton: true,
                showNickname: true,
                hideCeElement: true
            });
        }

        run() {
            const config = this.core.settings[this.id].config;

            // Add CSS
            if (!document.querySelector("style.youtube-plus-style")) {
                const speedButtonSvg = `<?xml version="1.0" standalone="no"?><svg t="1737240990275" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4235" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200"><path d="M512 512a53.44 53.44 0 0 1-17.4 39.413333L131.933333 882a52.833333 52.833333 0 0 1-35.713333 14 53.84 53.84 0 0 1-21.76-4.666667A52.666667 52.666667 0 0 1 42.666667 842.593333V181.406667A53.333333 53.333333 0 0 1 131.926667 142l362.666666 330.6A53.44 53.44 0 0 1 512 512z m451.933333-39.413333L601.26 142A53.333333 53.333333 0 0 0 512 181.406667v661.186666a52.666667 52.666667 0 0 0 31.793333 48.793334 53.84 53.84 0 0 0 21.76 4.666666 52.833333 52.833333 0 0 0 35.713334-14l362.666666-330.6a53.333333 53.333333 0 0 0 0-78.826666z" fill="#ffffff" p-id="4236"></path></svg>`;
                const style = document.createElement("style");
                style.className = "youtube-plus-style";
                style.textContent = `
                    div.ytp-speed-button { display: flex; }
                    span.ytp-speed-button { width: 48px; height: 48px; display: flex; justify-content: center; align-items: center; position: relative; cursor: pointer; }
                    span.ytp-speed-button::before { content: ""; background: url('data:image/svg+xml;utf8,${encodeURIComponent(speedButtonSvg)}'); width: 20px; height: 20px; background-size: contain; }
                    span.ytp-speed-button::after { content: "1x"; position: absolute; top: -7px; left: 28px; font-size: 12px; transform: scale(0.8); color: white; pointer-events: none; text-align: left; }
                    span.ytp-speed-button-active::after { color: red; }
                    span.ytp-speed-button-05x::after { content: "0.5x"; }
                    span.ytp-speed-button-1x::after { content: "1x"; }
                    span.ytp-speed-button-15x::after { content: "1.25x"; }
                    span.ytp-speed-button-2x::after { content: "2x"; }
                    span.ytp-speed-button-3x { display: none; }
                    span.ytp-speed-button-3x::after { content: "3x"; }
                    .yt-plus-nickname { color: #0f0f0f; }
                    .yt-plus-username { color: rgba(0, 0, 0, 0.4); margin-left: 5px; }
                    ytd-author-comment-badge-renderer[creator] .yt-plus-nickname { color: unset; }
                    ytd-author-comment-badge-renderer[creator] .yt-plus-username { color: unset; opacity: 0.4; }
                    body.ytp-hide-pip-button .ytp-pip-button, body.ytp-hide-pip-button .ytp-miniplayer-button, body.ytp-hide-pip-button .ytp-size-button { display: none !important; }
                    body.ytp-show-speed3button .ytp-speed-button-3x { display: flex; }
                    body.ytp-hide-ce-element .ytp-ce-element { opacity: 0.3 !important; }
                    body.ytp-hide-ce-element .ytp-ce-element.ytp-ce-element-hover { opacity: 1 !important; }
                `;
                document.head.appendChild(style);
            }

            // Interval to check player and apply features
            const interval = setInterval(() => {
                const player = document.querySelector(".video-stream");
                const volumePanel = document.querySelector(".ytp-volume-panel");
                const volumeSlider = document.querySelector(".ytp-volume-slider-handle");
                const commentSection = document.querySelector("ytd-comments #contents");

                if (player && volumePanel && volumeSlider) {
                    if (!player.isHookYoutubePlus) {
                        player.isHookYoutubePlus = true;

                        if (config.maxVolume) {
                            player.addEventListener("volumechange", () => {
                                if (parseInt(volumePanel.getAttribute("aria-valuenow")) === 100) {
                                    volumeSlider.style.backgroundColor = "red";
                                    if (player.volume !== 1) {
                                        player.volume = 1;
                                    }
                                } else {
                                    volumeSlider.style.backgroundColor = "white";
                                }
                            });
                        }

                        if (config.speedButton) {
                            this.addSpeedButton(player);
                        }
                        if (config.premiumQuality) {
                            this.switchToPremiumQuality();
                        }
                        if (config.hidePiPButton) {
                            document.body.classList.add("ytp-hide-pip-button");
                        }
                        if (config.speed3Button) {
                            document.body.classList.add("ytp-show-speed3button");
                        }
                        if (config.hideCeElement) {
                            document.body.classList.add("ytp-hide-ce-element");
                        }
                    }
                }

                if (commentSection && config.showNickname && !commentSection.isHookYoutubePlus_Comment) {
                    commentSection.isHookYoutubePlus_Comment = true;
                    this.registerCommentWatcher();
                }
            }, 300);

            this.interval = interval;
        }

        stop() {
            if (this.interval) {
                clearInterval(this.interval);
            }
            if (this.commentObserver) {
                this.commentObserver.disconnect();
            }
            document.body.classList.remove("ytp-hide-pip-button", "ytp-show-speed3button", "ytp-hide-ce-element");
        }

        addSpeedButton(player) {
            if (document.querySelector(".ytp-speed-button")) return;
            const controls = document.querySelector(".ytp-left-controls");
            let speedButtonActive = 0;
            try {
                speedButtonActive = parseFloat(JSON.parse(sessionStorage.getItem("yt-player-playback-rate")).data);
            } catch {}
            const speedButtonDiv = document.createElement("div");
            speedButtonDiv.className = "ytp-speed-button";
            const speedButtons = [];
            [0.5, 1, 1.25, 2, 3].forEach((speed) => {
                const speedButton = document.createElement("span");
                speedButton.className = `ytp-speed-button ytp-speed-button-${speed.toString().replace(".", "")}x`;
                speedButton.onclick = () => {
                    player.playbackRate = speed;
                    document.querySelector("#movie_player")?.setPlaybackRate(speed);
                    sessionStorage.setItem("yt-player-playback-rate", JSON.stringify({ data: speed.toString(), creation: new Date().getTime() }));
                    speedButtons.forEach((v) => v.classList.remove("ytp-speed-button-active"));
                    speedButton.classList.add("ytp-speed-button-active");
                };
                if (speedButtonActive === speed) speedButton.classList.add("ytp-speed-button-active");
                speedButtons.push(speedButton);
                speedButtonDiv.appendChild(speedButton);
            });
            controls.parentNode.insertBefore(speedButtonDiv, controls.nextSibling);
        }

        switchToPremiumQuality() {
            const qualityList = unsafeWindow?.ytInitialPlayerResponse?.playabilityStatus?.paygatedQualitiesMetadata?.qualityDetails?.map((v) => v.key) || [];
            const nowQuality = document.querySelector("#movie_player")?.getPlaybackQualityLabel().replace(" Premium", "");
            if (qualityList.includes(`${nowQuality} Premium`)) {
                document.querySelector(".ytp-settings-button")?.click();
                if (!document.querySelector(".ytp-quality-menu")) {
                    document.querySelector(".ytp-panel-menu .ytp-menuitem:last-of-type")?.click();
                }
                const qualityOptions = {};
                document.querySelector(".ytp-quality-menu .ytp-panel-menu")?.childNodes.forEach((v, i) => {
                    qualityOptions[v.querySelector("span").firstChild.textContent.trim()] = i;
                });
                document.querySelector(".ytp-quality-menu .ytp-panel-menu")?.childNodes[qualityOptions[`${nowQuality} Premium`]]?.click();
            }
        }

        registerCommentWatcher() {
            if (this.commentObserver) {
                this.commentObserver.disconnect();
            }
            this.commentObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "childList") {
                        mutation.addedNodes.forEach((node) => {
                            if (node.tagName?.toLowerCase() === "ytd-comment-view-model") {
                                let author = node.querySelector("#author-comment-badge") || node.querySelector("#author-text");
                                let url = author.querySelector("a#name")?.href || author.href;
                                let username = author.querySelector("yt-formatted-string")?.title || author.querySelector("span").innerText.trim();
                                fetch(url)
                                    .then((res) => res.text())
                                    .then((text) => {
                                        const match = /<meta property="og:title" content="(.*?)">/.exec(text);
                                        if (match) {
                                            const nicknameNode = document.createElement("span");
                                            nicknameNode.textContent = match[1];
                                            nicknameNode.className = "yt-plus-nickname";
                                            const usernameNode = document.createElement("span");
                                            usernameNode.textContent = username;
                                            usernameNode.className = "yt-plus-username";
                                            author.replaceChildren(nicknameNode, usernameNode);
                                        }
                                    })
                                    .catch((e) => console.error("[YouTubePlus] Error fetching nickname:", e));
                            }
                        });
                    }
                }
            });
            this.commentObserver.observe(document.querySelector("ytd-comments #contents"), {
                childList: true,
                subtree: true
            });
        }

        renderConfig(config) {
            return `
                <div class="module-config">
                    <label><input type="checkbox" class="config-maxVolume" ${config.maxVolume ? "checked" : ""}> Max Volume</label><br>
                    <label><input type="checkbox" class="config-speedButton" ${config.speedButton ? "checked" : ""}> Speed Button</label><br>
                    <label><input type="checkbox" class="config-speed3Button" ${config.speed3Button ? "checked" : ""}> 3x Speed Button</label><br>
                    <label><input type="checkbox" class="config-premiumQuality" ${config.premiumQuality ? "checked" : ""}> Premium Quality</label><br>
                    <label><input type="checkbox" class="config-hidePiPButton" ${config.hidePiPButton ? "checked" : ""}> Hide PiP Button</label><br>
                    <label><input type="checkbox" class="config-showNickname" ${config.showNickname ? "checked" : ""}> Show Nickname</label><br>
                    <label><input type="checkbox" class="config-hideCeElement" ${config.hideCeElement ? "checked" : ""}> Hide CE Element</label>
                </div>
            `;
        }

        bindConfigEvents(container, config, updateCallback) {
            const update = () => {
                const newConfig = {
                    maxVolume: container.querySelector(".config-maxVolume").checked,
                    speedButton: container.querySelector(".config-speedButton").checked,
                    speed3Button: container.querySelector(".config-speed3Button").checked,
                    premiumQuality: container.querySelector(".config-premiumQuality").checked,
                    hidePiPButton: container.querySelector(".config-hidePiPButton").checked,
                    showNickname: container.querySelector(".config-showNickname").checked,
                    hideCeElement: container.querySelector(".config-hideCeElement").checked
                };
                updateCallback(newConfig);
            };
            container.querySelectorAll(".module-config input").forEach((input) => {
                input.addEventListener("change", update);
            });
        }
    }

    // Module: YouTube Premium Logo
    class PremiumLogoModule extends Module {
        constructor() {
            super("premium-logo", "Premium Logo", true);
        }

        run() {
            const css = `
                #logo-container .logo, .footer-logo-icon, #logo-icon, #logo-icon-container {
                    width: 98px !important;
                    margin-left: 5px;
                    margin-right: 5px;
                    content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' id='SVGRoot' version='1.1' viewBox='0 0 846 174' height='80px' width='391px'%3E%3Cg id='layer1'%3E%3Cg transform='translate(0,0.36)' data-name='Layer 2' id='Layer_2'%3E%3Cg data-name='Layer 1' id='Layer_1-2'%3E%3Cpath style='fill:%23ff0000' id='path6' d='M 242.88,27.11 A 31.07,31.07 0 0 0 220.95,5.18 C 201.6,0 124,0 124,0 124,0 46.46,0 27.11,5.18 A 31.07,31.07 0 0 0 5.18,27.11 C 0,46.46 0,86.82 0,86.82 c 0,0 0,40.36 5.18,59.71 a 31.07,31.07 0 0 0 21.93,21.93 c 19.35,5.18 96.92,5.18 96.92,5.18 0,0 77.57,0 96.92,-5.18 a 31.07,31.07 0 0 0 21.93,-21.93 c 5.18,-19.35 5.18,-59.71 5.18,-59.71 0,0 0,-40.36 -5.18,-59.71 z' /%3E%3Cpath style='fill:%23ffffff' id='path8' d='M 99.22,124.03 163.67,86.82 99.22,49.61 Z' /%3E%3Cpath style='fill:%23282828' id='path10' d='m 358.29,55.1 v 6 c 0,30 -13.3,47.53 -42.39,47.53 h -4.43 v 52.5 H 287.71 V 12.36 H 318 c 27.7,0 40.29,11.71 40.29,42.74 z m -25,2.13 c 0,-21.64 -3.9,-26.78 -17.38,-26.78 h -4.43 v 60.48 h 4.08 c 12.77,0 17.74,-9.22 17.74,-29.26 z m 81.22,-6.56 -1.24,28.2 c -10.11,-2.13 -18.45,-0.53 -22.17,6 v 76.26 H 367.52 V 52.44 h 18.8 L 388.45,76 h 0.89 c 2.48,-17.2 10.46,-25.89 20.75,-25.89 a 22.84,22.84 0 0 1 4.42,0.56 z M 441.64,115 v 5.5 c 0,19.16 1.06,25.72 9.22,25.72 7.8,0 9.58,-6 9.75,-18.44 l 21.1,1.24 c 1.6,23.41 -10.64,33.87 -31.39,33.87 -25.18,0 -32.63,-16.49 -32.63,-46.46 v -19 c 0,-31.57 8.34,-47 33.34,-47 25.18,0 31.57,13.12 31.57,45.93 V 115 Z m 0,-22.35 v 7.8 h 17.91 V 92.7 c 0,-20 -1.42,-25.72 -9,-25.72 -7.58,0 -8.91,5.86 -8.91,25.72 z M 604.45,79 v 82.11 H 580 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8.16,2.48 -10.82,7.09 a 35.59,35.59 0 0 1 0.18,4.43 v 82.11 H 537.24 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8,2.48 -10.64,6.92 v 86.72 H 494.5 V 52.44 h 19.33 L 516,66.28 h 0.35 c 5.5,-10.46 14.37,-16.14 24.83,-16.14 10.29,0 16.14,5.14 18.8,14.37 5.68,-9.4 14.19,-14.37 23.94,-14.37 14.86,0 20.53,10.64 20.53,28.86 z m 12.24,-54.4 c 0,-11.71 4.26,-15.07 13.3,-15.07 9.22,0 13.3,3.9 13.3,15.07 0,12.06 -4.08,15.08 -13.3,15.08 -9.04,-0.01 -13.3,-3.02 -13.3,-15.08 z m 1.42,27.84 h 23.41 v 108.72 h -23.41 z m 103.39,0 v 108.72 h -19.15 l -2.13,-13.3 h -0.53 c -5.5,10.64 -13.48,15.07 -23.41,15.07 -14.54,0 -21.11,-9.22 -21.11,-29.26 V 52.44 h 24.47 v 79.81 c 0,9.58 2,13.48 6.92,13.48 A 12.09,12.09 0 0 0 697,138.81 V 52.44 Z M 845.64,79 v 82.11 H 821.17 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8.16,2.48 -10.82,7.09 A 35.59,35.59 0 0 1 802.9,79 v 82.11 H 778.43 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8,2.48 -10.64,6.92 v 86.72 H 735.69 V 52.44 H 755 l 2.13,13.83 h 0.35 c 5.5,-10.46 14.37,-16.14 24.83,-16.14 10.29,0 16.14,5.14 18.8,14.37 5.68,-9.4 14.19,-14.37 23.94,-14.37 14.95,0.01 20.59,10.65 20.59,28.87 z' /%3E%3C/g%3E%3C/g%3E%3C/g%3E%3C/svg%3E%0A") !important;
                }
                html[dark] #logo-icon, html[dark] #logo-icon-container {
                    width: 98px !important;
                    content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' id='SVGRoot' version='1.1' viewBox='0 0 846 174' height='24px' width='98px'%3E%3Cg id='layer1'%3E%3Cg transform='translate(0,0.36)' data-name='Layer 2' id='Layer_2'%3E%3Cg data-name='Layer 1' id='Layer_1-2'%3E%3Cpath style='fill:%23ff0000' id='path6' d='M 242.88,27.11 A 31.07,31.07 0 0 0 220.95,5.18 C 201.6,0 124,0 124,0 124,0 46.46,0 27.11,5.18 A 31.07,31.07 0 0 0 5.18,27.11 C 0,46.46 0,86.82 0,86.82 c 0,0 0,40.36 5.18,59.71 a 31.07,31.07 0 0 0 21.93,21.93 c 19.35,5.18 96.92,5.18 96.92,5.18 0,0 77.57,0 96.92,-5.18 a 31.07,31.07 0 0 0 21.93,-21.93 c 5.18,-19.35 5.18,-59.71 5.18,-59.71 0,0 0,-40.36 -5.18,-59.71 z' /%3E%3Cpath style='fill:%23ffffff' id='path8' d='M 99.22,124.03 163.67,86.82 99.22,49.61 Z' /%3E%3Cpath style='fill:%23ffffff' id='path10' d='m 358.29,55.1 v 6 c 0,30 -13.3,47.53 -42.39,47.53 h -4.43 v 52.5 H 287.71 V 12.36 H 318 c 27.7,0 40.29,11.71 40.29,42.74 z m -25,2.13 c 0,-21.64 -3.9,-26.78 -17.38,-26.78 h -4.43 v 60.48 h 4.08 c 12.77,0 17.74,-9.22 17.74,-29.26 z m 81.22,-6.56 -1.24,28.2 c -10.11,-2.13 -18.45,-0.53 -22.17,6 v 76.26 H 367.52 V 52.44 h 18.8 L 388.45,76 h 0.89 c 2.48,-17.2 10.46,-25.89 20.75,-25.89 a 22.84,22.84 0 0 1 4.42,0.56 z M 441.64,115 v 5.5 c 0,19.16 1.06,25.72 9.22,25.72 7.8,0 9.58,-6 9.75,-18.44 l 21.1,1.24 c 1.6,23.41 -10.64,33.87 -31.39,33.87 -25.18,0 -32.63,-16.49 -32.63,-46.46 v -19 c 0,-31.57 8.34,-47 33.34,-47 25.18,0 31.57,13.12 31.57,45.93 V 115 Z m 0,-22.35 v 7.8 h 17.91 V 92.7 c 0,-20 -1.42,-25.72 -9,-25.72 -7.58,0 -8.91,5.86 -8.91,25.72 z M 604.45,79 v 82.11 H 580 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8.16,2.48 -10.82,7.09 a 35.59,35.59 0 0 1 0.18,4.43 v 82.11 H 537.24 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8,2.48 -10.64,6.92 v 86.72 H 494.5 V 52.44 h 19.33 L 516,66.28 h 0.35 c 5.5,-10.46 14.37,-16.14 24.83,-16.14 10.29,0 16.14,5.14 18.8,14.37 5.68,-9.4 14.19,-14.37 23.94,-14.37 14.86,0 20.53,10.64 20.53,28.86 z m 12.24,-54.4 c 0,-11.71 4.26,-15.07 13.3,-15.07 9.22,0 13.3,3.9 13.3,15.07 0,12.06 -4.08,15.08 -13.3,15.08 -9.04,-0.01 -13.3,-3.02 -13.3,-15.08 z m 1.42,27.84 h 23.41 v 108.72 h -23.41 z m 103.39,0 v 108.72 h -19.15 l -2.13,-13.3 h -0.53 c -5.5,10.64 -13.48,15.07 -23.41,15.07 -14.54,0 -21.11,-9.22 -21.11,-29.26 V 52.44 h 24.47 v 79.81 c 0,9.58 2,13.48 6.92,13.48 A 12.09,12.09 0 0 0 697,138.81 V 52.44 Z M 845.64,79 v 82.11 H 821.17 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8.16,2.48 -10.82,7.09 A 35.59,35.59 0 0 1 802.9,79 v 82.11 H 778.43 V 80.82 c 0,-8.87 -2.31,-13.3 -7.63,-13.3 -4.26,0 -8,2.48 -10.64,6.92 v 86.72 H 735.69 V 52.44 H 755 l 2.13,13.83 h 0.35 c 5.5,-10.46 14.37,-16.14 24.83,-16.14 10.29,0 16.14,5.14 18.8,14.37 5.68,-9.4 14.19,-14.37 23.94,-14.37 14.95,0.01 20.59,10.65 20.59,28.87 z' /%3E%3C/g%3E%3C/g%3E%3C/g%3E%3C/svg%3E%0A") !important;
                }
            `;
            const style = document.createElement("style");
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        }
    }

    // Module: Auto Expand Comments
    class AutoExpandCommentsModule extends Module {
        constructor() {
            super("auto-expand-comments", "Auto Expand Comments", true, {
                scrollThrottle: 250,
                mutationThrottle: 150,
                initialDelay: 1500,
                clickInterval: 500,
                maxRetries: 5,
                maxClicksPerBatch: 3,
                scrollThreshold: 0.8
            });
        }

        run() {
            const config = this.core.settings[this.id].config;
            const SELECTORS = {
                COMMENTS: "ytd-comments#comments",
                COMMENTS_SECTION: "ytd-item-section-renderer#sections",
                REPLIES: "ytd-comment-replies-renderer",
                MORE_COMMENTS: "ytd-continuation-item-renderer #button:not([disabled])",
                SHOW_REPLIES: "#more-replies > yt-button-shape > button:not([disabled])",
                HIDDEN_REPLIES: "ytd-comment-replies-renderer ytd-button-renderer#more-replies button:not([disabled])",
                EXPANDED_REPLIES: "div#expander[expanded]",
                COMMENT_THREAD: "ytd-comment-thread-renderer"
            };

            class CommentExpander {
                constructor(core, config) {
                    this.core = core;
                    this.config = config;
                    this.observer = null;
                    this.retryCount = 0;
                    this.isProcessing = false;
                    this.lastScrollTime = 0;
                    this.lastMutationTime = 0;
                    this.expandedComments = new Set();
                    this.scrollHandler = core.throttle(this.handleScroll.bind(this), config.scrollThrottle);
                }

                getCommentId(element) {
                    const dataContext = element.getAttribute("data-context") || "";
                    const timestamp = element.querySelector("#header-author time")?.getAttribute("datetime") || "";
                    return `${dataContext}-${timestamp}`;
                }

                isCommentExpanded(element) {
                    return this.expandedComments.has(this.getCommentId(element));
                }

                markAsExpanded(element) {
                    const commentId = this.getCommentId(element);
                    element.classList.add("yt-auto-expanded");
                    this.expandedComments.add(commentId);
                }

                isElementClickable(element) {
                    if (!element || !element.offsetParent || element.disabled) return false;
                    const rect = element.getBoundingClientRect();
                    return (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
                        !element.disabled &&
                        (!element.hasAttribute("aria-expanded") || element.getAttribute("aria-expanded") === "false")
                    );
                }

                async clickElements(selector, maxClicks) {
                    let clickCount = 0;
                    const elements = Array.from(document.querySelectorAll(selector));
                    for (const element of elements) {
                        if (clickCount >= maxClicks) break;
                        const commentThread = element.closest(SELECTORS.COMMENT_THREAD);
                        if (commentThread && this.isCommentExpanded(commentThread)) continue;
                        if (this.isElementClickable(element)) {
                            element.scrollIntoView({ behavior: "auto", block: "center" });
                            await new Promise((resolve) => setTimeout(resolve, 100));
                            element.click();
                            if (commentThread) {
                                this.markAsExpanded(commentThread);
                                clickCount++;
                            }
                            await new Promise((resolve) => setTimeout(resolve, this.config.clickInterval));
                        }
                    }
                    return clickCount > 0;
                }

                async handleScroll() {
                    const now = Date.now();
                    if (now - this.lastScrollTime < this.config.scrollThrottle) return;
                    this.lastScrollTime = now;
                    if ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight > this.config.scrollThreshold) {
                        await this.processVisibleElements();
                    }
                }

                async processVisibleElements() {
                    if (this.isProcessing) return;
                    this.isProcessing = true;
                    try {
                        await this.clickElements(SELECTORS.MORE_COMMENTS, this.config.maxClicksPerBatch);
                        await this.clickElements(SELECTORS.SHOW_REPLIES, this.config.maxClicksPerBatch);
                        await this.clickElements(SELECTORS.HIDDEN_REPLIES, this.config.maxClicksPerBatch);
                    } finally {
                        this.isProcessing = false;
                    }
                }

                setupObserver() {
                    const commentsSection = document.querySelector(SELECTORS.COMMENTS_SECTION);
                    if (!commentsSection) return false;
                    this.observer = new MutationObserver(
                        this.core.throttle(async () => {
                            const now = Date.now();
                            if (now - this.lastMutationTime < this.config.mutationThrottle) return;
                            this.lastMutationTime = now;
                            await this.processVisibleElements();
                        }, this.config.mutationThrottle)
                    );
                    this.observer.observe(commentsSection, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ["hidden", "disabled", "aria-expanded"]
                    });
                    return true;
                }

                async init() {
                    if (this.retryCount >= this.config.maxRetries || !window.location.pathname.startsWith("/watch")) {
                        return;
                    }
                    if (!document.querySelector(SELECTORS.COMMENTS)) {
                        this.retryCount++;
                        setTimeout(() => this.init(), this.config.initialDelay);
                        return;
                    }
                    if (this.setupObserver()) {
                        window.addEventListener("scroll", this.scrollHandler, { passive: true });
                        await this.processVisibleElements();
                    }
                }
            }

            const expander = new CommentExpander(this.core, config);
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => setTimeout(() => expander.init(), config.initialDelay));
            } else {
                setTimeout(() => expander.init(), config.initialDelay);
            }
        }
    }

    // Module: Direct Downloader
    class DirectDownloaderModule extends Module {
        constructor() {
            super("direct-downloader", "Direct Downloader", true, {
                videoCodec: "h264",
                quality: "1080p",
                mode: "video",
                audioCodec: "mp3",
                dub: ""
            });
        }

        run() {
            const config = this.core.settings[this.id].config;
            const LANGUAGE_MAP = {
                af: "Afrikaans",
                am: "አማርኛ",
                ar: "العربية",
                // ... (rest of the language map)
            };

            const createDialog = () => {
                const dialog = document.createElement("div");
                dialog.className = "yt-download-dialog";
                dialog.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: #000000; color: #e1e1e1; border-radius: 12px;
                    box-shadow: 0 0 0 1px rgba(225,225,225,.1), 0 2px 4px 1px rgba(225,225,225,.18);
                    font-family: 'IBM Plex Mono', monospace; width: 400px; z-index: 9999;
                `;
                const dialogContent = document.createElement("div");
                dialogContent.style.padding = "16px";
                dialog.appendChild(dialogContent);

                const style = document.createElement("style");
                style.textContent = `
                    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
                    .quality-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
                    .quality-option { display: flex; align-items: center; padding: 8px; cursor: pointer; }
                    .quality-option:hover { background: #191919; border-radius: 6px; }
                    .logo-container { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
                    .subtitle { color: #e1e1e1; opacity: 0.7; font-size: 12px; margin-top: 4px; }
                    .title { font-size: 18px; font-weight: 700; }
                    .title-link { text-decoration: none; color: inherit; cursor: pointer; transition: opacity 0.2s ease; }
                    .title-link:hover { opacity: 0.8; }
                    .codec-selector { margin-bottom: 16px; display: flex; gap: 8px; justify-content: center; }
                    .codec-button { background: transparent; border: 1px solid #e1e1e1; color: #e1e1e1; padding: 6px 12px; border-radius: 14px; cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s ease; }
                    .codec-button:hover { background: #808080; color: #000000; }
                    .codec-button.selected { background: #1ed760; border-color: #1ed760; color: #000000; }
                    .download-status { text-align: center; margin: 16px 0; font-size: 12px; display: none; }
                    .button-container { display: flex; justify-content: center; gap: 8px; }
                    .switch-container { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; }
                    .switch-button { background: transparent; border: none; cursor: pointer; padding: 4px; }
                    .switch-button svg { width: 20px; height: 20px; fill: #e1e1e1; }
                    .audio-options { display: none; }
                    .audio-options.active { display: block; }
                    .dub-selector { margin-top: 16px; margin-bottom: 16px; display: none; }
                    .dub-select { width: 80%; margin: 0 auto; display: block; padding: 8px; background: #191919; color: #e1e1e1; border: 1px solid #e1e1e1; border-radius: 6px; font-family: inherit; cursor: pointer; }
                    .dub-button { border: 1px solid #39a9db; color: #39a9db; }
                    .dub-button:hover { background: #39a9db; color: #000000; }
                    .dub-button.selected { background: #39a9db; border-color: #39a9db; color: #000000; }
                `;
                dialog.appendChild(style);

                // Build dialog content (logo, title, codec selectors, etc.)
                const logoContainer = document.createElement("div");
                logoContainer.className = "logo-container";
                const logoSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                logoSvg.setAttribute("width", "24");
                logoSvg.setAttribute("height", "16");
                logoSvg.setAttribute("viewBox", "0 0 24 16");
                logoSvg.innerHTML = `<path d="M0 15.6363L0 12.8594L9.47552 8.293L0 3.14038L0 0.363525L12.8575 7.4908V9.21862L0 15.6363Z" fill="white"/><path d="M11.1425 15.6363V12.8594L20.6181 8.293L11.1425 3.14038V0.363525L24 7.4908V9.21862L11.1425 15.6363Z" fill="white"/>`;
                logoContainer.appendChild(logoSvg);

                const titleContainer = document.createElement("div");
                const titleLink = document.createElement("a");
                titleLink.href = "https://greasyfork.org/en/users/1382928";
                titleLink.target = "_blank";
                titleLink.className = "title-link";
                titleLink.innerHTML = `<div class="title">cobalt.tools</div>`;
                titleContainer.appendChild(titleLink);
                titleContainer.innerHTML += `<div class="subtitle">youtube direct downloader</div>`;
                logoContainer.appendChild(titleContainer);
                dialogContent.appendChild(logoContainer);

                const switchContainer = document.createElement("div");
                switchContainer.className = "switch-container";
                const switchButton = document.createElement("button");
                switchButton.className = "switch-button";
                switchButton.id = "mode-switch";
                switchContainer.appendChild(switchButton);
                dialogContent.appendChild(switchContainer);

                const videoOptions = document.createElement("div");
                videoOptions.id = "video-options";
                const videoCodecSelector = document.createElement("div");
                videoCodecSelector.className = "codec-selector";
                ["h264", "vp9", "av1", "dub"].forEach((codec) => {
                    const button = document.createElement("button");
                    button.className = `codec-button ${codec === "dub" ? "dub-button" : ""} ${codec === config.videoCodec ? "selected" : ""}`;
                    button.dataset.codec = codec;
                    button.textContent = codec.toUpperCase();
                    videoCodecSelector.appendChild(button);
                });
                videoOptions.appendChild(videoCodecSelector);

                const qualityOptions = document.createElement("div");
                qualityOptions.id = "quality-options";
                qualityOptions.className = "quality-grid";
                videoOptions.appendChild(qualityOptions);

                const dubSelector = document.createElement("div");
                dubSelector.className = "dub-selector";
                const dubSelect = document.createElement("select");
                dubSelect.className = "dub-select";
                dubSelect.innerHTML = `<option value="">Original Audio</option>${Object.entries(LANGUAGE_MAP)
                    .map(([code, name]) => `<option value="${code}" ${code === config.dub ? "selected" : ""}>${name} (${code})</option>`)
                    .join("")}`;
                dubSelector.appendChild(dubSelect);
                videoOptions.appendChild(dubSelector);
                dialogContent.appendChild(videoOptions);

                const audioOptions = document.createElement("div");
                audioOptions.id = "audio-options";
                audioOptions.className = "audio-options";
                const audioCodecSelector = document.createElement("div");
                audioCodecSelector.className = "codec-selector";
                ["mp3", "ogg", "opus", "wav"].forEach((codec) => {
                    const button = document.createElement("button");
                    button.className = `codec-button ${codec === config.audioCodec ? "selected" : ""}`;
                    button.dataset.codec = codec;
                    button.textContent = codec.toUpperCase();
                    audioCodecSelector.appendChild(button);
                });
                audioOptions.appendChild(audioCodecSelector);

                const bitrateOptions = document.createElement("div");
                bitrateOptions.id = "bitrate-options";
                bitrateOptions.className = "quality-grid";
                audioOptions.appendChild(bitrateOptions);
                dialogContent.appendChild(audioOptions);

                const downloadStatus = document.createElement("div");
                downloadStatus.className = "download-status";
                downloadStatus.id = "download-status";
                dialogContent.appendChild(downloadStatus);

                const buttonContainer = document.createElement("div");
                buttonContainer.className = "button-container";
                const cancelButton = document.createElement("button");
                cancelButton.id = "cancel-button";
                cancelButton.textContent = "Cancel";
                cancelButton.style.cssText = `background: transparent; border: 1px solid #e1e1e1; color: #e1e1e1; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 18px; cursor: pointer; font-family: inherit;`;
                const downloadButton = document.createElement("button");
                downloadButton.id = "download-button";
                downloadButton.textContent = "Download";
                downloadButton.style.cssText = `background: transparent; border: 1px solid #e1e1e1; color: #e1e1e1; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 18px; cursor: pointer; font-family: inherit;`;
                buttonContainer.appendChild(cancelButton);
                buttonContainer.appendChild(downloadButton);
                dialogContent.appendChild(buttonContainer);

                const backdrop = document.createElement("div");
                backdrop.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 9998;`;
                document.body.appendChild(backdrop);

                return { dialog, backdrop, switchButton, videoOptions, audioOptions, qualityOptions, bitrateOptions, downloadStatus, cancelButton, downloadButton, dubSelector, dubSelect };
            };

            const updateQualityOptions = (dialog, codec, savedQuality) => {
                const qualityOptions = dialog.querySelector("#quality-options");
                qualityOptions.innerHTML = "";
                const qualities = codec === "h264" ? ["144p", "240p", "360p", "480p", "720p", "1080p"] : codec === "vp9" ? ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "4k"] : ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "4k", "8k+"];
                qualities.forEach((quality, index) => {
                    const option = document.createElement("div");
                    option.className = "quality-option";
                    option.innerHTML = `<input type="radio" id="quality-${index}" name="quality" value="${quality}" style="margin-right: 8px;" ${quality === savedQuality ? "checked" : ""}><label for="quality-${index}" style="font-size: 14px; cursor: pointer;">${quality}</label>`;
                    option.addEventListener("click", () => {
                        qualityOptions.querySelectorAll("input[name='quality']").forEach((rb) => (rb.checked = false));
                        option.querySelector("input").checked = true;
                        config.quality = quality;
                        this.core.updateConfig(this.id, config);
                    });
                    qualityOptions.appendChild(option);
                });
            };

            const updateAudioOptions = (dialog, codec, savedBitrate) => {
                const bitrateOptions = dialog.querySelector("#bitrate-options");
                bitrateOptions.innerHTML = "";
                if (codec === "wav") return;
                const bitrates = ["8", "64", "96", "128", "256", "320"];
                bitrates.forEach((bitrate, index) => {
                    const option = document.createElement("div");
                    option.className = "quality-option";
                    option.innerHTML = `<input type="radio" id="bitrate-${index}" name="bitrate" value="${bitrate}" style="margin-right: 8px;" ${bitrate === savedBitrate ? "checked" : ""}><label for="bitrate-${index}" style="font-size: 14px; cursor: pointer;">${bitrate} kb/s</label>`;
                    option.addEventListener("click", () => {
                        bitrateOptions.querySelectorAll("input[name='bitrate']").forEach((rb) => (rb.checked = false));
                        option.querySelector("input").checked = true;
                        config.bitrate = bitrate;
                        this.core.updateConfig(this.id, config);
                    });
                    bitrateOptions.appendChild(option);
                });
            };

            const triggerDownload = (url) => {
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            };

            const downloadContent = (payload, dialog, backdrop) => {
                const status = dialog.querySelector("#download-status");
                status.style.display = "block";
                status.textContent = "Preparing download...";
                GM.xmlHttpRequest({
                    method: "POST",
                    url: "https://c.blahaj.ca/",
                    headers: { accept: "application/json", "content-type": "application/json" },
                    data: JSON.stringify(payload),
                    responseType: "json",
                    onload: (response) => {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (data.url) {
                                status.textContent = "Starting download...";
                                triggerDownload(data.url);
                                setTimeout(() => dialog.parentNode.removeChild(dialog) && backdrop.parentNode.removeChild(backdrop), 1000);
                            } else {
                                status.textContent = "Error: No download URL found";
                            }
                        } catch (e) {
                            status.textContent = "Error: API service might be temporarily unavailable";
                        }
                    },
                    onerror: () => (status.textContent = "Network error. Please check your connection.")
                });
            };

            const interceptDownload = () => {
                const { dialog, backdrop, switchButton, videoOptions, audioOptions, qualityOptions, bitrateOptions, downloadStatus, cancelButton, downloadButton, dubSelector, dubSelect } = createDialog();
                let isAudioMode = config.mode === "audio";
                updateQualityOptions(dialog, config.videoCodec, config.quality);
                updateAudioOptions(dialog, config.audioCodec, config.bitrate || "320");
                videoOptions.style.display = isAudioMode ? "none" : "block";
                audioOptions.style.display = isAudioMode ? "block" : "none";
                dubSelector.style.display = config.videoCodec === "dub" ? "block" : "none";
                qualityOptions.style.display = config.videoCodec === "dub" ? "none" : "grid";

                switchButton.addEventListener("click", () => {
                    isAudioMode = !isAudioMode;
                    config.mode = isAudioMode ? "audio" : "video";
                    this.core.updateConfig(this.id, config);
                    videoOptions.style.display = isAudioMode ? "none" : "block";
                    audioOptions.style.display = isAudioMode ? "block" : "none";
                });

                dialog.querySelectorAll(".codec-button").forEach((button) => {
                    button.addEventListener("click", () => {
                        if (isAudioMode) {
                            config.audioCodec = button.dataset.codec;
                        } else {
                            config.videoCodec = button.dataset.codec;
                            dubSelector.style.display = config.videoCodec === "dub" ? "block" : "none";
                            qualityOptions.style.display = config.videoCodec === "dub" ? "none" : "grid";
                            updateQualityOptions(dialog, config.videoCodec, config.quality);
                        }
                        this.core.updateConfig(this.id, config);
                        dialog.querySelectorAll(".codec-button").forEach((b) => b.classList.remove("selected"));
                        button.classList.add("selected");
                    });
                });

                dubSelect.addEventListener("change", () => {
                    config.dub = dubSelect.value;
                    this.core.updateConfig(this.id, config);
                });

                cancelButton.addEventListener("click", () => dialog.parentNode.removeChild(dialog) && backdrop.parentNode.removeChild(backdrop));
                downloadButton.addEventListener("click", () => {
                    const videoId = new URL(window.location.href).searchParams.get("v");
                    if (isAudioMode) {
                        const payload = {
                            url: `https://www.youtube.com/watch?v=${videoId}`,
                            downloadMode: "audio",
                            filenameStyle: "basic",
                            audioFormat: config.audioCodec,
                            ...(config.audioCodec !== "wav" && { audioBitrate: dialog.querySelector("input[name='bitrate']:checked")?.value || "320" })
                        };
                        downloadContent(payload, dialog, backdrop);
                    } else {
                        const quality = config.videoCodec === "dub" ? "dub" : dialog.querySelector("input[name='quality']:checked")?.value;
                        const payload = {
                            url: `https://www.youtube.com/watch?v=${videoId}`,
                            downloadMode: "auto",
                            filenameStyle: "basic",
                            videoQuality: quality?.replace("p", ""),
                            youtubeVideoCodec: config.videoCodec,
                            youtubeDubLang: config.videoCodec === "dub" ? (config.dub || "original") : "original"
                        };
                        downloadContent(payload, dialog, backdrop);
                    }
                });

                document.body.appendChild(dialog);
            };

            this.core.setupObserver(document.body, { childList: true, subtree: true }, (mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === "childList") {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.querySelector("ytd-download-quality-selector-renderer")) {
                                    node.remove();
                                    interceptDownload();
                                }
                                node.querySelectorAll("button[aria-label='Download']").forEach((button) => {
                                    button.classList.remove("yt-spec-button-shape-next--disabled");
                                    button.classList.add("yt-spec-button-shape-next--mono");
                                    button.removeAttribute("disabled");
                                    button.setAttribute("aria-disabled", "false");
                                });
                            }
                        });
                    }
                });
            });

            document.addEventListener("click", (e) => {
                if (e.target.closest("button[aria-label='Download']")) {
                    e.stopPropagation();
                    e.preventDefault();
                    interceptDownload();
                }
            }, true);
        }

        renderConfig(config) {
            return `
                <div class="module-config">
                    <label>Video Codec: 
                        <select class="config-videoCodec">
                            <option value="h264" ${config.videoCodec === "h264" ? "selected" : ""}>H264</option>
                            <option value="vp9" ${config.videoCodec === "vp9" ? "selected" : ""}>VP9</option>
                            <option value="av1" ${config.videoCodec === "av1" ? "selected" : ""}>AV1</option>
                            <option value="dub" ${config.videoCodec === "dub" ? "selected" : ""}>DUB</option>
                        </select>
                    </label><br>
                    <label>Quality: 
                        <select class="config-quality">
                            ${["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "4k", "8k+"]
                                .map((q) => `<option value="${q}" ${config.quality === q ? "selected" : ""}>${q}</option>`)
                                .join("")}
                        </select>
                    </label><br>
                    <label>Mode: 
                        <select class="config-mode">
                            <option value="video" ${config.mode === "video" ? "selected" : ""}>Video</option>
                            <option value="audio" ${config.mode === "audio" ? "selected" : ""}>Audio</option>
                        </select>
                    </label><br>
                    <label>Audio Codec: 
                        <select class="config-audioCodec">
                            <option value="mp3" ${config.audioCodec === "mp3" ? "selected" : ""}>MP3</option>
                            <option value="ogg" ${config.audioCodec === "ogg" ? "selected" : ""}>OGG</option>
                            <option value="opus" ${config.audioCodec === "opus" ? "selected" : ""}>OPUS</option>
                            <option value="wav" ${config.audioCodec === "wav" ? "selected" : ""}>WAV</option>
                        </select>
                    </label><br>
                    <label>Dub Language: 
                        <select class="config-dub">
                            <option value="">Original</option>
                            ${Object.entries(LANGUAGE_MAP)
                                .map(([code, name]) => `<option value="${code}" ${config.dub === code ? "selected" : ""}>${name} (${code})</option>`)
                                .join("")}
                        </select>
                    </label>
                </div>
            `;
        }

        bindConfigEvents(container, config, updateCallback) {
            const update = () => {
                const newConfig = {
                    videoCodec: container.querySelector(".config-videoCodec").value,
                    quality: container.querySelector(".config-quality").value,
                    mode: container.querySelector(".config-mode").value,
                    audioCodec: container.querySelector(".config-audioCodec").value,
                    dub: container.querySelector(".config-dub").value
                };
                updateCallback(newConfig);
            };
            container.querySelectorAll(".module-config select").forEach((select) => {
                select.addEventListener("change", update);
            });
        }
    }

    // Module: AdBlock
    class AdBlockModule extends Module {
        constructor() {
            super("adblock", "AdBlock", true);
        }

        run() {
            const cssSelectorArr = [
                "#masthead-ad",
                "ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(.ytd-display-ad-renderer)",
                ".video-ads.ytp-ad-module",
                "tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)",
                "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
                "#related #player-ads",
                "#related ytd-ad-slot-renderer",
                "ytd-ad-slot-renderer",
                "yt-mealbar-promo-renderer",
                "ytd-popup-container:has(a[href='/premium'])",
                "ad-slot-renderer",
                "ytm-companion-ad-renderer"
            ];

            const style = document.createElement("style");
            style.textContent = cssSelectorArr.map((s) => `${s}{display:none!important}`).join(" ");
            document.head.appendChild(style);

            const nativeTouch = (element) => {
                const touch = new Touch({
                    identifier: Date.now(),
                    target: element,
                    clientX: 12,
                    clientY: 34,
                    radiusX: 56,
                    radiusY: 78,
                    rotationAngle: 0,
                    force: 1
                });
                element.dispatchEvent(
                    new TouchEvent("touchstart", { bubbles: true, cancelable: true, view: window, touches: [touch], targetTouches: [touch], changedTouches: [touch] })
                );
                element.dispatchEvent(
                    new TouchEvent("touchend", { bubbles: true, cancelable: true, view: window, touches: [], targetTouches: [], changedTouches: [touch] })
                );
            };

            this.core.setupObserver(document.body, { childList: true, subtree: true }, (mutations) => {
                const video = document.querySelector(".ad-showing video") || document.querySelector("video");
                if (video && video.paused && video.currentTime < 1) {
                    video.play();
                }

                const skipButton = document.querySelector(".ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern");
                const shortAdMsg = document.querySelector(".video-ads.ytp-ad-module .ytp-ad-player-overlay, .ytp-ad-button-icon");
                if ((skipButton || shortAdMsg) && !window.location.href.includes("https://m.youtube.com/")) {
                    video.muted = true;
                }
                if (skipButton) {
                    if (video.currentTime > 0.5) {
                        video.currentTime = video.duration;
                    } else {
                        skipButton.click();
                        nativeTouch(skipButton);
                    }
                } else if (shortAdMsg) {
                    video.currentTime = video.duration;
                }

                document.querySelectorAll("ytd-popup-container a[href='/premium']").forEach((el) => el.closest("ytd-popup-container")?.remove());
                const backdrop = Array.from(document.querySelectorAll("tp-yt-iron-overlay-backdrop")).find((b) => b.style.zIndex === "2201");
                if (backdrop) {
                    backdrop.className = "";
                    backdrop.removeAttribute("opened");
                }

                mutations.forEach((mutation) => {
                    if (mutation.type === "childList") {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const popup = node.querySelector(".ytd-popup-container > .ytd-popup-container > .ytd-enforcement-message-view-model");
                                if (popup) {
                                    popup.parentNode.remove();
                                    document.querySelectorAll("tp-yt-iron-overlay-backdrop").forEach((b) => b.remove());
                                    if (video && video.paused) {
                                        video.play();
                                    }
                                }
                                if (node.tagName.toLowerCase() === "tp-yt-iron-overlay-backdrop") {
                                    node.remove();
                                    if (video && video.paused) {
                                        video.play();
                                    }
                                }
                            }
                        });
                    }
                });
            });
        }
    }

    // Initialize Framework and Register Modules
    const core = new YouTubeEnhancerCore();
    core.registerModule(new RemoveShareIdentifierModule());
    core.registerModule(new YouTubePlusModule());
    core.registerModule(new PremiumLogoModule());
    core.registerModule(new AutoExpandCommentsModule());
    core.registerModule(new DirectDownloaderModule());
    core.init();
})();