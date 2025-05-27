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
    'use strict';
    const core = new YouTubeEnhancerCore();
    //core.registerModule(new YouTubeEnhancerCore());
    core.registerModule(new RemoveShareIdentifierModule());
    core.registerModule(new YouTubePlusModule());
    core.registerModule(new PremiumLogoModule());
    core.registerModule(new AutoExpandCommentsModule());
    core.registerModule(new DirectDownloaderModule());
    core.registerModule(new AdBlockModule());
})();
