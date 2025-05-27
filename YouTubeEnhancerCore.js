(function () {
    "use strict";

    // Core Framework Class
    class YouTubeEnhancerCore {
        constructor() {
            this.modules = new Map();
            this.observers = [];
            this.settings = {};
            this.uiContainer = null;
            this.moduleRegistry = GM_getValue("moduleRegistry", {});
        }

        // Custom require function
        require(moduleId) {
            const moduleClass = this.moduleRegistry[moduleId];
            if (!moduleClass) {
                console.error(`[YouTubeEnhancer] Module ${moduleId} not found`);
                return null;
            }
            return moduleClass;
        }

        // Register a module
        registerModule(moduleClass) {
            const module = new moduleClass();
            this.modules.set(module.id, module);
            this.settings[module.id] = {
                enabled: GM_getValue(`module_${module.id}_enabled`, module.defaultEnabled),
                config: GM_getValue(`module_${module.id}_config`, module.defaultConfig || {})
            };
            module.core = this;
            if (this.settings[module.id].enabled) {
                this.runModule(module.id);
            }
            this.moduleRegistry[module.id] = moduleClass;
            GM_setValue("moduleRegistry", this.moduleRegistry);
            this.renderSettingsUI();
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

                // Add toggle button
                const toggleButton = document.createElement("button");
                toggleButton.id = "youtube-enhancer-toggle";
                toggleButton.textContent = "⚙️";
                toggleButton.style.cssText = `
                    position: fixed; top: 10px; right: 10px; z-index: 10001;
                    background: #ff0000; color: white; border: none; border-radius: 50%;
                    width: 40px; height: 40px; cursor: pointer; font-size: 20px;
                `;
                document.body.appendChild(toggleButton);
                toggleButton.addEventListener("click", () => {
                    this.uiContainer.classList.toggle("hidden");
                    GM_setValue("ui_visible", !this.uiContainer.classList.contains("hidden"));
                });

                // Hotkey for settings (Ctrl+Shift+S)
                document.addEventListener("keydown", (e) => {
                    if (e.ctrlKey && e.shiftKey && e.key === "S") {
                        this.uiContainer.classList.toggle("hidden");
                        GM_setValue("ui_visible", !this.uiContainer.classList.contains("hidden"));
                    }
                });
            }

            this.uiContainer.innerHTML = `
                <style>
                    @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
                    #youtube-enhancer-settings {
                        position: fixed;
                        top: 60px;
                        right: 10px;
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

            // Restore UI visibility state
            if (GM_getValue("ui_visible", true)) {
                this.uiContainer.classList.remove("hidden");
            } else {
                this.uiContainer.classList.add("hidden");
            }
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
            // Load registered modules
            Object.keys(this.moduleRegistry).forEach((moduleId) => {
                if (!this.modules.has(moduleId)) {
                    this.registerModule(this.moduleRegistry[moduleId]);
                }
            });
            this.renderSettingsUI();
            console.log("[YouTubeEnhancer] Core initialized");
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

    // Expose Module class for other scripts
    window.YouTubeEnhancerModule = Module;

    // Initialize core
    const core = new YouTubeEnhancerCore();
    window.YouTubeEnhancerCoreInstance = core;
    core.init();
})();