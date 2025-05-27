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
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/YouTubeEnhancerCore.js
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/YouTubePlus.js
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/RemoveShareIdentifier.js
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/PremiumLogo.js
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/AutoExpandComments.js
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/DirectDownloader.js
// @require      https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/AdBlock.js
// @updateURL    https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/youtube-enhancer.user.js
// @downloadURL  https://raw.githubusercontent.com/willbelove1/youtube-enhancer/refs/heads/main/youtube-enhancer.user.js
// ==/UserScript==

(function () {
    "use strict";

    // Ngăn khởi tạo nhiều lần
    if (!window.__YT_ENHANCER_SKIP_INIT__) {
        window.__YT_ENHANCER_SKIP_INIT__ = true;

        // Đợi DOM tải xong để khởi tạo core
        window.addEventListener("load", () => {
            if (window.YouTubeEnhancerCoreInstance) {
                window.YouTubeEnhancerCoreInstance.init();
                console.log("[YouTubeEnhancer] Framework khởi tạo thành công");
            } else {
                console.error("[YouTubeEnhancer] Core không được tải. Kiểm tra @require.");
            }
        });
    }
})();