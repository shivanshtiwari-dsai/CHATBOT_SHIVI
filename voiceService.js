/**
 * ShiviAI Real-Time Voice Companion Service
 * Web Speech API Engine: SpeechSynthesis (TTS) & SpeechRecognition (STT)
 */

class VoiceService {
    constructor() {
        this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        
        // Initial state synced with localStorage or default to enabled (true)
        const storedVoice = typeof window !== 'undefined' && window.localStorage 
            ? window.localStorage.getItem('shivi_voice_enabled') 
            : null;
        this.isVoiceEnabled = storedVoice !== null ? storedVoice === 'true' : true;
        
        this.isSpeaking = false;
        this.isListening = false;
        this.selectedVoice = null;
        this.currentUtterance = null;
        this.currentlySpeakingMsgId = null;
        this.recognition = null;
        this.silenceTimer = null;
        this.keepAliveTimer = null;
        this.stateListeners = new Set();

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
                const voices = this.synth.getVoices();
                if (!voices || voices.length === 0) return;

                // Priority: Google Natural / Samantha / Arthur / Zira / English natural voices
                this.selectedVoice = voices.find(v => 
                    (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Arthur") || v.name.includes("Zira")) && 
                    v.lang.startsWith("en")
                ) || voices.find(v => v.lang.startsWith("en")) || voices[0];

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
     * Speech-to-Text Recognition setup
     */
    initRecognition() {
        if (typeof window === 'undefined') return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        try {
            this.recognition = new SpeechRec();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
        } catch (err) {
            console.warn('[VoiceService] SpeechRecognition init warning:', err);
        }
    }

    /**
     * Subscribe to voice state updates (isSpeaking, isListening, isVoiceEnabled)
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
    }

    getState() {
        return {
            isVoiceEnabled: this.isVoiceEnabled,
            isSpeaking: this.isSpeaking,
            isListening: this.isListening,
            currentlySpeakingMsgId: this.currentlySpeakingMsgId,
            selectedVoice: this.selectedVoice ? this.selectedVoice.name : null,
            hasVoiceSupport: !!this.synth,
            hasRecognitionSupport: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
        };
    }

    /**
     * Clean markdown, symbols, code blocks & URLs for smooth speech synthesis
     */
    cleanTextForSpeech(text) {
        if (!text) return '';
        return text
            .replace(/```[\s\S]*?```/g, "Code snippet sent in chat.")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/\[.*?\]\(.*?\)/g, "")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/[#*_`~>-]/g, " ")
            .replace(/\|.*?\|/g, " ") // table borders
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * Speak text using Web Speech API with sentence pacing and error resilience
     */
    speak(text, onEndCallback, msgId = null) {
        if (!this.synth || !this.isVoiceEnabled || !text) {
            if (onEndCallback) onEndCallback();
            return;
        }

        this.stop(); // Stop any overlapping previous speech

        const plainText = this.cleanTextForSpeech(text);
        if (!plainText) {
            if (onEndCallback) onEndCallback();
            return;
        }

        try {
            const utterance = new SpeechSynthesisUtterance(plainText);
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            utterance.rate = 1.05; // Conversational pacing
            utterance.pitch = 1.0;

            this.currentUtterance = utterance;
            this.currentlySpeakingMsgId = msgId;
            this.isSpeaking = true;
            this.notifyState();

            // Prevent Chrome 15-second speech synthesis garbage collection pause bug
            this.startKeepAlive();

            utterance.onstart = () => {
                this.isSpeaking = true;
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
            console.warn('[VoiceService] Speech speak error:', err);
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
        }, 12000);
    }

    clearKeepAlive() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
        }
    }

    /**
     * Stop active audio playback immediately
     */
    stop() {
        this.clearKeepAlive();
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
     * Toggle voice read aloud state
     */
    toggleVoice(state) {
        this.isVoiceEnabled = state !== undefined ? !!state : !this.isVoiceEnabled;
        if (!this.isVoiceEnabled) {
            this.stop();
        }
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('shivi_voice_enabled', this.isVoiceEnabled ? 'true' : 'false');
        }
        this.notifyState();
        return this.isVoiceEnabled;
    }

    /**
     * Real-time microphone listening with continuous/interim speech transcription
     */
    startListening({ onResult, onFinal, onStart, onEnd, onError, autoSendOnPause = true } = {}) {
        this.stop(); // Stop any bot speech when user speaks

        if (!this.recognition) {
            this.initRecognition();
        }

        if (!this.recognition) {
            if (onError) onError(new Error('Speech recognition not supported in this browser.'));
            return;
        }

        let accumulatedTranscript = '';

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

            // Natural pause detection: auto-submit after 2.0s of silence if speech detected
            if (autoSendOnPause && currentTotal.length > 2) {
                if (this.silenceTimer) clearTimeout(this.silenceTimer);
                this.silenceTimer = setTimeout(() => {
                    if (this.isListening && onFinal) {
                        this.stopListening();
                        onFinal(currentTotal);
                    }
                }, 2000);
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

    /**
     * Stop microphone listening
     */
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
    window.VoiceService = VoiceService;
    window.voiceService = voiceService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoiceService, voiceService };
}
