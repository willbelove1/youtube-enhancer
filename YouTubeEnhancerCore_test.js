(function () {
         "use strict";
         class Module {
             constructor(id, name, enabled = false, config = {}) {
                 this.id = id;
                 this.name = name;
                 this.enabled = enabled;
                 this.config = config;
             }
             run() {}
             stop() {}
             renderConfig() { return ""; }
             bindConfigEvents() {}
         }
         class YouTubeEnhancerCore {
             constructor() {
                 this.modules = new Map();
                 this.settings = {};
                 this.observers = [];
             }
             init() {
                 this.loadSettings();
                 this.setupUI();
                 this.runModules();
             }
             registerModule(moduleClass) {
                 const module = new moduleClass();
                 this.modules.set(module.id, module);
                 this.saveSettings();
             }
             // ... (các hàm loadSettings, setupUI, runModules, v.v.)
         }
         window.YouTubeEnhancerModule = Module;
         window.YouTubeEnhancerCoreInstance = new YouTubeEnhancerCore();
     })();