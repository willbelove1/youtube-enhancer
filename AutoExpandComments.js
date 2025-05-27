(function () {
    "use strict";

    if (!window.YouTubeEnhancerModule || !window.YouTubeEnhancerCoreInstance) {
        console.error("[AutoExpandComments] Core không tìm thấy. Vui lòng đảm bảo YouTubeEnhancerCore.js được tải trước.");
        return;
    }

    const Module = window.YouTubeEnhancerModule;
    const core = window.YouTubeEnhancerCoreInstance;

    class AutoExpandCommentsModule extends Module {
        constructor() {
            super("auto-expand-comments", "Tự động mở rộng bình luận", true, {
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

        stop() {
            window.removeEventListener("scroll", this.scrollHandler);
            if (this.observer) {
                this.observer.disconnect();
            }
        }
    }

    core.registerModule(AutoExpandCommentsModule);
})();