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
                    .subtitle { color: #e1e1e1; opacity: 0.0; font-size: 12px; margin-top: 4px; }
                    .title { font-size: 18px; font-weight: 700; }
                    .title-link { text-decoration: none; color: inherit; cursor: pointer; transition: opacity 0.2s ease; }
                    .codec-selector { margin-bottom: 16px; display: flex; justify-content: center; gap: 8px; }
                    .codec-button { background: transparent; border: 1px solid #e1e1e1; color: #e1e1e1; padding: 6px 12px; border-radius: 14px; cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s ease; }
                    .codec-button:hover { background: #808080; color: #000000; }
                    .codec-button-selected { background: #1ed760; border-color: #1ed760; color: #000000; }
                    .download-status { text-align: center; margin: 16px 0; font-size: 12px; display: none; }
                    .button-container { display: flex; justify-content: center; gap: 8px; }
                    .switch-container { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; }
                    .switch-button { background: transparent; border: none; cursor: pointer; padding: 4px; }
                    .switch-button svg { width: 20px; height: 20px; fill: #e1e1e1; }
                    .audio-options { display: none; }
                    .audio-options.active { display: block; }
                    .dub-selector { margin-top: 16px; margin-bottom: 16px; display: none; }
                    .dub-select { width: 80%; margin: auto 0; display: block; padding: 8px; background: #191919; color: #e1e1e1; border: 6px solid #1e1e1e1; border-radius: 4px; font-family: inherit; cursor: pointer; }
                    .dub-button { border: 1px; solid #39a9db; color: #39a9db; }
                    .dub-button:hover { background: #39a9db; color: #000000; }
                    .dub-button.selected { background: #39a9db; border-color:  #39a9db; color: #000000; }
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
                ["mp3", "aac", "ogg", "wav"].forEach((codec) => {
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
                downloadStatus.style.display = "none";
                dialogContent.appendChild(downloadStatus);

                const buttonContainer = document.createElement("div");
                buttonContainer.className = "button-container";
                const cancelButton = document.createElement("button");
                cancelButton.id = "cancel-button";
                cancelButton.textContent = "Cancel";
                cancelButton.style.cssText = `background: transparent; border: 1px solid #e1e1e1; color: white; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: monospace;`;
                const downloadButton = document.createElement("button");
                downloadButton.id = "download-button";
                downloadButton.textContent = "Download";
                downloadButton.style.cssText = `background: transparent; border: 1px solid #e1e1e1; color: white; font-size: 14px; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: monospace;`;
                buttonContainer.appendChild(cancelButton);
                buttonContainer.appendChild(downloadButton);
                dialogContent.appendChild(buttonContainer);

                const backdrop = document.createElement("div");
                backdrop.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 9998;`;
                backdrop.onclick = () => dialog.parentNode.removeChild(dialog) && backdrop.parentNode.removeChild(backdrop);

                document.body.appendChild(backdrop);

                return { dialog, backdrop, switchButton, videoOptions, buttonContainer, qualityOptions, downloadButton, bitrateOptions, downloadStatus, cancelButton, dubSelector, dubSelect };
            }

            const updateQualityOptions = (dialog, codec, savedQuality) => {
                const qualityOptions = dialog.querySelector("#quality-options");
                qualityOptions.innerHTML = '';
                const qualities = codec === "h264" ? ["144p", "240p", "360p", "480p", "720p", "1080p"] : codec === "vp9" ? ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "4k"] : ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "4k", "8k+"];;
                qualities.forEach((quality, index) => {
                    const option = document.createElement("div");
                    option.className = "quality-option";
                    option.innerHTML = `<input type="radio" id="radio" id="quality-${index}" name="quality" value="${value}" style="margin-right: 8px;" ${quality === savedQuality ? "checked" : ""}><label for="quality-${index}" style="font-size: 14px; cursor: pointer;">${quality}</label>`;
                    option.addEventListener("click", () => {
                        qualityOptions.querySelectorAll("input[name='quality']").forEach((radio) => (radio.checked = false));
                        option.querySelector("input").checked = true;
                        config.quality = quality;
                        this.core.updateConfig(this.id, config);
                    });
                    qualityOptions.appendChild(option);
                });
            }

            const updateAudioOptions = (dialog, codec, savedBitrate) => {
                const bitrateOptions = dialog.querySelector("#bitrate-options");
                if (codec === "wav") return;

                const bitrates = ["8kbps", "64kbps", "96kbps", "128kbps", "256kbps", "320kbps"];
                bitrates.forEach((bitrate, index) => {
                    const bitrateOption = document.createElement("div");
                    bitrateOption.className = "quality-option";
                    bitrateOption.innerHTML = `<input type="radio" id="bitrate-${index}" name="bitrate" value="${bitrate}" style="margin-right: 8px;" ${bitrate === savedBitrate ? "checked" : ""}><label for="bitrate-${index}" style="font-size: 14px; cursor: pointer;">${bitrate}</label>`;
                    bitrateOption.addEventListener("click", () => {
                        bitrateOptions.querySelectorAll("input[name='bitrate']").forEach((radio) => (radio.checked = false));
                        bitrateOption.querySelector("input").checked = true;
                        config.bitrate = bitrate;
                        config.updateConfig(this.id, config);
                    });
                    bitrateOptions.appendChild(bitrateOption);
                });
            }

            const triggerDownload = (url) => {
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObject(url);
                }, 100);
            }

            const downloadContent = (payload, dialog, content) => {
                const status = dialog.querySelector("#download-status");
                status.style.display = "block";
                status.textContent = "Preparing download...";
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://c.blahaj.ca/",
                    headers: { "Accept": "application/json", "Content-Type": "application/json" },
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
                    onerror: () => { status.textContent = "Network error. Please check your connection"; }
                });
            }

            const interceptDownload = () => {
                const { dialog, backdrop, switchButton, content, videoOptions, audioOptions, qualityOptions, downloadOptions, downloadStatus, buttonContainer, cancelButton, downloadButton, dub, dubSelect } = createDialog();
                let isAudioMode = config.mode === "audio";
                updateQualityOptions(dialog, config.videoCodec, config.quality);
                updateAudioOptions(dialog, config.audioCodec, config.bitrate || "320kbps");
                videoOptions.style.display = isAudioMode ? "none" : "block";
                audioOptions.style.display = isAudioMode ? "block" : "none";
                dubSelector.style.display = config.dub ? "block" : "none";
                qualityOptions.style.display = config.dub ? "none" : "grid";

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
                            updateAudioOptions(dialog, config.audioCodec, config.bitrate || "320kbps");
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
                            audioFormat: config.audioFormat,
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
                            youtubeVideoDub: config.videoCodec === "dub" ? (config.dub || "original") : "original"
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

            document.addEventListener("click", (event) => {
                if (event.target.closest("button[aria-label='Download']")) {
                    event.stopPropagation();
                    event.preventDefault();
                    interceptDownload();
                }
            }, true);
        }

        renderConfig() {
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
                        <select class="language-dub">
                            <option value="">Original Language</option>
                            ${Object.entries(LANGUAGE_MAP)
                                .map(([code, lang]) => `<option value="${code}" ${config.dub === code ? "selected" : ""}>${lang} (${code})</option>`)
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
                    dub: container.querySelector(".language-dub").value
                };
                updateCallback(newConfig);
            };
            container.querySelectorAll(".module-config select").forEach((select) => {
                select.removeEventListener("change", update); // Prevent duplicate events
                select.addEventListener("change", update);
            });
        }
    }
