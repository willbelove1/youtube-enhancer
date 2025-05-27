(function () {
    "use strict";

    if (!window.YouTubeEnhancerModule || !window.YouTubeEnhancerCoreInstance) {
        console.error("[RemoveShareIdentifier] Core không tìm thấy. Vui lòng đảm bảo YouTubeEnhancerCore.js được tải trước.");
        return;
    }

    const Module = window.YouTubeEnhancerModule;
    const core = window.YouTubeEnhancerCoreInstance;

    class RemoveShareIdentifierModule extends Module {
        constructor() {
            super("remove-share-identifier", "Loại bỏ mã định danh chia sẻ", true);
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

        stop() {
            this.core.observers.forEach((observer) => observer.disconnect());
            this.core.observers = [];
        }
    }

    core.registerModule(RemoveShareIdentifierModule);
})();