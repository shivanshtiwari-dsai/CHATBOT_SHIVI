/**
 * ShiviAI Real-Time Voice Companion Service
 * Dual Pipeline Speech Architecture:
 * - PIPELINE A: High-Definition Natural Browser Neural Voices (Edge / Google / Apple Natural - 100% Free)
 * - PIPELINE B: Studio Neural Cloud AI TTS (OpenAI / ChatGPT Quality with Seamless Zero-Latency Fallback)
 * 
 * Features: Hands-Free Two-Way Continuous Conversation Mode (Gemini / ChatGPT Style)
 */

/**
 * PIPELINE A: NATURAL BROWSER NEURAL VOICE FALLBACK (100% Free)
 * Strictly picks Edge/Google/Apple high-definition neural voices instead of generic default robotic voices.
 * @param {SpeechSynthesis} synth
 * @param {string} [targetLang]
 * @returns {SpeechSynthesisVoice|null}
 */
function getBestNaturalVoice(synth, targetLang = 'en-US') {
    if (!synth || typeof synth.getVoices !== 'function') return null;
    const rawVoices = synth.getVoices() || [];
    if (!Array.isArray(rawVoices) || rawVoices.length === 0) return null;
    const voices = rawVoices.filter(v => v && typeof v === 'object');
    if (voices.length === 0) return null;

    const lang = (targetLang || 'en-US').toLowerCase();

    // Helper safely matching voice name/lang without throwing on undefined properties
    const matchesPattern = (voice, pattern) => {
        if (!voice) return false;
        const name = voice.name || '';
        return name.includes(pattern);
    };

    // 1. Language-Specific: Hindi / Hinglish Natural Voices (Iterated in True Ranked Priority)
    if (lang.startsWith('hi')) {
        const hindiRankedPatterns = [
            "Microsoft Swara Online (Natural)",
            "Microsoft Madhur Online (Natural)",
            "Google हिन्दी",
            "Swara",
            "Madhur",
            "Heera"
        ];
        for (const pattern of hindiRankedPatterns) {
            const match = voices.find(v => matchesPattern(v, pattern));
            if (match) return match;
        }
        const hindiGeneral = voices.find(v => (v.lang || '').toLowerCase().startsWith('hi'));
        if (hindiGeneral) return hindiGeneral;
    }

    // 2. Language-Specific: Indian English Natural Voices (Iterated in True Ranked Priority)
    if (lang.includes('in') || lang.startsWith('en-in')) {
        const indianRankedPatterns = [
            "Microsoft Neerja Online (Natural)",
            "Microsoft Prabhat Online (Natural)",
            "Google English (India)",
            "Neerja",
            "Ravi"
        ];
        for (const pattern of indianRankedPatterns) {
            const match = voices.find(v => matchesPattern(v, pattern));
            if (match) return match;
        }
        const indianGeneral = voices.find(v => (v.lang || '').toLowerCase().includes('in'));
        if (indianGeneral) return indianGeneral;
    }

    // 3. User Specification Ranked Priority List for Global / US / UK English
    // Evaluated sequentially so rank 1 (Jenny) is ALWAYS preferred over rank 2 (Guy), etc.
    const rankedUsPatterns = [
        "Microsoft Jenny Online (Natural)",
        "Microsoft Guy Online (Natural)",
        "Microsoft Aria Online (Natural)",
        "Google US English",
        "Google UK English Female",
        "Samantha (Enhanced)",
        "Samantha",
        "Victoria",
        "Karen (Enhanced)",
        "Daniel (Enhanced)"
    ];

    for (const pattern of rankedUsPatterns) {
        const match = voices.find(v => matchesPattern(v, pattern));
        if (match) return match;
    }

    // 4. Any English voice that has 'Natural' or 'Online' in its title
    const naturalFallback = voices.find(v => {
        const name = v.name || '';
        const vLang = v.lang || '';
        return vLang.startsWith("en") && (name.includes("Natural") || name.includes("Online"));
    });
    if (naturalFallback) return naturalFallback;

    // 5. Modern non-robotic fallback: explicitly filter out legacy robotic desktop synthesizers
    const modernFallback = voices.find(v => {
        const name = v.name || '';
        const vLang = v.lang || '';
        const isLangMatch = vLang.startsWith(lang.slice(0, 2)) || vLang.startsWith("en");
        const isRobotic = name.includes("Desktop") || name.includes("eSpeak") || name.includes("TTS") || name.includes("Sample");
        return isLangMatch && !isRobotic;
    });

    if (modernFallback) return modernFallback;

    // 6. Final safety fallback
    return voices.find(v => (v.lang || '').startsWith("en")) || voices[0] || null;
}

class VoiceService {
    constructor() {
        this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        this.audioPlayer = typeof Audio !== 'undefined' ? new Audio() : null;
        this.currentAudioUrl = null;
        this.activeTtsAbortController = null;
        
        // Pure in-memory voice state initialized to enabled; synced strictly with MongoDB (Zero client-side localStorage)
        this.isVoiceEnabled = true;
        
        this.isSpeaking = false;
        this.isListening = false;
        this.selectedVoice = null;
        this.selectedVoiceKey = 'auto'; // 'auto' | 'neural_nova' | 'neural_shimmer' | 'neural_alloy' | 'neural_echo' | or browser voiceURI
        this.ttsPipeline = 'dual';      // 'dual' (tries Cloud Neural AI, falls back to Browser Natural) | 'browser'
        this.currentUtterance = null;
        this.currentlySpeakingMsgId = null;
        this.recognition = null;
        this.silenceTimer = null;
        this.keepAliveTimer = null;
        this.stateListeners = new Set();

        // 🌟 Continuous Voice Conversation Engine State
        this.isContinuousMode = false;
        this.conversationState = 'idle'; // 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'
        this.currentLanguage = 'en-US';  // 'en-US' | 'en-IN' | 'hi-IN'
        this.isMicMuted = false;
        this.continuousCallbacks = null;
        this.accumulatedTranscript = '';
        this.restartRecognitionTimeout = null;

        this.initVoice();
        this.initRecognition();
    }

    /**
     * Discover and select high-clarity natural conversational voice
     */
    initVoice() {
        if (!this.synth) return;

        const loadVoices = () => {
            try {
                this.updateSelectedVoiceForLang(this.currentLanguage);
                this.notifyState();
            } catch (err) {
                console.warn('[VoiceService] Voice loading warning:', err);
            }
        };

        loadVoices();
        if (typeof this.synth.onvoiceschanged !== 'undefined') {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    /**
     * Auto-select best conversational voice matching target language using Pipeline A
     */
    updateSelectedVoiceForLang(lang) {
        if (!this.synth) return;
        const targetLang = lang || this.currentLanguage || 'en-US';
        this.selectedVoice = getBestNaturalVoice(this.synth, targetLang);
    }

    /**
     * Set language for both Speech Recognition & Voice Synthesis
     * @param {'en-US' | 'en-IN' | 'hi-IN'} lang 
     */
    setLanguage(lang) {
        if (!lang) return;
        this.currentLanguage = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
        this.updateSelectedVoiceForLang(lang);
        this.notifyState();
    }

    /**
     * Explicitly choose a speaker voice by name or neural voice key
     */
    setSpeakerVoice(voiceKey) {
        if (!voiceKey) return;
        this.selectedVoiceKey = voiceKey;

        // If user picked a Cloud Neural voice
        if (voiceKey.startsWith('neural_')) {
            this.ttsPipeline = 'dual';
            this.notifyState();
            return;
        }

        // If user picked a Browser voice
        if (this.synth) {
            const voices = this.synth.getVoices ? this.synth.getVoices() : [];
            const found = voices.find(v => (v.voiceURI === voiceKey || v.name === voiceKey));
            if (found) {
                this.selectedVoice = found;
                this.ttsPipeline = 'browser';
                this.notifyState();
            }
        }
    }

    setVoice(voiceObj) {
        if (!voiceObj) return;
        this.selectedVoice = voiceObj;
        this.selectedVoiceKey = voiceObj.voiceURI || voiceObj.name;
        this.ttsPipeline = 'browser';
        this.notifyState();
    }

    /**
     * Get all available system voices including Studio Neural AI options
     */
    getAvailableVoices(targetLang = null) {
        const list = [];

        // 1. Studio Neural AI Voices (ChatGPT / Gemini Quality)
        list.push(
            { name: '✨ Shivi Neural - Nova (Ultra-Realistic AI)', voiceURI: 'neural_nova', lang: 'en-US', isNeural: true },
            { name: '✨ Shivi Neural - Shimmer (Warm Conversational AI)', voiceURI: 'neural_shimmer', lang: 'en-US', isNeural: true },
            { name: '✨ Shivi Neural - Alloy (Balanced Natural AI)', voiceURI: 'neural_alloy', lang: 'en-US', isNeural: true },
            { name: '✨ Shivi Neural - Echo (Expressive Studio AI)', voiceURI: 'neural_echo', lang: 'en-US', isNeural: true }
        );

        // 2. High-Definition Natural Web Voices from Browser (Pipeline A)
        if (this.synth) {
            const rawVoices = this.synth.getVoices ? this.synth.getVoices() : [];
            const sorted = [...rawVoices].sort((a, b) => {
                const aNat = (a.name.includes('Natural') || a.name.includes('Online') || a.name.includes('Enhanced') || a.name.includes('Google')) ? 1 : 0;
                const bNat = (b.name.includes('Natural') || b.name.includes('Online') || b.name.includes('Enhanced') || b.name.includes('Google')) ? 1 : 0;
                return bNat - aNat;
            });
            list.push(...sorted);
        }

        return list;
    }

    /**
     * Speech-to-Text Recognition setup
     */
    initRecognition() {
        if (typeof window === 'undefined') return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        try {
            this.recognition = new SpeechRec();
            this.recognition.continuous = false; // We manage continuous looping with smart re-arming
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLanguage || 'en-US';
        } catch (err) {
            console.warn('[VoiceService] SpeechRecognition init warning:', err);
        }
    }

    /**
     * Subscribe to voice state updates
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.stateListeners.add(callback);
            callback(this.getState());
            return () => this.stateListeners.delete(callback);
        }
        return () => {};
    }

    notifyState() {
        const state = this.getState();
        this.stateListeners.forEach(cb => {
            try { cb(state); } catch (e) { console.error(e); }
        });
        if (this.isContinuousMode && this.continuousCallbacks && this.continuousCallbacks.onStateChange) {
            try { this.continuousCallbacks.onStateChange(this.conversationState, state); } catch (e) { console.error(e); }
        }
    }

    getState() {
        return {
            isVoiceEnabled: this.isVoiceEnabled,
            isSpeaking: this.isSpeaking,
            isListening: this.isListening,
            isContinuousMode: this.isContinuousMode,
            conversationState: this.conversationState,
            currentLanguage: this.currentLanguage,
            isMicMuted: this.isMicMuted,
            currentlySpeakingMsgId: this.currentlySpeakingMsgId,
            selectedVoice: this.selectedVoice ? this.selectedVoice.name : null,
            selectedVoiceKey: this.selectedVoiceKey,
            hasVoiceSupport: !!this.synth,
            hasRecognitionSupport: !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))
        };
    }

    setConversationState(state) {
        this.conversationState = state;
        this.notifyState();
    }

    /**
     * Clean markdown, code snippets, symbols & URLs for natural conversational speech
     */
    cleanTextForSpeech(text) {
        if (!text) return '';
        return text
            // Replace fenced code blocks
            .replace(/```[\s\S]*?```/g, " I've shared the code snippet in your chat. ")
            // Inline code
            .replace(/`([^`]+)`/g, "$1")
            // Markdown links: keep text only
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            // Plain URLs
            .replace(/https?:\/\/\S+/g, "")
            // Tables and pipes
            .replace(/\|.*?\|/g, " ")
            // Emojis (keep text clean for TTS)
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            // Asterisks, hashes, backticks, tildes, markdown tags
            .replace(/[\*#_~`>]/g, " ")
            // Bullet characters
            .replace(/[•✦■►]/g, " ")
            // Clean up multiple spaces and dashes
            .replace(/\s*--\s*/g, ", ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * DUAL-PIPELINE SPEAK CONTROLLER:
     * Attempts Studio Neural Cloud AI TTS first; if unavailable/times out, seamlessly falls back to Pipeline A (Browser Natural)
     */
    async speak(text, onEndCallback, msgId = null) {
        if (!this.isVoiceEnabled || !text) {
            if (onEndCallback) onEndCallback();
            return;
        }

        this.stop(); // Stop any previous speech

        const plainText = this.cleanTextForSpeech(text);
        if (!plainText) {
            if (onEndCallback) onEndCallback();
            return;
        }

        this.currentlySpeakingMsgId = msgId;

        // Determine if Cloud Neural AI should be used
        const isNeuralCloud = this.selectedVoiceKey && this.selectedVoiceKey.startsWith('neural_');
        const shouldAttemptCloud = isNeuralCloud || this.ttsPipeline === 'dual';

        if (shouldAttemptCloud) {
            const neuralVoiceName = isNeuralCloud ? this.selectedVoiceKey.replace('neural_', '') : 'nova';
            const cloudSuccess = await this.speakNeuralCloud(plainText, neuralVoiceName, onEndCallback, msgId);
            if (cloudSuccess) {
                return;
            }
            // Seamless zero-latency fallback to Pipeline A
        }

        // PIPELINE A: NATURAL BROWSER NEURAL VOICE FALLBACK (100% Free)
        this.speakBrowserNatural(plainText, onEndCallback, msgId);
    }

    /**
     * PIPELINE B: Studio Neural Cloud AI Audio Synthesis
     */
    async speakNeuralCloud(text, voiceName, onEndCallback, msgId) {
        if (typeof fetch === 'undefined') return false;

        const controller = new AbortController();
        this.activeTtsAbortController = controller;
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s fast timeout to prevent waiting

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: voiceName || 'nova',
                    speed: 1.02
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            this.activeTtsAbortController = null;

            if (!res.ok) return false;

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await res.json().catch(() => ({}));
                if (data.fallback) {
                    return false; // Server signaled to use Pipeline A
                }
            }

            if (!contentType.includes('audio')) {
                return false;
            }

            const blob = await res.blob();
            if (!blob || blob.size < 100) return false;

            if (!this.audioPlayer) {
                this.audioPlayer = new Audio();
            }

            if (this.currentAudioUrl) {
                URL.revokeObjectURL(this.currentAudioUrl);
            }
            this.currentAudioUrl = URL.createObjectURL(blob);
            this.audioPlayer.src = this.currentAudioUrl;

            return new Promise((resolve) => {
                this.isSpeaking = true;
                this.setConversationState('speaking');

                this.audioPlayer.onplay = () => {
                    this.isSpeaking = true;
                    this.setConversationState('speaking');
                    this.notifyState();
                };

                this.audioPlayer.onended = () => {
                    this.isSpeaking = false;
                    this.currentlySpeakingMsgId = null;
                    if (this.currentAudioUrl) {
                        URL.revokeObjectURL(this.currentAudioUrl);
                        this.currentAudioUrl = null;
                    }
                    this.notifyState();
                    if (onEndCallback) onEndCallback();
                    resolve(true);
                };

                this.audioPlayer.onerror = (e) => {
                    console.warn('[VoiceService] Cloud audio playback notice, switching to Pipeline A:', e);
                    this.isSpeaking = false;
                    this.currentlySpeakingMsgId = null;
                    if (this.currentAudioUrl) {
                        URL.revokeObjectURL(this.currentAudioUrl);
                        this.currentAudioUrl = null;
                    }
                    this.notifyState();
                    resolve(false);
                };

                this.audioPlayer.play().catch(playErr => {
                    console.warn('[VoiceService] Audio playback start notice:', playErr);
                    resolve(false);
                });
            });

        } catch (err) {
            clearTimeout(timeoutId);
            this.activeTtsAbortController = null;
            return false;
        }
    }

    /**
     * PIPELINE A: NATURAL BROWSER NEURAL VOICE SYNTHESIS (100% Free)
     */
    speakBrowserNatural(plainText, onEndCallback, msgId) {
        if (!this.synth) {
            if (onEndCallback) onEndCallback();
            return;
        }

        try {
            const utterance = new SpeechSynthesisUtterance(plainText);

            // Strictly select best Edge / Google / Apple natural neural voice
            const bestVoice = (this.selectedVoice && !this.selectedVoiceKey.startsWith('neural_'))
                ? this.selectedVoice 
                : getBestNaturalVoice(this.synth, this.currentLanguage);

            if (bestVoice) {
                utterance.voice = bestVoice;
            }
            if (this.currentLanguage) {
                utterance.lang = this.currentLanguage;
            }

            // Natural conversational cadence & prosody
            utterance.rate = 1.04;
            utterance.pitch = 1.0;

            this.currentUtterance = utterance;
            this.currentlySpeakingMsgId = msgId;
            this.isSpeaking = true;
            this.setConversationState('speaking');

            // Prevent Chrome 15-second speech synthesis garbage collection pause bug
            this.startKeepAlive();

            utterance.onstart = () => {
                this.isSpeaking = true;
                this.setConversationState('speaking');
                this.notifyState();
            };

            utterance.onend = () => {
                this.clearKeepAlive();
                this.isSpeaking = false;
                this.currentlySpeakingMsgId = null;
                this.currentUtterance = null;
                this.notifyState();
                if (onEndCallback) onEndCallback();
            };

            utterance.onerror = (e) => {
                this.clearKeepAlive();
                this.isSpeaking = false;
                this.currentlySpeakingMsgId = null;
                this.currentUtterance = null;
                this.notifyState();
                if (onEndCallback) onEndCallback(e);
            };

            this.synth.speak(utterance);
        } catch (err) {
            console.warn('[VoiceService] Browser speech speak error:', err);
            this.clearKeepAlive();
            this.isSpeaking = false;
            this.currentlySpeakingMsgId = null;
            this.notifyState();
            if (onEndCallback) onEndCallback(err);
        }
    }

    startKeepAlive() {
        this.clearKeepAlive();
        this.keepAliveTimer = setInterval(() => {
            if (this.isSpeaking && this.synth && this.synth.speaking) {
                this.synth.pause();
                this.synth.resume();
            } else {
                this.clearKeepAlive();
            }
        }, 10000);
    }

    clearKeepAlive() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
        }
    }

    /**
     * Stop active audio playback immediately across both pipelines
     */
    stop() {
        this.clearKeepAlive();

        // 1. Stop Cloud Audio Player
        if (this.audioPlayer) {
            try {
                this.audioPlayer.pause();
                this.audioPlayer.currentTime = 0;
                this.audioPlayer.removeAttribute('src');
            } catch (e) {}
        }
        if (this.currentAudioUrl) {
            try {
                URL.revokeObjectURL(this.currentAudioUrl);
            } catch (e) {}
            this.currentAudioUrl = null;
        }
        if (this.activeTtsAbortController) {
            try {
                this.activeTtsAbortController.abort();
            } catch (e) {}
            this.activeTtsAbortController = null;
        }

        // 2. Stop Browser SpeechSynthesis
        if (this.synth) {
            try {
                this.synth.cancel();
            } catch (err) {
                console.warn('[VoiceService] Cancel warning:', err);
            }
        }

        this.isSpeaking = false;
        this.currentlySpeakingMsgId = null;
        this.currentUtterance = null;
        this.notifyState();
    }

    /**
     * User interruption / barge-in: Stops Shivi immediately and arms listening
     */
    interruptBotSpeech() {
        this.stop();
        if (this.isContinuousMode && !this.isMicMuted) {
            this.startContinuousListening();
        }
    }

    /**
     * Toggle voice read aloud state
     */
    toggleVoice(state) {
        this.isVoiceEnabled = state !== undefined ? !!state : !this.isVoiceEnabled;
        if (!this.isVoiceEnabled) {
            this.stop();
        }
        // Persist strictly to MongoDB via API (Zero client-side localStorage)
        try {
            fetch('/api/users/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voiceEnabled: this.isVoiceEnabled })
            }).catch(() => {});
        } catch (e) {}
        this.notifyState();
        return this.isVoiceEnabled;
    }

    // =========================================================================
    // 🎙️ GEMINI / CHATGPT STYLE CONTINUOUS LIVE VOICE CONVERSATION MODE
    // =========================================================================

    /**
     * Start the hands-free two-way conversation mode
     */
    startContinuousMode(callbacks = {}) {
        this.isContinuousMode = true;
        this.isMicMuted = false;
        this.continuousCallbacks = callbacks;
        this.stop(); // Stop any pending speech

        this.startContinuousListening();
    }

    /**
     * Arm the microphone listener for continuous conversation
     */
    startContinuousListening() {
        if (!this.isContinuousMode || this.isMicMuted) return;

        if (this.restartRecognitionTimeout) {
            clearTimeout(this.restartRecognitionTimeout);
            this.restartRecognitionTimeout = null;
        }

        if (!this.recognition) {
            this.initRecognition();
        }

        if (!this.recognition) {
            if (this.continuousCallbacks && this.continuousCallbacks.onError) {
                this.continuousCallbacks.onError(new Error('Speech recognition is not supported in this browser.'));
            }
            return;
        }

        this.accumulatedTranscript = '';
        this.setConversationState('listening');

        this.recognition.lang = this.currentLanguage || 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.setConversationState('listening');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const part = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + part;
                } else {
                    interimTranscript += part;
                }
            }

            const currentTotal = (this.accumulatedTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();

            if (this.continuousCallbacks && this.continuousCallbacks.onTranscriptUpdate) {
                this.continuousCallbacks.onTranscriptUpdate(currentTotal, false);
            }

            // Natural pause detection: auto-submit after 1.8s of silence if speech detected
            if (currentTotal.length > 1) {
                if (this.silenceTimer) clearTimeout(this.silenceTimer);
                this.silenceTimer = setTimeout(() => {
                    if (this.isListening && this.isContinuousMode) {
                        const finalQuery = currentTotal.trim();
                        this.stopListening();
                        this.handleContinuousSpeechCommitted(finalQuery);
                    }
                }, 1800);
            }
        };

        this.recognition.onerror = (event) => {
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.isListening = false;
            console.warn('[Continuous Voice] Recognition event notice:', event.error);

            if (this.isContinuousMode && !this.isMicMuted && event.error !== 'aborted' && event.error !== 'not-allowed') {
                this.scheduleContinuousRestart(800);
            }
        };

        this.recognition.onend = () => {
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.isListening = false;

            if (this.conversationState === 'speaking' || this.conversationState === 'thinking') {
                return;
            }

            if (this.accumulatedTranscript && this.accumulatedTranscript.trim()) {
                const finalQuery = this.accumulatedTranscript.trim();
                this.accumulatedTranscript = '';
                this.handleContinuousSpeechCommitted(finalQuery);
                return;
            }

            if (this.isContinuousMode && !this.isMicMuted && this.conversationState === 'listening') {
                this.scheduleContinuousRestart(300);
            }
        };

        try {
            this.recognition.start();
        } catch (err) {
            console.warn('[Continuous Voice] Start notice:', err);
            if (this.isContinuousMode && !this.isMicMuted) {
                this.scheduleContinuousRestart(1000);
            }
        }
    }

    scheduleContinuousRestart(delayMs = 400) {
        if (!this.isContinuousMode || this.isMicMuted) return;
        if (this.restartRecognitionTimeout) clearTimeout(this.restartRecognitionTimeout);

        this.restartRecognitionTimeout = setTimeout(() => {
            if (this.isContinuousMode && !this.isMicMuted && !this.isSpeaking && this.conversationState !== 'thinking') {
                this.startContinuousListening();
            }
        }, delayMs);
    }

    handleContinuousSpeechCommitted(finalSpeech) {
        if (!finalSpeech || !finalSpeech.trim()) {
            if (this.isContinuousMode && !this.isMicMuted) {
                this.startContinuousListening();
            }
            return;
        }

        this.setConversationState('thinking');
        if (this.continuousCallbacks && this.continuousCallbacks.onUserMessage) {
            this.continuousCallbacks.onUserMessage(finalSpeech.trim());
        }
    }

    /**
     * Called when Shivi finishes speaking her answer in continuous mode
     */
    onAiResponseFinished() {
        if (!this.isContinuousMode || this.isMicMuted) return;

        // 400ms echo-prevention delay before reopening mic
        setTimeout(() => {
            if (this.isContinuousMode && !this.isMicMuted) {
                this.startContinuousListening();
            }
        }, 400);
    }

    /**
     * Toggle Mute / Pause in Continuous Mode
     */
    toggleMute() {
        this.isMicMuted = !this.isMicMuted;
        if (this.isMicMuted) {
            this.stopListening();
            this.setConversationState('paused');
        } else {
            this.setConversationState('listening');
            this.startContinuousListening();
        }
        return this.isMicMuted;
    }

    toggleMicMute() {
        return this.toggleMute();
    }

    pauseContinuousMode() {
        this.isMicMuted = true;
        this.stopListening();
        this.stop();
        this.setConversationState('paused');
    }

    resumeContinuousListening() {
        this.isMicMuted = false;
        this.setConversationState('listening');
        this.startContinuousListening();
    }

    /**
     * End continuous voice conversation mode
     */
    stopContinuousMode() {
        this.isContinuousMode = false;
        this.isMicMuted = false;
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.restartRecognitionTimeout) {
            clearTimeout(this.restartRecognitionTimeout);
            this.restartRecognitionTimeout = null;
        }
        this.stopListening();
        this.stop();
        this.setConversationState('idle');
        this.continuousCallbacks = null;
    }

    // =========================================================================
    // 🎤 SINGLE-SHOT LISTENING (For standard chat input mic button)
    // =========================================================================

    startListening({ onResult, onFinal, onStart, onEnd, onError, autoSendOnPause = true } = {}) {
        this.stop();

        if (!this.recognition) {
            this.initRecognition();
        }

        if (!this.recognition) {
            if (onError) onError(new Error('Speech recognition not supported in this browser.'));
            return;
        }

        let accumulatedTranscript = '';
        this.recognition.lang = this.currentLanguage || 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.notifyState();
            if (onStart) onStart();
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const part = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    accumulatedTranscript += (accumulatedTranscript ? ' ' : '') + part;
                } else {
                    interimTranscript += part;
                }
            }

            const currentTotal = (accumulatedTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();

            if (onResult) {
                onResult(currentTotal, interimTranscript);
            }

            if (autoSendOnPause && currentTotal.length > 2) {
                if (this.silenceTimer) clearTimeout(this.silenceTimer);
                this.silenceTimer = setTimeout(() => {
                    if (this.isListening && onFinal) {
                        this.stopListening();
                        onFinal(currentTotal);
                    }
                }, 1800);
            }
        };

        this.recognition.onerror = (event) => {
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.isListening = false;
            this.notifyState();
            if (onError) onError(event);
        };

        this.recognition.onend = () => {
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.isListening = false;
            this.notifyState();
            if (onEnd) onEnd(accumulatedTranscript.trim());
        };

        try {
            this.recognition.start();
        } catch (err) {
            console.warn('[VoiceService] Recognition start warning:', err);
        }
    }

    stopListening() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (err) {}
        }
        this.isListening = false;
        this.notifyState();
    }
}

// Universal instantiation
const voiceService = new VoiceService();

if (typeof window !== 'undefined') {
    window.getBestNaturalVoice = getBestNaturalVoice;
    window.VoiceService = VoiceService;
    window.voiceService = voiceService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoiceService, voiceService, getBestNaturalVoice };
}
