(function () {
    "use strict";

    // Kiểm tra sự hiện diện của core
    if (!window.YouTubeEnhancerModule || !window.YouTubeEnhancerCoreInstance) {
        console.error("[AdBlock] Core không tìm thấy. Vui lòng đảm bảo YouTubeEnhancerCore.js được tải trước.");
        return;
    }

    const Module = window.YouTubeEnhancerModule;
    const core = window.YouTubeEnhancerCoreInstance;

    class AdBlockModule extends Module {
        constructor() {
            super("adblock", "Chặn Quảng Cáo", true, {
                skipAds: true,
                hideBanners: true,
                blockPremiumPopups: true
            });
        }

        run() {
            const config = this.core.settings[this.id].config;

            // Danh sách các selector CSS để ẩn quảng cáo
            const cssSelectorArr = [
                "#masthead-ad", // Quảng cáo đầu trang
                "ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(.ytd-display-ad-renderer)", // Quảng cáo trong lưới video
                ".video-ads.ytp-ad-module", // Quảng cáo trong video player
                "tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)", // Mealbar promo
                "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']", // Panel quảng cáo
                "#related #player-ads", // Quảng cáo bên cạnh video
                "#related ytd-ad-slot-renderer", // Quảng cáo trong phần liên quan
                "ytd-ad-slot-renderer", // Slot quảng cáo chung
                "yt-mealbar-promo-renderer", // Mealbar khuyến mãi
                "ytd-popup-container:has(a[href*='/premium'])", // Popup Premium
                "ad-slot-renderer", // Slot quảng cáo khác
                "ytm-companion-ad-renderer", // Quảng cáo trên mobile
                ".ytp-ad-overlay-container", // Quảng cáo overlay
                ".ytp-ad-text-overlay" // Văn bản quảng cáo
            ];

            // Thêm CSS để ẩn các phần tử quảng cáo
            if (config.hideBanners) {
                const style = document.createElement("style");
                style.id = "adblock-styles";
                style.textContent = cssSelectorArr.map((s) => `${s} { display: none !important; }`).join(" ");
                document.head.appendChild(style);
            }

            // Hàm mô phỏng sự kiện touch
            const nativeTouch = (element) => {
                try {
                    const touch = new Touch({
                        identifier: Date.now(),
                        target: element,
                        clientX: element.getBoundingClientRect().left + 10,
                        clientY: element.getBoundingClientRect().top + 10,
                        radiusX: 2.5,
                        radiusY: 2.5,
                        rotationAngle: 0,
                        force: 0.5
                    });

                    element.dispatchEvent(
                        new TouchEvent("touchstart", {
                            bubbles: true,
                            cancelable: true,
                            touches: [touch],
                            targetTouches: [touch],
                            changedTouches: [touch]
                        })
                    );
                    element.dispatchEvent(
                        new TouchEvent("touchend", {
                            bubbles: true,
                            cancelable: true,
                            touches: [],
                            targetTouches: [],
                            changedTouches: [touch]
                        })
                    );
                } catch (e) {
                    console.warn("[AdBlock] Không thể mô phỏng touch:", e);
                }
            };

            // Hàm xử lý quảng cáo video
            const handleVideoAds = () => {
                const video = document.querySelector(".ad-showing video") || document.querySelector("video");
                if (!video) return;

                // Bỏ qua quảng cáo nếu có nút skip
                const skipButton = document.querySelector(".ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern");
                if (skipButton && config.skipAds) {
                    try {
                        skipButton.click();
                        nativeTouch(skipButton);
                        console.log("[AdBlock] Đã bấm nút bỏ qua quảng cáo");
                    } catch (e) {
                        console.warn("[AdBlock] Lỗi khi bấm nút skip:", e);
                    }
                }

                // Tua nhanh quảng cáo không thể skip
                const adOverlay = document.querySelector(".ytp-ad-player-overlay, .ytp-ad-text-overlay");
                if (adOverlay && config.skipAds) {
                    try {
                        video.muted = true;
                        video.playbackRate = 16; // Tăng tốc độ tối đa
                        video.currentTime = video.duration || 9999; // Tua đến cuối
                        console.log("[AdBlock] Đã tua nhanh quảng cáo");
                    } catch (e) {
                        console.warn("[AdBlock] Lỗi khi tua quảng cáo:", e);
                    }
                }

                // Đảm bảo video chính không bị pause
                if (video.paused && !document.querySelector(".ytp-ad-module")) {
                    try {
                        video.play();
                        video.muted = false;
                        video.playbackRate = 1;
                    } catch (e) {
                        console.warn("[AdBlock] Lỗi khi phát video:", e);
                    }
                }
            };

            // Hàm xử lý popup Premium
            const handlePremiumPopups = () => {
                if (!config.blockPremiumPopups) return;
                document.querySelectorAll("ytd-popup-container a[href*='/premium']").forEach((el) => {
                    const popup = el.closest("ytd-popup-container");
                    if (popup) popup.remove();
                });
                const backdrop = document.querySelector("tp-yt-iron-overlay-backdrop[style*='z-index: 2201']");
                if (backdrop) {
                    backdrop.remove();
                }
                const enforcementPopup = document.querySelector(".ytd-enforcement-message-view-model");
                if (enforcementPopup) {
                    enforcementPopup.closest("ytd-popup-container")?.remove();
                }
            };

            // Thiết lập MutationObserver
            this.core.setupObserver(
                document.body,
                { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] },
                this.core.throttle(() => {
                    if (config.skipAds) handleVideoAds();
                    if (config.blockPremiumPopups) handlePremiumPopups();
                }, 150)
            );

            // Xử lý ngay khi khởi động
            handleVideoAds();
            handlePremiumPopups();

            // Thêm interval để kiểm tra liên tục
            this.interval = setInterval(() => {
                if (config.skipAds) handleVideoAds();
                if (config.blockPremiumPopups) handlePremiumPopups();
            }, 500);
        }

        stop() {
            // Xóa CSS
            const style = document.querySelector("#adblock-styles");
            if (style) style.remove();

            // Xóa interval
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }

            // Ngắt các observer
            this.core.observers.forEach((observer) => observer.disconnect());
            this.core.observers = [];

            console.log("[AdBlock] Đã dừng module");
        }

        renderConfig(config) {
            return `
                <div class="module-config">
                    <label><input type="checkbox" class="config-skipAds" ${config.skipAds ? "checked" : ""}> Tự động bỏ qua quảng cáo video</label><br>
                    <label><input type="checkbox" class="config-hideBanners" ${config.hideBanners ? "checked" : ""}> Ẩn quảng cáo banner</label><br>
                    <label><input type="checkbox" class="config-blockPremiumPopups" ${config.blockPremiumPopups ? "checked" : ""}> Chặn popup YouTube Premium</label>
                </div>
            `;
        }

        bindConfigEvents(container, config, updateCallback) {
            const update = () => {
                const newConfig = {
                    skipAds: container.querySelector(".config-skipAds").checked,
                    hideBanners: container.querySelector(".config-hideBanners").checked,
                    blockPremiumPopups: container.querySelector(".config-blockPremiumPopups").checked
                };
                updateCallback(newConfig);
            };
            container.querySelectorAll(".module-config input").forEach((input) => {
                input.addEventListener("change", update);
            });
        }
    }

    core.registerModule(AdBlockModule);
})();