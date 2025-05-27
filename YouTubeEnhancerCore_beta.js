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
             loadSettings() {
                 // ... (lưu trữ settings bằng GM_getValue/GM_setValue)
             }
             setupUI() {
                 // ... (tạo giao diện cài đặt)
             }
             runModules() {
                 // ... (chạy các module đã bật)
             }
             // ... (các hàm khác như setupObserver, throttle, v.v.)
         }

         window.YouTubeEnhancerModule = Module;
         window.YouTubeEnhancerCoreInstance = new YouTubeEnhancerCore();
     }
)();