// ==UserScript==
// @name         YouTube Enhancer Framework
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Tăng cường trải nghiệm YouTube với các tính năng tùy chỉnh
// @author       Johnny Inc.
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      c.blahaj.ca
// @require      file:///C:/youtube-enhancer/YouTubeEnhancerCore.js
// @require      file:///C:/youtube-enhancer/YouTubePlus.js
// @require      file:///C:/youtube-enhancer/RemoveShareIdentifier.js
// @require      file:///C:/youtube-enhancer/PremiumLogo.js
// @require      file:///C:/youtube-enhancer/AutoExpandComments.js
// @require      file:///C:/youtube-enhancer/DirectDownloader.js
// @require      file:///C:/youtube-enhancer/AdBlock.js
// @updateURL    file:///C:/youtube-enhancer/youtube-enhancer.user.js
// @downloadURL  file:///C:/youtube-enhancer/youtube-enhancer.user.js
// ==/UserScript==

(function () {
    "use strict";

    // Ngăn khởi tạo nhiều lần
    if (window.__YT_ENHANCER_SKIP_INIT__) {
        console.log("[YouTubeEnhancer] Framework đã được khởi tạo, bỏ qua.");
        return;
    }
    window.__YT_ENHANCER_SKIP_INIT__ = true;

    // Kiểm tra module đã tải
    function checkModules() {
        const requiredModules = [
            "YouTubeEnhancerCore",
            "YouTubePlus",
            "RemoveShareIdentifier",
            "PremiumLogo",
            "AutoExpandComments",
            "DirectDownloader",
            "AdBlock"
        ];
        requiredModules.forEach((mod) => {
            if (!window[`${mod}Module`]) {
                console.warn(`[YouTubeEnhancer] Module ${mod} không được tải.`);
            } else {
                console.log(`[YouTubeEnhancer] Module ${mod} đã tải.`);
            }
        });
    }

    // Khởi tạo framework
    function initializeFramework() {
        console.log("[YouTubeEnhancer] Bắt đầu khởi tạo framework...");
        checkModules();
        if (window.YouTubeEnhancerCoreInstance) {
            try {
                window.YouTubeEnhancerCoreInstance.init();
                console.log("[YouTubeEnhancer] Framework khởi tạo thành công");
            } catch (e) {
                console.error("[YouTubeEnhancer] Lỗi khi khởi tạo core:", e);
            }
        } else {
            console.error("[YouTubeEnhancer] Core không được tải. Kiểm tra file module hoặc đường dẫn @require.");
        }
    }

    // Kiểm tra trạng thái DOM
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeFramework, 0);
    } else {
        window.addEventListener("load", initializeFramework);
    }
})();