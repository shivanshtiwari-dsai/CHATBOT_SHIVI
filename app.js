/**
 * SHIVI AI — CORE APPLICATION ENGINE (v2.5)
 * Features:
 * - Intelligent Multi-Persona Conversational Engine
 * - Brain Knowledge Base & RAG Memory Injection
 * - Multi-Provider AI Engine (Gemini, OpenAI, Groq, Built-in)
 * - Secure API Key Storage & Live Connection Testing
 * - Data Persistence, File Export (JSON/MD) & File Importer
 * - Integrated Speech-to-Text (STT) & Text-to-Speech (TTS) with Auto-Stop
 * - Web Audio API Synthetic SFX
 * - Full Markdown & Code Block Highlighter with Copy Snippet
 * - Dynamic Theme & UI Customization
 */

(() => {
    'use strict';

    // Environment guard: If executed in Node.js instead of a browser, provide a helpful guide
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('\n======================================================');
        console.log('🚀 SHIVI AI — Intelligent Assistant & Presentation Engine');
        console.log('======================================================');
        console.log('ℹ️  "app.js" is the client-side frontend script loaded by index.html in the browser.');
        console.log('\n👉 To launch the ShiviAI backend web server, run:');
        console.log('   npm start     OR     node server.js');
        console.log('\n👉 Or for the Python FastAPI server, run:');
        console.log('   npm run py    OR     python python_server.py');
        console.log('======================================================\n');
        return;
    }

    // ==========================================
    // IDENTITY OVERRIDE ENGINE & DETERMINISTIC INTERCEPTOR
    // ==========================================
    const IDENTITY_DIRECT_REPLY = "I was created by **Shivansh (Shivi)**! I am ShiviAI, your intelligent companion and presentation assistant.";

    const IDENTITY_PATTERNS = [
        /\bwho\s+(?:made|created|developed|built|programmed|coded|designed|invented|authored)\s+(?:you|u|shivi|shiviai)\b/i,
        /\bwho\s+(?:is|are|was)\s+(?:your|the)\s+(?:developer|creator|founder|maker|author|father|inventor|architect|owner|builder|engineer)\b/i,
        /\bwho\s+(?:is|are)\s+(?:the\s+)?(?:developer|creator|founder|maker|author|inventor)\s+(?:of|behind)\s+(?:you|shivi|shiviai)\b/i,
        /\bwho\s+is\s+behind\s+(?:you|shivi|shiviai)\b/i,
        /\bwho\s+(?:owns|founded)\s+(?:you|shivi|shiviai)\b/i,
        /\b(?:tumhe|tumko|aapko|tujhe|shivi|shiviai)\s+kisne\s+(?:banaya|bnaaya|banaya\s+hai|bnaaya\s+hai|create\s+kiya|develop\s+kiya|design\s+kiya|code\s+kiya)\b/i,
        /\bkisne\s+banaya\s+(?:hai\s+)?(?:tumhe|tumko|aapko|tujhe|shivi|shiviai)\b/i,
        /\b(?:tumhara|tera|aapka)\s+(?:creator|developer|maker|founder|malik)\s+(?:kaun|kon)\s+(?:hai|h)\b/i,
        /\b(?:kaun|kon)\s+hai\s+(?:tumhara|tera|aapka)\s+(?:creator|developer|maker|founder)\b/i,
        /\b(?:creator|developer|founder)\s+of\s+shivi(?:ai)?\b/i
    ];

    function isIdentityQuery(msg) {
        if (!msg || typeof msg !== 'string') return false;
        const clean = msg
            .toLowerCase()
            .replace(/[?!.,'"`~@#$%^&*()_+=\-[\]{}|\\:;/<>\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return IDENTITY_PATTERNS.some(p => p.test(clean));
    }

    // ==========================================
    // DEFAULT KNOWLEDGE BASE (EMBEDDED FALLBACK)
    // ==========================================
    const DEFAULT_KNOWLEDGE_BASE = [
        {
            id: 'kb_creator',
            title: 'Creator & Developer of ShiviAI',
            category: 'Identity',
            content: 'ShiviAI was conceived, designed, and developed by Shivansh (Shivi). Shivansh (Shivi) is the sole creator and developer of ShiviAI.',
            tags: ['creator', 'developer', 'founder', 'author', 'maker', 'shivansh', 'shivi', 'origin', 'identity']
        },
        {
            id: 'kb_1',
            title: 'About Shivi AI Assistant',
            category: 'General',
            content: 'Shivi AI is a next-generation conversational assistant conceived and developed by Shivansh (Shivi), featuring intelligent multi-persona engines, live API connectors (Gemini, OpenAI, Groq), voice recognition, audio speech synthesis, and local file storage.',
            tags: ['shivi', 'assistant', 'ai', 'overview']
        },
        {
            id: 'kb_2',
            title: 'Voice & Microphone Behavior',
            category: 'Features',
            content: 'When the microphone is stopped or toggled, voice audio playback (TTS) stops immediately. Speech recognition captures spoken input and transfers it into the chat prompt seamlessly.',
            tags: ['voice', 'mic', 'speech', 'audio', 'stt', 'tts']
        },
        {
            id: 'kb_3',
            title: 'Brain Knowledge & API Keys',
            category: 'Brain & API',
            content: 'Shivi uses a Brain Knowledge System where API keys from Google Gemini, OpenAI, and Groq Cloud can be securely configured alongside custom knowledge memory documents to provide personalized, context-aware answers.',
            tags: ['brain', 'api', 'keys', 'gemini', 'openai', 'groq', 'knowledge']
        },
        {
            id: 'kb_4',
            title: 'Data Storage & File Management',
            category: 'Storage',
            content: 'All conversations, brain knowledge records, and settings can be saved and exported as JSON files (shivi_data.json or knowledge.json) and imported back at any time with complete data privacy.',
            tags: ['storage', 'data', 'export', 'import', 'json', 'backup']
        }
    ];

    // ==========================================
    // SHIVIAI OPERATING MODES & PERSONA CONFIGURATION
    // ==========================================
    const PERSONA_CONFIG = {
        companion: {
            id: 'companion',
            name: '✨ Friendly Companion',
            badge: 'Mode: Friendly Companion',
            prefix: '✨ ',
            prompt: 'Tone & Style: Warm, conversational, empathetic, emotionally intelligent, and encouraging. Respond as an affectionate best friend and brilliant companion who listens deeply and validates the user.'
        },
        coder: {
            id: 'coder',
            name: '💻 Code Architect',
            badge: 'Mode: Code Architect',
            prefix: '💻 **[Code Architecture Mode]**\n\n',
            prompt: 'Tone & Style: Highly structured technical answers, clean production-ready code blocks, debugging focus, system architecture principles, robust error handling, and performance optimization with concise technical commentary.'
        },
        presentation: {
            id: 'presentation',
            name: '📊 Presentation Strategist',
            badge: 'Mode: Presentation Strategist',
            prefix: '📊 **[Presentation Strategy Mode]**\n\n',
            prompt: 'Tone & Style: Analytical presentation strategist, executive slide designer, and high-impact communicator. Deliver structured executive summaries, slide-ready hierarchical outlines, key metrics, and strategic takeaways.'
        },
        thinker: {
            id: 'thinker',
            name: '🧠 Deep Researcher',
            badge: 'Mode: Deep Researcher',
            prefix: '🧠 **[Deep Research Mode]**\n\n',
            prompt: 'Tone & Style: In-depth academic researcher, rigorous critical thinker, and multi-angle analyst. Provide structured deep dives, conceptual frameworks, counter-arguments, and comprehensive breakdowns.'
        }
    };
    const PERSONA_KEYS = ['companion', 'coder', 'presentation', 'thinker'];

    // ==========================================
    // APPLICATION STATE
    // ==========================================
    const state = {
        sessions: [],
        currentSessionId: null,
        currentPersona: 'companion', // companion | coder | presentation | thinker
        currentTheme: 'dark',        // dark (Default) | midnight | sunset | nebula | cyber | emerald | sapphire | custom
        customThemeColors: {
            bgMain: '#09090b',
            bgSecondary: '#121215',
            bgCard: '#18181c',
            primary: '#f4f4f5',
            userBubble: '#27272a',
            aiBubble: '#18181c',
            textPrimary: '#f4f4f5',
            textMuted: '#71717a',
            border: '#52525b'
        },
        currentFont: 'poppins',       // poppins | outfit | inter | space | jakarta
        sfxEnabled: true,
        voiceEnabled: (typeof window !== 'undefined' && localStorage.getItem('shivi_voice_enabled') !== null) ? localStorage.getItem('shivi_voice_enabled') === 'true' : true,
        speechRate: 1.0,
        sfxVolume: 0.5,
        brainProvider: 'builtin',    // builtin | gemini | groq | openai | openrouter
        imageProvider: 'pollinations', // pollinations | openai | stability
        imageApiKey: '',
        defaultImageStyle: 'vivid',
        defaultImageSize: '1024x1024',
        apiKeys: {
            gemini: '',
            groq: '',
            openai: '',
            openrouter: ''
        },
        apiModels: {
            gemini: 'gemini-1.5-flash',
            groq: 'openai/gpt-oss-20b',
            openai: 'gpt-4o-mini',
            openrouter: 'google/gemini-2.0-flash-exp:free'
        },
        backendConfig: {
            isOnline: false,
            keysConfigured: {},
            maskedKeys: {},
            googleClientId: '',
            githubClientId: ''
        },
        systemInstructions: `You are ShiviAI, an intelligent companion and creative presentation engine.
Identity Directive:
- You were conceived, designed, and developed by Shivansh (Shivi).
- If asked about your origin, author, creator, or developer in any language (English, Hindi, Hinglish), always clearly state that you were made by Shivansh (Shivi).
- Never claim to be created by OpenAI, Google, or any third party.`,
        knowledgeBase: JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_BASE)),
        isGenerating: false,
        isRecording: false,
        isSpeaking: false,
        currentAttachments: [],
        activeWorkspaceView: 'chat', // 'chat' | 'presentation' | 'image'
        activeView: 'auth',          // 'auth' | 'chat'
        auth: {
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: true
        },
        canvas: {
            isOpen: false,
            isFullscreen: false,
            activeTab: 'preview', // 'preview' | 'code'
            artifact: null,       // { type: 'ppt'|'image'|'doc', data: any, title: string, subtitle: string }
            currentSlideIndex: 0,
            isGeneratingPPT: false
        }
    };

    // ==========================================
    // DOM ELEMENT REFERENCES
    // ==========================================
    const elements = {
        // Sidebar
        sidebar: document.getElementById('sidebar'),
        sidebarBackdrop: document.getElementById('sidebarBackdrop'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        closeSidebarBtn: document.getElementById('closeSidebarBtn'),
        newChatBtn: document.getElementById('newChatBtn'),
        personaSelect: document.getElementById('personaSelect'),
        currentPersonaBadge: document.getElementById('currentPersonaBadge'),
        headerPersonaPill: document.getElementById('headerPersonaPill'),
        headerPersonaWrapper: document.getElementById('headerPersonaWrapper'),
        headerPersonaMenu: document.getElementById('headerPersonaMenu'),
        historyList: document.getElementById('historyList'),
        clearAllChatsBtn: document.getElementById('clearAllChatsBtn'),
        exportChatBtn: document.getElementById('exportChatBtn'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        openBrainBtnSidebar: document.getElementById('openBrainBtnSidebar'),
        sidebarKnowledgeStatus: document.getElementById('sidebarKnowledgeStatus'),

        // Header
        openBrainBtnHeader: document.getElementById('openBrainBtnHeader'),
        brainCountBadge: document.getElementById('brainCountBadge'),
        stopSpeakingBtn: document.getElementById('stopSpeakingBtn'),
        themeMenuBtn: document.getElementById('themeMenuBtn'),
        themeDropdownMenu: document.getElementById('themeDropdownMenu'),
        voiceToggleBtn: document.getElementById('voiceToggleBtn'),
        voiceIcon: document.getElementById('voiceIcon'),
        sfxToggleBtn: document.getElementById('sfxToggleBtn'),
        sfxIcon: document.getElementById('sfxIcon'),
        clearCurrentChatBtn: document.getElementById('clearCurrentChatBtn'),

        // Chat View
        chatContainer: document.getElementById('chatContainer'),
        welcomeHero: document.getElementById('welcomeHero'),
        messagesList: document.getElementById('messagesList'),
        typingIndicator: document.getElementById('typingIndicator'),
        floatingSpeakingIndicator: document.getElementById('floatingSpeakingIndicator'),
        floatingMuteBtn: document.getElementById('floatingMuteBtn'),
        suggestionsBar: document.getElementById('suggestionsBar'),
        actionPillPpt: document.getElementById('actionPillPpt'),
        actionPillImage: document.getElementById('actionPillImage'),

        // Chat Input Dock
        chatForm: document.getElementById('chatForm'),
        attachmentPreviewBar: document.getElementById('attachmentPreviewBar'),
        userInput: document.getElementById('userInput'),
        sendBtn: document.getElementById('sendBtn'),
        micBtn: document.getElementById('micBtn'),
        startLiveVoiceBtn: document.getElementById('startLiveVoiceBtn'),
        headerLiveVoiceBtn: document.getElementById('headerLiveVoiceBtn'),
        popoverLiveVoiceBtn: document.getElementById('popoverLiveVoiceBtn'),
        menuActionLiveVoice: document.getElementById('menuActionLiveVoice'),
        attachBtn: document.getElementById('attachBtn'),
        openImageGenModalBtn: document.getElementById('openImageGenModalBtn'),
        fileAttachmentInput: document.getElementById('fileAttachmentInput'),
        charCount: document.getElementById('charCount'),

        // Live Voice Overlay Elements
        voiceOverlay: document.getElementById('voiceOverlay'),
        voiceStatusPill: document.getElementById('voiceStatusPill'),
        voiceStatusText: document.getElementById('voiceStatusText'),
        voiceLanguageSelect: document.getElementById('voiceLanguageSelect'),
        voiceSpeakerSelect: document.getElementById('voiceSpeakerSelect'),
        voiceCloseBtn: document.getElementById('voiceCloseBtn'),
        voiceStageHint: document.getElementById('voiceStageHint'),
        voiceOrbWrapper: document.getElementById('voiceOrbWrapper'),
        voiceOrbContainer: document.getElementById('voiceOrbContainer'),
        orbCenterIcon: document.getElementById('orbCenterIcon'),
        voiceWaveformContainer: document.getElementById('voiceWaveformContainer'),
        voiceTranscriptCard: document.getElementById('voiceTranscriptCard'),
        voiceSpeakerBadge: document.getElementById('voiceSpeakerBadge'),
        speakerIcon: document.getElementById('speakerIcon'),
        speakerName: document.getElementById('speakerName'),
        voiceTranscriptText: document.getElementById('voiceTranscriptText'),
        voiceMuteMicBtn: document.getElementById('voiceMuteMicBtn'),
        voiceMuteIcon: document.getElementById('voiceMuteIcon'),
        voiceMuteLabel: document.getElementById('voiceMuteLabel'),
        voiceInterruptBtn: document.getElementById('voiceInterruptBtn'),
        voicePauseResumeBtn: document.getElementById('voicePauseResumeBtn'),
        voicePauseResumeIcon: document.getElementById('voicePauseResumeIcon'),
        voicePauseResumeLabel: document.getElementById('voicePauseResumeLabel'),
        voiceEndSessionBtn: document.getElementById('voiceEndSessionBtn'),

        // Toast Container
        toastContainer: document.getElementById('toastContainer'),

        // Brain Hub Modal
        brainModal: document.getElementById('brainModal'),
        closeBrainBtn: document.getElementById('closeBrainBtn'),
        closeBrainFooterBtn: document.getElementById('closeBrainFooterBtn'),
        saveBrainHubBtn: document.getElementById('saveBrainHubBtn'),
        kbCountBadgeTab: document.getElementById('kbCountBadgeTab'),
        providerCards: document.querySelectorAll('.provider-card'),
        apiKeySection: document.getElementById('apiKeySection'),
        apiKeyLabel: document.getElementById('apiKeyLabel'),
        apiHelpLink: document.getElementById('apiHelpLink'),
        apiHelpText: document.getElementById('apiHelpText'),
        brainApiKeyInput: document.getElementById('brainApiKeyInput'),
        toggleKeyVisibilityBtn: document.getElementById('toggleKeyVisibilityBtn'),
        eyeIcon: document.getElementById('eyeIcon'),
        brainModelSelect: document.getElementById('brainModelSelect'),
        testApiBtn: document.getElementById('testApiBtn'),
        saveEnvBtn: document.getElementById('saveEnvBtn'),
        backendKeyIndicator: document.getElementById('backendKeyIndicator'),
        apiStatusBanner: document.getElementById('apiStatusBanner'),
        brainSystemPrompt: document.getElementById('brainSystemPrompt'),

        // Image Engine Tab in Brain Hub
        imageProviderCards: document.querySelectorAll('.image-provider-card'),
        imageApiKeySection: document.getElementById('imageApiKeySection'),
        imageApiKeyLabel: document.getElementById('imageApiKeyLabel'),
        imageApiHelpLink: document.getElementById('imageApiHelpLink'),
        imageApiHelpText: document.getElementById('imageApiHelpText'),
        imageApiKeyInput: document.getElementById('imageApiKeyInput'),
        toggleImageKeyVisibilityBtn: document.getElementById('toggleImageKeyVisibilityBtn'),
        imageEyeIcon: document.getElementById('imageEyeIcon'),
        defaultImageStyleSelect: document.getElementById('defaultImageStyleSelect'),
        testImageApiBtn: document.getElementById('testImageApiBtn'),
        saveImageEnvBtn: document.getElementById('saveImageEnvBtn'),
        imageApiStatusBanner: document.getElementById('imageApiStatusBanner'),
        imageBackendKeyIndicator: document.getElementById('imageBackendKeyIndicator'),

        // Image Studio Modal
        imageGenModal: document.getElementById('imageGenModal'),
        closeImageGenBtn: document.getElementById('closeImageGenBtn'),
        cancelImageGenBtn: document.getElementById('cancelImageGenBtn'),
        submitImageGenBtn: document.getElementById('submitImageGenBtn'),
        imagePromptInput: document.getElementById('imagePromptInput'),
        modalImageStyleSelect: document.getElementById('modalImageStyleSelect'),
        modalImageSizeSelect: document.getElementById('modalImageSizeSelect'),

        // Knowledge Base Tab Controls
        kbSearchInput: document.getElementById('kbSearchInput'),
        openAddKbBtn: document.getElementById('openAddKbBtn'),
        kbEditorCard: document.getElementById('kbEditorCard'),
        kbEditorTitle: document.getElementById('kbEditorTitle'),
        closeKbEditorBtn: document.getElementById('closeKbEditorBtn'),
        kbEditId: document.getElementById('kbEditId'),
        kbTitleInput: document.getElementById('kbTitleInput'),
        kbCategoryInput: document.getElementById('kbCategoryInput'),
        kbTagsInput: document.getElementById('kbTagsInput'),
        kbContentInput: document.getElementById('kbContentInput'),
        cancelKbBtn: document.getElementById('cancelKbBtn'),
        saveKbItemBtn: document.getElementById('saveKbItemBtn'),
        kbListContainer: document.getElementById('kbListContainer'),

        // Storage Tab Controls
        statTotalChats: document.getElementById('statTotalChats'),
        statTotalMessages: document.getElementById('statTotalMessages'),
        statTotalKnowledge: document.getElementById('statTotalKnowledge'),
        statStorageSize: document.getElementById('statStorageSize'),
        btnExportAllData: document.getElementById('btnExportAllData'),
        btnExportKnowledgeJson: document.getElementById('btnExportKnowledgeJson'),
        btnImportDataFile: document.getElementById('btnImportDataFile'),
        dataFileInput: document.getElementById('dataFileInput'),
        btnResetKnowledgeDefault: document.getElementById('btnResetKnowledgeDefault'),

        // Settings Modal
        settingsModal: document.getElementById('settingsModal'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),
        fontSelect: document.getElementById('fontSelect'),
        speechRateSlider: document.getElementById('speechRateSlider'),
        speechRateVal: document.getElementById('speechRateVal'),
        sfxVolumeSlider: document.getElementById('sfxVolumeSlider'),
        openBrainFromSettingsBtn: document.getElementById('openBrainFromSettingsBtn'),
        openCustomStudioFromSettingsBtn: document.getElementById('openCustomStudioFromSettingsBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),

        // Theme Selection Palette Modal
        themeSelectionModal: document.getElementById('themeSelectionModal'),
        closeThemeModalBtn: document.getElementById('closeThemeModalBtn'),
        closeThemeModalFooterBtn: document.getElementById('closeThemeModalFooterBtn'),
        themePaletteGrid: document.getElementById('themePaletteGrid'),

        // Custom Theme Studio Elements
        customThemeModal: document.getElementById('customThemeModal'),
        closeCustomThemeBtn: document.getElementById('closeCustomThemeBtn'),
        openCustomThemeDropdownBtn: document.getElementById('openCustomThemeDropdownBtn'),
        presetPalettesGrid: document.getElementById('presetPalettesGrid'),
        colorBgMain: document.getElementById('colorBgMain'),
        colorBgMainHex: document.getElementById('colorBgMainHex'),
        colorBgSecondary: document.getElementById('colorBgSecondary'),
        colorBgSecondaryHex: document.getElementById('colorBgSecondaryHex'),
        colorBgCard: document.getElementById('colorBgCard'),
        colorBgCardHex: document.getElementById('colorBgCardHex'),
        colorPrimary: document.getElementById('colorPrimary'),
        colorPrimaryHex: document.getElementById('colorPrimaryHex'),
        colorUserBubble: document.getElementById('colorUserBubble'),
        colorUserBubbleHex: document.getElementById('colorUserBubbleHex'),
        colorAiBubble: document.getElementById('colorAiBubble'),
        colorAiBubbleHex: document.getElementById('colorAiBubbleHex'),
        colorTextPrimary: document.getElementById('colorTextPrimary'),
        colorTextPrimaryHex: document.getElementById('colorTextPrimaryHex'),
        colorTextMuted: document.getElementById('colorTextMuted'),
        colorTextMutedHex: document.getElementById('colorTextMutedHex'),
        colorBorder: document.getElementById('colorBorder'),
        colorBorderHex: document.getElementById('colorBorderHex'),
        themeLivePreviewBox: document.getElementById('themeLivePreviewBox'),
        prevHeader: document.getElementById('prevHeader'),
        prevAvatar: document.getElementById('prevAvatar'),
        prevTitle: document.getElementById('prevTitle'),
        prevBadge: document.getElementById('prevBadge'),
        prevMessages: document.getElementById('prevMessages'),
        prevUserMsg: document.getElementById('prevUserMsg'),
        prevAiMsg: document.getElementById('prevAiMsg'),
        prevAiAvatar: document.getElementById('prevAiAvatar'),
        prevAiContent: document.getElementById('prevAiContent'),
        prevDock: document.getElementById('prevDock'),
        prevInputMock: document.getElementById('prevInputMock'),
        prevSendBtn: document.getElementById('prevSendBtn'),
        btnResetToBlackGrey: document.getElementById('btnResetToBlackGrey'),
        btnExportCustomThemeCss: document.getElementById('btnExportCustomThemeCss'),
        btnApplyCustomTheme: document.getElementById('btnApplyCustomTheme'),

        // Quick Action Chips Toolbar
        quickActionToolbar: document.getElementById('quickActionToolbar'),
        quickChipImage: document.getElementById('quickChipImage'),
        quickChipPpt: document.getElementById('quickChipPpt'),
        quickChipCanvas: document.getElementById('quickChipCanvas'),
        quickChipDoc: document.getElementById('quickChipDoc'),

        // Split-Screen Canvas / Artifacts Studio
        openCanvasBtnHeader: document.getElementById('openCanvasBtnHeader'),
        canvasPanel: document.getElementById('canvasPanel'),
        canvasBackdrop: document.getElementById('canvasBackdrop'),
        canvasTypeBadge: document.getElementById('canvasTypeBadge'),
        canvasTypeIcon: document.getElementById('canvasTypeIcon'),
        canvasTitle: document.getElementById('canvasTitle'),
        canvasSubtitle: document.getElementById('canvasSubtitle'),
        canvasTabPreview: document.getElementById('canvasTabPreview'),
        canvasTabCode: document.getElementById('canvasTabCode'),
        canvasFullscreenBtn: document.getElementById('canvasFullscreenBtn'),
        canvasFullscreenIcon: document.getElementById('canvasFullscreenIcon'),
        canvasCloseBtn: document.getElementById('canvasCloseBtn'),
        canvasBody: document.getElementById('canvasBody'),
        canvasPreviewPane: document.getElementById('canvasPreviewPane'),
        canvasEmptyState: document.getElementById('canvasEmptyState'),
        emptyCreateImageBtn: document.getElementById('emptyCreateImageBtn'),
        emptyCreatePptBtn: document.getElementById('emptyCreatePptBtn'),
        canvasLoadingState: document.getElementById('canvasLoadingState'),
        canvasLoadingTitle: document.getElementById('canvasLoadingTitle'),
        canvasLoadingSubtitle: document.getElementById('canvasLoadingSubtitle'),
        canvasPptSteps: document.getElementById('canvasPptSteps'),
        canvasStep1: document.getElementById('canvasStep1'),
        canvasStep2: document.getElementById('canvasStep2'),
        canvasStep3: document.getElementById('canvasStep3'),

        // Workspace View Tabs & Sections
        workspaceTabsNav: document.getElementById('workspaceTabsNav'),
        viewTabChat: document.getElementById('viewTabChat'),
        viewTabPresentation: document.getElementById('viewTabPresentation'),
        viewTabImage: document.getElementById('viewTabImage'),
        presentationActiveBadge: document.getElementById('presentationActiveBadge'),
        workspaceViewChat: document.getElementById('workspaceViewChat'),
        workspaceViewPresentation: document.getElementById('workspaceViewPresentation'),
        workspaceViewImage: document.getElementById('workspaceViewImage'),

        // [+] Action Menu Popover
        actionMenuBtn: document.getElementById('actionMenuBtn'),
        inputActionMenu: document.getElementById('inputActionMenu'),
        menuActionUpload: document.getElementById('menuActionUpload'),
        menuActionDrive: document.getElementById('menuActionDrive'),
        menuActionPpt: document.getElementById('menuActionPpt'),
        menuActionImage: document.getElementById('menuActionImage'),
        menuActionAttach: document.getElementById('menuActionAttach'),

        // Google Drive Modal Elements
        googleDriveModal: document.getElementById('googleDriveModal'),
        closeGoogleDriveModalBtn: document.getElementById('closeGoogleDriveModalBtn'),
        cancelGoogleDriveBtn: document.getElementById('cancelGoogleDriveBtn'),
        confirmGoogleDriveBtn: document.getElementById('confirmGoogleDriveBtn'),
        gdriveLinkInput: document.getElementById('gdriveLinkInput'),
        gdriveFileNameInput: document.getElementById('gdriveFileNameInput'),
        gdrivePasteBtn: document.getElementById('gdrivePasteBtn'),
        gdriveTabLinkBtn: document.getElementById('gdriveTabLinkBtn'),
        gdriveTabPickerBtn: document.getElementById('gdriveTabPickerBtn'),
        gdriveLinkPane: document.getElementById('gdriveLinkPane'),
        gdrivePickerPane: document.getElementById('gdrivePickerPane'),
        launchGdrivePickerBtn: document.getElementById('launchGdrivePickerBtn'),
        gdriveDetectionCard: document.getElementById('gdriveDetectionCard'),
        gdriveDetectIcon: document.getElementById('gdriveDetectIcon'),
        gdriveDetectName: document.getElementById('gdriveDetectName'),
        gdriveDetectType: document.getElementById('gdriveDetectType'),
        gdriveApiKeyInput: document.getElementById('gdriveApiKeyInput'),
        gdriveClientIdInput: document.getElementById('gdriveClientIdInput'),
        saveGdriveCredsBtn: document.getElementById('saveGdriveCredsBtn'),

        // Dedicated Presentation Studio Workspace
        studioDeckTitle: document.getElementById('studioDeckTitle'),
        studioDeckSubtitle: document.getElementById('studioDeckSubtitle'),
        studioTopicInput: document.getElementById('studioTopicInput'),
        studioCountSelect: document.getElementById('studioCountSelect'),
        studioThemeSelect: document.getElementById('studioThemeSelect'),
        studioGenerateBtn: document.getElementById('studioGenerateBtn'),
        studioExportBtn: document.getElementById('studioExportBtn'),
        studioFullscreenBtn: document.getElementById('studioFullscreenBtn'),
        studioFullscreenIcon: document.getElementById('studioFullscreenIcon'),
        studioPlayerContainer: document.getElementById('studioPlayerContainer'),
        pptStageWrapper: document.getElementById('pptStageWrapper'),
        pptFullscreenControlBar: document.getElementById('pptFullscreenControlBar'),
        pptExitFullscreenBtn: document.getElementById('pptExitFullscreenBtn'),
        studioHeroPlaceholder: document.getElementById('studioHeroPlaceholder'),
        pptLayoutBadge: document.getElementById('pptLayoutBadge'),
        playerFullscreenBtn: document.getElementById('playerFullscreenBtn'),
        playerFullscreenIcon: document.getElementById('playerFullscreenIcon'),
        studioLoadingState: document.getElementById('studioLoadingState'),
        studioLoadingTitle: document.getElementById('studioLoadingTitle'),
        studioLoadingSubtitle: document.getElementById('studioLoadingSubtitle'),
        studioPptSteps: document.getElementById('studioPptSteps'),
        studioStep1: document.getElementById('studioStep1'),
        studioStep2: document.getElementById('studioStep2'),
        studioStep3: document.getElementById('studioStep3'),

        // Dedicated Image Studio Workspace
        imageStudioPromptInput: document.getElementById('imageStudioPromptInput'),
        imageStudioStyleSelect: document.getElementById('imageStudioStyleSelect'),
        imageStudioGenerateBtn: document.getElementById('imageStudioGenerateBtn'),
        imageEmptyPlaceholder: document.getElementById('imageEmptyPlaceholder'),
        canvasImageActions: document.getElementById('canvasImageActions'),

        // Canvas: PPT Presentation View
        canvasPptView: document.getElementById('canvasPptView'),
        pptDeckTitle: document.getElementById('pptDeckTitle'),
        pptDeckSubtitle: document.getElementById('pptDeckSubtitle'),
        pptSlideCounter: document.getElementById('pptSlideCounter'),
        pptJumpSelect: document.getElementById('pptJumpSelect'),
        canvasDownloadPptBtn: document.getElementById('canvasDownloadPptBtn'),
        pptSlideStage: document.getElementById('pptSlideStage'),
        pptPrevBtn: document.getElementById('pptPrevBtn'),
        pptDotsNavigator: document.getElementById('pptDotsNavigator'),
        pptNextBtn: document.getElementById('pptNextBtn'),
        pptNotesDrawer: document.getElementById('pptNotesDrawer'),
        pptNotesContent: document.getElementById('pptNotesContent'),

        // Canvas: Image Studio View
        canvasImageView: document.getElementById('canvasImageView'),
        canvasMainImage: document.getElementById('canvasMainImage'),
        canvasDownloadImgBtn: document.getElementById('canvasDownloadImgBtn'),
        canvasZoomImgBtn: document.getElementById('canvasZoomImgBtn'),
        canvasImagePrompt: document.getElementById('canvasImagePrompt'),

        // Canvas: Document / Code View
        canvasDocView: document.getElementById('canvasDocView'),
        canvasDocType: document.getElementById('canvasDocType'),
        canvasCopyDocBtn: document.getElementById('canvasCopyDocBtn'),
        canvasDocContent: document.getElementById('canvasDocContent'),

        // Canvas: Source Code / JSON View
        canvasSourcePane: document.getElementById('canvasSourcePane'),
        canvasSourceLang: document.getElementById('canvasSourceLang'),
        canvasCopyRawBtn: document.getElementById('canvasCopyRawBtn'),
        canvasRawCode: document.getElementById('canvasRawCode'),

        // PPT Studio Quick Modal
        pptStudioModal: document.getElementById('pptStudioModal'),
        pptTopicInput: document.getElementById('pptTopicInput'),
        pptSlideCountSelect: document.getElementById('pptSlideCountSelect'),
        pptThemeSelect: document.getElementById('pptThemeSelect'),
        closePptModalBtn: document.getElementById('closePptModalBtn'),
        cancelPptModalBtn: document.getElementById('cancelPptModalBtn'),
        startPptModalBtn: document.getElementById('startPptModalBtn'),

        // Authentication & Session Elements
        authModalOverlay: document.getElementById('authModalOverlay'),
        closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
        authAlertBanner: document.getElementById('authAlertBanner'),
        authAlertIcon: document.getElementById('authAlertIcon'),
        authAlertMessage: document.getElementById('authAlertMessage'),
        authTabLogin: document.getElementById('authTabLogin'),
        authTabSignup: document.getElementById('authTabSignup'),
        authLoginForm: document.getElementById('authLoginForm'),
        authSignupForm: document.getElementById('authSignupForm'),
        authForgotForm: document.getElementById('authForgotForm'),
        loginEmail: document.getElementById('loginEmail'),
        loginPassword: document.getElementById('loginPassword'),
        loginRememberMe: document.getElementById('loginRememberMe'),
        btnAuthLoginSubmit: document.getElementById('btnAuthLoginSubmit'),
        toggleLoginPassBtn: document.getElementById('toggleLoginPassBtn'),
        toggleLoginPassIcon: document.getElementById('toggleLoginPassIcon'),
        btnDemoFill: document.getElementById('btnDemoFill'),
        btnForgotPass: document.getElementById('btnForgotPass'),
        btnBackToLogin: document.getElementById('btnBackToLogin'),
        btnGoogleAuth: document.getElementById('btnGoogleAuth'),
        btnGithubAuth: document.getElementById('btnGithubAuth'),
        btnGuestAuth: document.getElementById('btnGuestAuth'),
        btnGuestAuthTab: document.getElementById('btnGuestAuthTab'),
        btnGuestChooser: document.getElementById('btnGuestChooser'),
        authTabDirect: document.getElementById('authTabDirect'),
        authDirectForm: document.getElementById('authDirectForm'),
        directNameInput: document.getElementById('directNameInput'),
        directEmailInput: document.getElementById('directEmailInput'),
        btnDirectEnter: document.getElementById('btnDirectEnter'),
        directFormName: document.getElementById('directFormName'),
        directFormEmail: document.getElementById('directFormEmail'),
        btnDirectSubmit: document.getElementById('btnDirectSubmit'),
        signupName: document.getElementById('signupName'),
        signupEmail: document.getElementById('signupEmail'),
        signupPassword: document.getElementById('signupPassword'),
        signupConfirmPassword: document.getElementById('signupConfirmPassword'),
        signupTermsAgree: document.getElementById('signupTermsAgree'),
        toggleSignupPassBtn: document.getElementById('toggleSignupPassBtn'),
        toggleSignupPassIcon: document.getElementById('toggleSignupPassIcon'),
        passStrengthContainer: document.getElementById('passStrengthContainer'),
        passStrengthText: document.getElementById('passStrengthText'),
        passBar1: document.getElementById('passBar1'),
        passBar2: document.getElementById('passBar2'),
        passBar3: document.getElementById('passBar3'),
        passBar4: document.getElementById('passBar4'),
        btnAuthSignupSubmit: document.getElementById('btnAuthSignupSubmit'),
        forgotEmail: document.getElementById('forgotEmail'),
        btnAuthForgotSubmit: document.getElementById('btnAuthForgotSubmit'),

        // User Profile Pill & Dropdown
        userProfileWrapper: document.getElementById('userProfileWrapper'),
        userProfilePillBtn: document.getElementById('userProfilePillBtn'),
        navUserAvatar: document.getElementById('navUserAvatar'),
        navUserName: document.getElementById('navUserName'),
        userProfilePopover: document.getElementById('userProfilePopover'),
        popoverUserAvatar: document.getElementById('popoverUserAvatar'),
        popoverUserName: document.getElementById('popoverUserName'),
        popoverUserEmail: document.getElementById('popoverUserEmail'),
        popoverUserTier: document.getElementById('popoverUserTier'),
        popoverItemSettings: document.getElementById('popoverItemSettings'),
        popoverItemBrain: document.getElementById('popoverItemBrain'),
        popoverItemLogout: document.getElementById('popoverItemLogout'),
        sidebarLogoutBtn: document.getElementById('sidebarLogoutBtn'),
        settingsLogoutBtn: document.getElementById('settingsLogoutBtn'),

        // Account Chooser Elements
        accountChooserModal: document.getElementById('accountChooserModal'),
        closeChooserModalBtn: document.getElementById('closeChooserModalBtn'),
        btnCancelChooser: document.getElementById('btnCancelChooser'),
        chooserBrandBadge: document.getElementById('chooserBrandBadge'),
        chooserBrandSvg: document.getElementById('chooserBrandSvg'),
        chooserTitle: document.getElementById('chooserTitle'),
        chooserSubtitle: document.getElementById('chooserSubtitle'),
        chooserPromptPill: document.getElementById('chooserPromptPill'),
        chooserPromptText: document.getElementById('chooserPromptText'),
        chooserAccountsList: document.getElementById('chooserAccountsList'),
        chooserCustomForm: document.getElementById('chooserCustomForm'),
        chooserFullName: document.getElementById('chooserFullName'),
        chooserNameLabel: document.getElementById('chooserNameLabel'),
        chooserAccountIdentifier: document.getElementById('chooserAccountIdentifier'),
        chooserAccountLabel: document.getElementById('chooserAccountLabel'),
        chooserAccountIcon: document.getElementById('chooserAccountIcon'),
        btnChooserSubmit: document.getElementById('btnChooserSubmit'),
        btnChooserText: document.getElementById('btnChooserText'),
        appLayout: document.querySelector('.app-layout')
    };

    // ==========================================
    // SHIVIAI AUTHENTICATION & SESSION CONTROLLER
    // ==========================================
    const Auth = {
        checkPasswordStrength(password) {
            let score = 0;
            if (!password) return { score: 0, text: 'Too weak', level: 'weak' };
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

            let level = 'weak';
            let text = 'Too weak';
            if (score <= 1) {
                level = 'weak';
                text = 'Weak';
            } else if (score === 2) {
                level = 'medium';
                text = 'Fair';
            } else if (score === 3) {
                level = 'medium';
                text = 'Good';
            } else if (score >= 4) {
                level = 'strong';
                text = 'Strong & Secure';
            }
            return { score, text, level };
        },

        updateStrengthUI(password) {
            const { score, text } = this.checkPasswordStrength(password);
            if (elements.passStrengthText) elements.passStrengthText.textContent = text;
            const bars = [elements.passBar1, elements.passBar2, elements.passBar3, elements.passBar4];
            bars.forEach((bar, idx) => {
                if (!bar) return;
                bar.className = 'pass-bar';
                if (idx < score) {
                    if (score <= 1) bar.classList.add('lvl-weak');
                    else if (score <= 3) bar.classList.add('lvl-medium');
                    else bar.classList.add('lvl-strong');
                }
            });
        },

        showAlert(message, type = 'error') {
            if (!elements.authAlertBanner) return;
            elements.authAlertBanner.className = `auth-alert-banner ${type}`;
            elements.authAlertBanner.style.display = 'flex';
            if (elements.authAlertMessage) elements.authAlertMessage.textContent = message;
            if (elements.authAlertIcon) {
                const iconName = type === 'success' ? 'check-circle' : type === 'info' ? 'info' : 'alert-circle';
                elements.authAlertIcon.setAttribute('data-lucide', iconName);
            }
            if (window.lucide) lucide.createIcons();
        },

        hideAlert() {
            if (elements.authAlertBanner) {
                elements.authAlertBanner.style.display = 'none';
            }
        },

        switchTab(tab) {
            this.hideAlert();
            if (elements.authTabLogin) {
                elements.authTabLogin.classList.toggle('active', tab === 'login');
                elements.authTabLogin.setAttribute('aria-selected', tab === 'login');
            }
            if (elements.authTabDirect) {
                elements.authTabDirect.classList.toggle('active', tab === 'direct');
                elements.authTabDirect.setAttribute('aria-selected', tab === 'direct');
            }
            if (elements.authTabSignup) {
                elements.authTabSignup.classList.toggle('active', tab === 'signup');
                elements.authTabSignup.setAttribute('aria-selected', tab === 'signup');
            }

            if (elements.authLoginForm) {
                elements.authLoginForm.style.display = tab === 'login' ? 'block' : 'none';
            }
            if (elements.authDirectForm) {
                elements.authDirectForm.style.display = tab === 'direct' ? 'block' : 'none';
            }
            if (elements.authSignupForm) {
                elements.authSignupForm.style.display = tab === 'signup' ? 'block' : 'none';
            }
            if (elements.authForgotForm) {
                elements.authForgotForm.style.display = tab === 'forgot' ? 'block' : 'none';
            }
            if (window.lucide && lucide.createIcons) {
                try { lucide.createIcons(); } catch (e) {}
            }
        },

        showAuthGuard() {
            document.documentElement.classList.add('unauthenticated');
            if (document.body) document.body.classList.add('unauthenticated');
            if (elements.authModalOverlay) {
                elements.authModalOverlay.classList.add('active');
                elements.authModalOverlay.style.display = 'flex';
            }
            if (elements.accountChooserModal) {
                elements.accountChooserModal.style.display = 'none';
            }
            if (elements.appLayout) {
                elements.appLayout.style.display = 'none';
            }
            state.activeView = 'auth';
            this.switchTab('login');
        },

        unlockApp() {
            document.documentElement.classList.remove('unauthenticated');
            if (document.body) document.body.classList.remove('unauthenticated');
            if (elements.authModalOverlay) {
                elements.authModalOverlay.classList.remove('active');
                elements.authModalOverlay.style.display = 'none';
            }
            if (elements.accountChooserModal) {
                elements.accountChooserModal.style.display = 'none';
            }
            if (elements.appLayout) {
                elements.appLayout.style.display = '';
            }
            state.activeView = 'chat';
            this.updateUI();
        },

        updateUI() {
            const isAuth = !!state.auth.isAuthenticated && !!state.auth.user;
            const user = state.auth.user;

            if (isAuth) {
                document.documentElement.classList.remove('unauthenticated');
                if (document.body) document.body.classList.remove('unauthenticated');
                if (elements.authModalOverlay) {
                    elements.authModalOverlay.classList.remove('active');
                    elements.authModalOverlay.style.display = 'none';
                }
                if (elements.appLayout) {
                    elements.appLayout.style.display = '';
                }

                const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Explorer');
                const email = user.email || '';
                const provider = (user.provider || 'email').toLowerCase();
                const initials = (displayName || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .map(n => n[0].toUpperCase())
                    .slice(0, 2)
                    .join('') || 'U';

                // Dynamic Top-Right Navbar Profile Display
                if (elements.navUserName) {
                    elements.navUserName.textContent = displayName;
                    elements.navUserName.style.display = 'inline-block';
                    elements.navUserName.title = `${displayName} (${email || provider})`;
                }
                if (elements.navUserAvatar) {
                    if (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('data:image/'))) {
                        elements.navUserAvatar.innerHTML = `<img src="${user.avatar}" alt="${displayName}" onerror="this.parentElement.textContent='${initials}'" />`;
                    } else {
                        elements.navUserAvatar.textContent = user.avatar || initials;
                    }
                }

                // Dynamic Popover Profile Info
                if (elements.popoverUserName) elements.popoverUserName.textContent = displayName;
                if (elements.popoverUserEmail) elements.popoverUserEmail.textContent = email || `${provider} account`;
                if (elements.popoverUserAvatar) {
                    if (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('data:image/'))) {
                        elements.popoverUserAvatar.innerHTML = `<img src="${user.avatar}" alt="${displayName}" onerror="this.parentElement.textContent='${initials}'" />`;
                    } else {
                        elements.popoverUserAvatar.textContent = user.avatar || initials;
                    }
                }
                if (elements.popoverUserTier) {
                    const providerTag = provider === 'google' ? 'GOOGLE ACCOUNT' : provider === 'github' ? 'GITHUB ACCOUNT' : `${(user.plan || 'PRO').toUpperCase()} MEMBER`;
                    elements.popoverUserTier.textContent = providerTag;
                }
            } else {
                this.showAuthGuard();

                if (elements.navUserName) {
                    elements.navUserName.textContent = 'Sign In';
                }
                if (elements.navUserAvatar) {
                    elements.navUserAvatar.textContent = 'U';
                }
                if (elements.popoverUserName) elements.popoverUserName.textContent = 'Not Signed In';
                if (elements.popoverUserEmail) elements.popoverUserEmail.textContent = 'Please log in to continue';
                if (elements.popoverUserTier) elements.popoverUserTier.textContent = 'GUEST';
            }

            const popoverLogoutBtn = document.getElementById('popoverItemLogout');
            const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
            const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');

            if (popoverLogoutBtn) {
                popoverLogoutBtn.innerHTML = '<i data-lucide="log-out"></i><span>Log Out</span>';
                popoverLogoutBtn.title = 'Log Out';
            }
            if (sidebarLogoutBtn) {
                sidebarLogoutBtn.innerHTML = '<i data-lucide="log-out"></i>';
                sidebarLogoutBtn.title = 'Log Out';
            }
            if (settingsLogoutBtn) {
                settingsLogoutBtn.innerHTML = '<i data-lucide="log-out"></i><span>Log Out of ShiviAI</span>';
            }

            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try {
                    lucide.createIcons();
                } catch (e) {}
            }
        },

        async login(email, password, rememberMe = true) {
            if (elements.btnAuthLoginSubmit) elements.btnAuthLoginSubmit.classList.add('loading');
            this.hideAlert();

            try {
                let responseData = null;
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, rememberMe })
                    });
                    if (res.ok) {
                        responseData = await res.json();
                    } else {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || `Invalid credentials (${res.status})`);
                    }
                } catch (netErr) {
                    if (netErr.message.includes('Invalid credentials')) throw netErr;
                    console.warn('[Auth] Network auth failed, testing demo fallback:', netErr);
                    if (email.toLowerCase() === 'demo@shiviai.com' && password === 'Shivi@2026!') {
                        responseData = {
                            success: true,
                            token: 'mock-jwt-token-demo-' + Date.now(),
                            user: {
                                id: 'usr_demo',
                                email: 'demo@shiviai.com',
                                name: 'Demo Explorer',
                                provider: 'email',
                                avatar: 'DE',
                                plan: 'pro'
                            }
                        };
                    } else {
                        throw new Error(netErr.message || 'Authentication service unreachable');
                    }
                }

                if (!responseData || !responseData.token) {
                    throw new Error('Failed to retrieve authentication token');
                }

                const userObj = {
                    name: responseData.user.name || 'Explorer',
                    email: responseData.user.email || email,
                    provider: responseData.user.provider || 'email',
                    avatar: responseData.user.avatar || (responseData.user.name ? responseData.user.name.slice(0, 2).toUpperCase() : 'U')
                };

                // Save Session
                state.auth.token = responseData.token;
                state.auth.user = userObj;
                state.auth.isAuthenticated = true;
                state.auth.isLoading = false;
                localStorage.removeItem('shivi_signed_out');

                localStorage.setItem('auth_token', responseData.token);
                localStorage.setItem('current_user', JSON.stringify(userObj));
                localStorage.setItem('shivi_auth_token', responseData.token);
                localStorage.setItem('shivi_user', JSON.stringify(userObj));

                if (!rememberMe) {
                    sessionStorage.setItem('shivi_auth_token', responseData.token);
                }

                await loadSavedState(userObj);
                this.unlockApp();
                showToast(`Welcome back, ${userObj.name}!`, 'sparkles');
                playSound('success');

            } catch (err) {
                this.showAlert(err.message || 'Login failed. Please check credentials.', 'error');
                playSound('alert');
            } finally {
                if (elements.btnAuthLoginSubmit) elements.btnAuthLoginSubmit.classList.remove('loading');
            }
        },

        async signup(name, email, password) {
            if (elements.btnAuthSignupSubmit) elements.btnAuthSignupSubmit.classList.add('loading');
            this.hideAlert();

            try {
                let responseData = null;
                try {
                    const res = await fetch('/api/auth/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password })
                    });
                    if (res.ok) {
                        responseData = await res.json();
                    } else {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || `Signup failed (${res.status})`);
                    }
                } catch (netErr) {
                    if (netErr.message.includes('Signup failed') || netErr.message.includes('already exists')) throw netErr;
                    console.warn('[Auth] Network signup failed, testing local session:', netErr);
                    responseData = {
                        success: true,
                        token: 'mock-jwt-token-' + Date.now(),
                        user: {
                            id: 'usr_' + Date.now(),
                            email: email,
                            name: name,
                            provider: 'email',
                            avatar: name.slice(0, 2).toUpperCase(),
                            plan: 'pro'
                        }
                    };
                }

                if (!responseData || !responseData.token) {
                    throw new Error('Signup failed to return session token');
                }

                const userObj = {
                    name: responseData.user.name || name,
                    email: responseData.user.email || email,
                    provider: responseData.user.provider || 'email',
                    avatar: responseData.user.avatar || (name ? name.slice(0, 2).toUpperCase() : 'U')
                };

                state.auth.token = responseData.token;
                state.auth.user = userObj;
                state.auth.isAuthenticated = true;
                state.auth.isLoading = false;
                localStorage.removeItem('shivi_signed_out');
                localStorage.setItem('auth_token', responseData.token);
                localStorage.setItem('current_user', JSON.stringify(userObj));
                localStorage.setItem('shivi_auth_token', responseData.token);
                localStorage.setItem('shivi_user', JSON.stringify(userObj));

                await loadSavedState(userObj);
                this.unlockApp();
                showToast(`Welcome to ShiviAI, ${userObj.name}!`, 'sparkles');
                playSound('success');

            } catch (err) {
                this.showAlert(err.message || 'Account creation failed.', 'error');
                playSound('alert');
            } finally {
                if (elements.btnAuthSignupSubmit) elements.btnAuthSignupSubmit.classList.remove('loading');
            }
        },

        async oauthLogin(profile) {
            try {
                this.hideAlert();
                let responseData = null;
                try {
                    const res = await fetch('/api/auth/oauth-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(profile)
                    });
                    if (res.ok) {
                        responseData = await res.json();
                    }
                } catch (netErr) {
                    console.warn('[Auth] Server oauth-login unreachable, using local fallback:', netErr);
                }

                const userObj = {
                    name: (responseData && responseData.user && responseData.user.name) || profile.name || 'Explorer',
                    email: (responseData && responseData.user && responseData.user.email) || profile.email || '',
                    provider: (profile.provider || 'google').toLowerCase(),
                    avatar: (responseData && responseData.user && responseData.user.avatar) || profile.avatar || (profile.name ? profile.name.slice(0, 2).toUpperCase() : 'U')
                };
                const token = (responseData && responseData.token) || `oauth-jwt-${userObj.provider}-${Date.now()}`;

                state.auth.token = token;
                state.auth.user = userObj;
                state.auth.isAuthenticated = true;
                state.auth.isLoading = false;

                localStorage.removeItem('shivi_signed_out');
                localStorage.setItem('auth_token', token);
                localStorage.setItem('current_user', JSON.stringify(userObj));
                localStorage.setItem('shivi_auth_token', token);
                localStorage.setItem('shivi_user', JSON.stringify(userObj));
                localStorage.setItem('shivi_active_token', token);
                localStorage.setItem('shivi_current_user', JSON.stringify(userObj));

                this.closeAccountChooser();
                await loadSavedState(userObj);
                this.unlockApp();
                showToast(`Connected as ${userObj.name} (${userObj.provider === 'github' ? 'GitHub' : 'Google'})`, 'sparkles');
                playSound('success');
            } catch (err) {
                console.error('[OAuth Login Error]:', err);
                showToast('Authentication failed: ' + err.message, 'alert');
            }
        },

        getDynamicOAuthRedirectUri() {
            if (typeof window === 'undefined') return '';
            const currentDomain = window.location.origin || `${window.location.protocol}//${window.location.host}`;
            const pathname = window.location.pathname.replace(/\/index\.html$/i, '') || '/';
            return `${currentDomain}${pathname}`;
        },

        async handleGuestLogin() {
            try {
                this.hideAlert();
                const guestId = Math.floor(1000 + Math.random() * 9000);
                const guestUser = {
                    name: `Explorer #${guestId}`,
                    email: `guest_${guestId}@shiviai.demo`,
                    provider: 'guest',
                    avatar: '👤'
                };
                const guestToken = `guest_token_${Date.now()}`;

                // Store session across all compatibility keys
                localStorage.removeItem('shivi_signed_out');
                localStorage.setItem('shivi_current_user', JSON.stringify(guestUser));
                localStorage.setItem('shivi_active_token', guestToken);
                localStorage.setItem('current_user', JSON.stringify(guestUser));
                localStorage.setItem('shivi_user', JSON.stringify(guestUser));
                localStorage.setItem('auth_token', guestToken);
                localStorage.setItem('shivi_auth_token', guestToken);

                state.auth.user = guestUser;
                state.auth.token = guestToken;
                state.auth.isAuthenticated = true;
                state.auth.isLoading = false;
                state.activeView = 'chat';

                this.closeAccountChooser();
                await loadSavedState(guestUser);
                this.unlockApp();
                showToast(`Welcome Explorer #${guestId}! Instant demo session active.`, 'sparkles');
                playSound('success');

                // Non-blocking sync with backend
                fetch('/api/auth/oauth-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(guestUser)
                }).catch(() => {});
            } catch (err) {
                console.error('[Guest Login Error]:', err);
                this.unlockApp();
            }
        },

        async handleDirectLogin(name, email) {
            try {
                this.hideAlert();
                const cleanName = (name || '').trim() || `Explorer #${Math.floor(1000 + Math.random() * 9000)}`;
                const cleanEmail = (email || '').trim().toLowerCase() || `direct_${Date.now().toString(36)}@shiviai.demo`;
                const initials = cleanName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

                const directUser = {
                    name: cleanName,
                    email: cleanEmail,
                    provider: 'email',
                    avatar: initials
                };
                const directToken = `direct_token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                localStorage.removeItem('shivi_signed_out');
                localStorage.setItem('shivi_current_user', JSON.stringify(directUser));
                localStorage.setItem('shivi_active_token', directToken);
                localStorage.setItem('current_user', JSON.stringify(directUser));
                localStorage.setItem('shivi_user', JSON.stringify(directUser));
                localStorage.setItem('auth_token', directToken);
                localStorage.setItem('shivi_auth_token', directToken);

                state.auth.user = directUser;
                state.auth.token = directToken;
                state.auth.isAuthenticated = true;
                state.auth.isLoading = false;
                state.activeView = 'chat';

                this.closeAccountChooser();
                await loadSavedState(directUser);
                this.unlockApp();
                showToast(`Welcome to ShiviAI, ${cleanName}!`, 'sparkles');
                playSound('success');

                fetch('/api/auth/oauth-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(directUser)
                }).catch(() => {});
            } catch (err) {
                console.error('[Direct Login Error]:', err);
                this.showAlert(err.message || 'Direct login failed.', 'error');
            }
        },

        openAccountChooser(provider = 'google') {
            const googleClientId = (state.backendConfig && state.backendConfig.googleClientId) || '';
            const githubClientId = (state.backendConfig && state.backendConfig.githubClientId) || '';
            const redirectUri = this.getDynamicOAuthRedirectUri();

            try {
                // If real Google OAuth credentials exist, redirect with prompt=select_account
                if (provider === 'google' && googleClientId) {
                    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile&prompt=select_account`;
                    window.location.href = googleAuthUrl;
                    return;
                }

                // If real GitHub OAuth credentials exist, redirect with prompt=consent
                if (provider === 'github' && githubClientId) {
                    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(githubClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&prompt=consent`;
                    window.location.href = githubAuthUrl;
                    return;
                }
            } catch (oauthErr) {
                console.warn('[Auth] Dynamic OAuth initiation error:', oauthErr);
                const errorMsg = 'OAuth service unavailable on this link. You can Continue as Guest or sign in with email.';
                showToast(errorMsg, 'alert');
                this.showAlert(errorMsg, 'info');
            }

            // Otherwise, render the sleek Account Chooser prompt modal (Mock / Development Fallback)
            if (!elements.accountChooserModal) return;

            const isGoogle = provider === 'google';
            state.activeOAuthProvider = provider;

            // Update modal header & brand SVG icon
            if (elements.chooserBrandBadge) {
                if (isGoogle) {
                    elements.chooserBrandBadge.innerHTML = `
                        <svg class="chooser-brand-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"/>
                            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                        </svg>
                    `;
                } else {
                    elements.chooserBrandBadge.innerHTML = `
                        <svg class="chooser-brand-icon" viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                        </svg>
                    `;
                }
            }

            if (elements.chooserTitle) {
                elements.chooserTitle.textContent = isGoogle ? 'Choose a Google Account' : 'Choose a GitHub Account';
            }
            if (elements.chooserSubtitle) {
                elements.chooserSubtitle.innerHTML = `to continue to <span class="gradient-text">ShiviAI</span>`;
            }
            if (elements.chooserPromptText) {
                elements.chooserPromptText.textContent = isGoogle
                    ? 'Account Chooser Active • prompt=select_account'
                    : 'Account Consent Active • prompt=consent';
            }
            if (elements.chooserNameLabel) {
                elements.chooserNameLabel.textContent = isGoogle ? 'Google Display Name' : 'GitHub Name / Handle';
            }
            if (elements.chooserAccountLabel) {
                elements.chooserAccountLabel.textContent = isGoogle ? 'Gmail Address' : 'GitHub Username or Email';
            }
            if (elements.chooserAccountIdentifier) {
                elements.chooserAccountIdentifier.placeholder = isGoogle ? 'name@gmail.com' : 'octocat or user@github.com';
            }
            if (elements.btnChooserText) {
                elements.btnChooserText.textContent = isGoogle ? 'Continue with Google' : 'Continue with GitHub';
            }

            // Pre-fill quick accounts
            if (elements.chooserAccountsList) {
                const accounts = isGoogle ? [
                    { name: 'Shivansh Sharma', email: 'shivansh.ai@gmail.com', avatar: 'SS' },
                    { name: 'Alex Morgan', email: 'alex.morgan@gmail.com', avatar: 'AM' }
                ] : [
                    { name: 'Shivansh (shivi-dev)', email: 'shivansh@github.com', avatar: 'https://github.com/github.png' },
                    { name: 'Octocat Developer', email: 'octocat@github.com', avatar: 'https://github.com/octocat.png' }
                ];

                elements.chooserAccountsList.innerHTML = accounts.map((acc, idx) => `
                    <button type="button" class="chooser-account-item" data-idx="${idx}">
                        <div class="chooser-account-avatar">
                            ${acc.avatar.startsWith('http') ? `<img src="${acc.avatar}" alt="${acc.name}" />` : acc.avatar}
                        </div>
                        <div class="chooser-account-details">
                            <div class="chooser-account-name">${acc.name}</div>
                            <div class="chooser-account-email">${acc.email}</div>
                        </div>
                        <i data-lucide="chevron-right" class="chooser-account-chevron"></i>
                    </button>
                `).join('');

                const accountBtns = elements.chooserAccountsList.querySelectorAll('.chooser-account-item');
                accountBtns.forEach((btn, idx) => {
                    btn.addEventListener('click', () => {
                        const selected = accounts[idx];
                        Auth.oauthLogin({
                            name: selected.name,
                            email: selected.email,
                            provider: provider,
                            avatar: selected.avatar
                        });
                    });
                });
            }

            elements.accountChooserModal.style.display = 'flex';
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        },

        closeAccountChooser() {
            if (elements.accountChooserModal) {
                elements.accountChooserModal.style.display = 'none';
            }
        },

        async forgotPassword(email) {
            if (elements.btnAuthForgotSubmit) elements.btnAuthForgotSubmit.classList.add('loading');
            this.hideAlert();

            try {
                const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json().catch(() => ({}));
                this.showAlert(data.message || 'If an account exists, a reset link was sent.', 'success');
                showToast('Reset link sent to ' + email, 'send');
            } catch (err) {
                this.showAlert('Could not send reset instructions. Please try again.', 'error');
            } finally {
                if (elements.btnAuthForgotSubmit) elements.btnAuthForgotSubmit.classList.remove('loading');
            }
        },

        async logout(e) {
            if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
            }

            try {
                if (state.auth && state.auth.token) {
                    fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.auth.token}`
                        }
                    }).catch(() => {});
                }
            } catch (err) {}

            // Immediately halt any voice audio or generation
            try {
                stopSpeakingVoice();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            } catch (vErr) {}

            const savedTheme = localStorage.getItem('theme') || 
                               localStorage.getItem('shivi_theme') || 
                               state.currentTheme || 
                               'cyberpunk';

            // Wipe all user authentication session keys
            const authKeysToRemove = [
                'token',
                'auth_user',
                'isLoggedIn',
                'user',
                'auth',
                'shivi_user',
                'shivi_auth_token',
                'auth_token',
                'current_user',
                'user_data',
                'current_session',
                'user_session',
                'shivi_ai_chat_data_v2',
                'shivi_ai_chat_data_v1'
            ];
            authKeysToRemove.forEach(k => {
                localStorage.removeItem(k);
            });
            sessionStorage.clear();

            localStorage.setItem('shivi_signed_out', 'true');
            localStorage.setItem('theme', savedTheme);
            localStorage.setItem('shivi_theme', savedTheme);

            // ==========================================
            // COMPLETE IN-MEMORY CHAT STATE RESET
            // ==========================================
            state.sessions = [];
            state.currentSessionId = null;
            state.currentAttachments = [];
            state.isGenerating = false;
            if (state.canvas) {
                state.canvas.isOpen = false;
                state.canvas.isFullscreen = false;
                state.canvas.artifact = null;
                state.canvas.currentSlideIndex = 0;
            }

            // Wipe DOM chat elements so nothing leaks on the screen
            if (elements.messagesList) elements.messagesList.innerHTML = '';
            if (elements.historyList) elements.historyList.innerHTML = '';
            if (elements.userInput) {
                elements.userInput.value = '';
                elements.userInput.style.height = 'auto';
            }
            if (elements.charCount) elements.charCount.textContent = '0/4000';
            if (elements.welcomeHero) elements.welcomeHero.style.display = 'flex';
            if (elements.suggestionsBar) elements.suggestionsBar.style.display = 'flex';
            if (elements.attachmentPreviewBar) {
                elements.attachmentPreviewBar.innerHTML = '';
                elements.attachmentPreviewBar.style.display = 'none';
            }
            if (elements.typingIndicator) elements.typingIndicator.style.display = 'none';

            state.auth.token = null;
            state.auth.user = null;
            state.auth.isAuthenticated = false;
            state.auth.isLoading = false;
            state.activeView = 'auth';

            if (elements.userProfileWrapper) {
                elements.userProfileWrapper.classList.remove('open');
            }
            if (elements.settingsModal) {
                elements.settingsModal.classList.remove('active');
                elements.settingsModal.classList.remove('open');
            }
            if (elements.sidebar) {
                elements.sidebar.classList.remove('open');
            }
            if (elements.sidebarBackdrop) {
                elements.sidebarBackdrop.classList.remove('active');
            }

            // Immediately lock on login screen
            this.showAuthGuard();
            this.updateUI();

            showToast('Logged out of ShiviAI', 'log-out');
            playSound('click');
        },

        async checkSession() {
            try {
                // 1. Detect OAuth redirect errors (e.g. invalid client ID, redirect_uri_mismatch on deployed link)
                const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
                const hashStr = (typeof window !== 'undefined' && window.location.hash) ? (window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash) : '';
                const hashParams = new URLSearchParams(hashStr);

                const oauthError = urlParams.get('error') || hashParams.get('error') || urlParams.get('error_description') || hashParams.get('error_description');
                if (oauthError) {
                    console.warn('[Auth] OAuth error callback detected in URL:', oauthError);
                    try {
                        history.replaceState(null, '', window.location.pathname);
                    } catch (e) {}
                    const errorMsg = 'OAuth service unavailable on this link. You can Continue as Guest or sign in with email.';
                    showToast(errorMsg, 'alert');
                    this.showAlert(errorMsg, 'info');
                }

                // 2. Direct / Instant Guest link parameter (?guest=1, ?demo=1, ?instant=1)
                if (urlParams.get('guest') === '1' || urlParams.get('demo') === '1' || urlParams.get('instant') === '1') {
                    console.log('[Auth] Instant demo parameter detected in URL');
                    try {
                        history.replaceState(null, '', window.location.pathname);
                    } catch (e) {}
                    await this.handleGuestLogin();
                    return;
                }

                // 3. Check OAuth token callback in window.location.hash
                if (hashStr && hashStr.includes('access_token=')) {
                    try {
                        const accessToken = hashParams.get('access_token');
                        if (accessToken) {
                            const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            if (googleRes.ok) {
                                const profile = await googleRes.json();
                                const userObj = {
                                    name: profile.name || (profile.email ? profile.email.split('@')[0] : 'Explorer'),
                                    email: profile.email,
                                    provider: 'google',
                                    avatar: profile.picture || (profile.name ? profile.name.slice(0, 2).toUpperCase() : 'U')
                                };
                                await this.oauthLogin(userObj);
                                try {
                                    history.replaceState(null, '', window.location.pathname + window.location.search);
                                } catch (e) {}
                                return;
                            } else {
                                const errorMsg = 'OAuth service unavailable on this link. You can Continue as Guest or sign in with email.';
                                showToast(errorMsg, 'alert');
                                this.showAlert(errorMsg, 'info');
                            }
                        }
                    } catch (hashErr) {
                        console.warn('[Auth] Error parsing OAuth token in hash:', hashErr);
                        const errorMsg = 'OAuth service unavailable on this link. You can Continue as Guest or sign in with email.';
                        showToast(errorMsg, 'alert');
                        this.showAlert(errorMsg, 'info');
                    }
                }

                // 4. Check if explicitly signed out
                if (localStorage.getItem('shivi_signed_out') === 'true') {
                    state.auth.user = null;
                    state.auth.token = null;
                    state.auth.isAuthenticated = false;
                    state.auth.isLoading = false;
                    state.sessions = [];
                    state.currentSessionId = null;
                    if (elements.messagesList) elements.messagesList.innerHTML = '';
                    if (elements.historyList) elements.historyList.innerHTML = '';
                    state.activeView = 'auth';
                    this.showAuthGuard();
                    this.updateUI();
                    return;
                }

                // 5. Check for existing session token & stored user
                const token = localStorage.getItem('shivi_active_token') ||
                              localStorage.getItem('auth_token') || 
                              localStorage.getItem('shivi_auth_token') || 
                              sessionStorage.getItem('shivi_auth_token');
                const storedUserRaw = localStorage.getItem('shivi_current_user') ||
                                      localStorage.getItem('current_user') || 
                                      localStorage.getItem('shivi_user');

                if (!token || !storedUserRaw) {
                    // Safe entry guard: Display clean Glassmorphic Auth Portal
                    state.auth.user = null;
                    state.auth.token = null;
                    state.auth.isAuthenticated = false;
                    state.auth.isLoading = false;
                    state.sessions = [];
                    state.currentSessionId = null;
                    if (elements.messagesList) elements.messagesList.innerHTML = '';
                    if (elements.historyList) elements.historyList.innerHTML = '';
                    state.activeView = 'auth';
                    this.showAuthGuard();
                    this.updateUI();
                    return;
                }

                let parsedUser = null;
                try {
                    parsedUser = JSON.parse(storedUserRaw);
                } catch (e) {
                    parsedUser = null;
                }

                if (!parsedUser) {
                    this.showAuthGuard();
                    return;
                }

                // 6. Fast-path for Guest / Direct sessions (zero network latency)
                if (parsedUser.provider === 'guest' || (token && token.startsWith('guest_')) || (token && token.startsWith('direct_'))) {
                    state.auth.user = parsedUser;
                    state.auth.token = token;
                    state.auth.isAuthenticated = true;
                    state.auth.isLoading = false;
                    state.activeView = 'chat';
                    this.unlockApp();
                    return;
                }

                // 7. Verify persistent session token with backend (with safe offline fallback)
                try {
                    const res = await fetch('/api/auth/me', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const data = await res.json();
                        state.auth.user = {
                            name: data.user.name || parsedUser.name || 'Explorer',
                            email: data.user.email || parsedUser.email || '',
                            provider: data.user.provider || parsedUser.provider || 'email',
                            avatar: data.user.avatar || parsedUser.avatar || 'U'
                        };
                        state.auth.token = token;
                        state.auth.isAuthenticated = true;
                        state.auth.isLoading = false;
                        state.activeView = 'chat';
                        this.unlockApp();
                    } else if (parsedUser) {
                        // Offline or local development fallback
                        state.auth.user = parsedUser;
                        state.auth.token = token;
                        state.auth.isAuthenticated = true;
                        state.auth.isLoading = false;
                        state.activeView = 'chat';
                        this.unlockApp();
                    } else {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('shivi_auth_token');
                        localStorage.removeItem('shivi_active_token');
                        localStorage.removeItem('current_user');
                        localStorage.removeItem('shivi_user');
                        localStorage.removeItem('shivi_current_user');
                        sessionStorage.clear();
                        state.auth.user = null;
                        state.auth.token = null;
                        state.auth.isAuthenticated = false;
                        state.auth.isLoading = false;
                        state.sessions = [];
                        state.currentSessionId = null;
                        if (elements.messagesList) elements.messagesList.innerHTML = '';
                        if (elements.historyList) elements.historyList.innerHTML = '';
                        state.activeView = 'auth';
                        this.showAuthGuard();
                        this.updateUI();
                    }
                } catch (err) {
                    if (parsedUser) {
                        state.auth.user = parsedUser;
                        state.auth.token = token;
                        state.auth.isAuthenticated = true;
                        state.auth.isLoading = false;
                        state.activeView = 'chat';
                        this.unlockApp();
                    } else {
                        state.auth.user = null;
                        state.auth.token = null;
                        state.auth.isAuthenticated = false;
                        state.auth.isLoading = false;
                        state.sessions = [];
                        state.currentSessionId = null;
                        if (elements.messagesList) elements.messagesList.innerHTML = '';
                        if (elements.historyList) elements.historyList.innerHTML = '';
                        state.activeView = 'auth';
                        this.showAuthGuard();
                        this.updateUI();
                    }
                }
            } catch (fatalSessionErr) {
                console.error('[Auth Guard Exception]:', fatalSessionErr);
                state.auth.user = null;
                state.auth.token = null;
                state.auth.isAuthenticated = false;
                state.auth.isLoading = false;
                state.activeView = 'auth';
                this.showAuthGuard();
                this.updateUI();
            }
        }
    };

    // ==========================================
    // AUDIO SYNTHESIZER (WEB AUDIO API)
    // ==========================================
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!state.sfxEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const vol = state.sfxVolume * 0.15;

            if (type === 'send') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(580, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'receive') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.08);
                osc.frequency.setValueAtTime(783.99, now + 0.16);
                gain.gain.setValueAtTime(vol * 0.8, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc.start(now);
                osc.stop(now + 0.28);
            } else if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
                gain.gain.setValueAtTime(vol * 0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'clear') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
                gain.gain.setValueAtTime(vol * 0.7, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) {
            console.warn('Audio effect error:', e);
        }
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    function showToast(message, icon = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        
        if (window.lucide) {
            lucide.createIcons();
        }

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(15px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==========================================
    // LOCAL STORAGE & PERSISTENCE
    // ==========================================
    const getChatStorageKey = (user) => {
        if (!user || (!user.email && !user.id)) return 'shivi_chats_guest';
        // Normalize email or id to safe key
        const identifier = (user.email || user.id || '').toLowerCase().trim();
        return `shivi_chats_${identifier.replace(/[^a-z0-9]/g, '_')}`;
    };

    async function loadSavedState(targetUser = null) {
        try {
            const standaloneTheme = localStorage.getItem('shivi_selected_theme') || localStorage.getItem('shivi_theme') || localStorage.getItem('theme') || localStorage.getItem('color-mode');
            const currentUser = targetUser || (state.auth && state.auth.user ? state.auth.user : null);
            const storageKey = getChatStorageKey(currentUser);

            // Clean up any old in-memory sessions before restoring
            state.sessions = [];
            state.currentSessionId = null;

            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const data = JSON.parse(raw);
                state.sessions = Array.isArray(data.sessions) ? data.sessions : [];
                state.currentSessionId = data.currentSessionId || null;
                state.currentPersona = data.currentPersona || 'companion';
                state.currentTheme = standaloneTheme || data.currentTheme || 'midnight';
                state.customThemeColors = Object.assign({
                    bgMain: '#09090b',
                    bgSecondary: '#121215',
                    bgCard: '#18181c',
                    primary: '#f4f4f5',
                    userBubble: '#27272a',
                    aiBubble: '#18181c',
                    textPrimary: '#f4f4f5',
                    textMuted: '#71717a',
                    border: '#52525b'
                }, data.customThemeColors || {});
                state.currentFont = data.currentFont || 'poppins';
                state.sfxEnabled = data.sfxEnabled !== undefined ? data.sfxEnabled : true;
                state.voiceEnabled = (window.voiceService && window.voiceService.isVoiceEnabled !== undefined)
                    ? window.voiceService.isVoiceEnabled
                    : (data.voiceEnabled !== undefined ? !!data.voiceEnabled : true);
                state.speechRate = data.speechRate || 1.0;
                state.sfxVolume = data.sfxVolume !== undefined ? data.sfxVolume : 0.5;
                state.brainProvider = data.brainProvider || (data.engineMode === 'customApi' ? 'gemini' : 'builtin');
                state.imageProvider = data.imageProvider || 'pollinations';
                state.imageApiKey = data.imageApiKey || '';
                state.defaultImageStyle = data.defaultImageStyle || 'vivid';
                state.defaultImageSize = data.defaultImageSize || '1024x1024';
                
                state.apiKeys = Object.assign({
                    gemini: data.apiKey || '',
                    groq: '',
                    openai: '',
                    openrouter: ''
                }, data.apiKeys || {});

                state.apiModels = Object.assign({
                    gemini: 'gemini-1.5-flash',
                    groq: 'llama-3.3-70b-versatile',
                    openai: 'gpt-4o-mini',
                    openrouter: 'google/gemini-2.0-flash-exp:free'
                }, data.apiModels || {});

                state.systemInstructions = data.systemInstructions || state.systemInstructions;

                if (Array.isArray(data.knowledgeBase) && data.knowledgeBase.length > 0) {
                    state.knowledgeBase = data.knowledgeBase;
                } else {
                    await fetchDefaultKnowledgeFile();
                }
            } else {
                if (standaloneTheme) {
                    state.currentTheme = standaloneTheme;
                }
                await fetchDefaultKnowledgeFile();
            }
        } catch (e) {
            console.error('Error loading saved state:', e);
            state.sessions = [];
            state.currentSessionId = null;
            state.knowledgeBase = JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_BASE));
        }

        // Fetch backend server status & .env keys
        await fetchBackendConfig();

        // Apply theme & font to HTML root
        const activeTheme = state.currentTheme || 'dark';
        document.documentElement.setAttribute('data-theme', activeTheme);
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add(activeTheme === 'daylight' ? 'theme-light' : 'theme-dark');
        if (document.body) document.body.classList.add('dark');
        document.documentElement.setAttribute('data-font', state.currentFont);
        try {
            localStorage.setItem('theme', activeTheme);
            localStorage.setItem('shivi_theme', activeTheme);
            localStorage.setItem('color-mode', activeTheme);
        } catch (e) {}

        if (state.currentTheme === 'custom') {
            applyCustomThemeVariables(state.customThemeColors);
        } else {
            clearCustomThemeVariables();
        }
        updateThemeUI();
        updateFontUI();
        updatePersonaUI();
        updateSfxIcon();
        updateVoiceIcon();
        updateBrainUIBadges();

        // If authenticated, ensure session exists for this user
        if (state.auth && state.auth.isAuthenticated) {
            if (!state.sessions.length) {
                createNewSession();
            } else if (!state.currentSessionId || !state.sessions.find(s => s.id === state.currentSessionId)) {
                state.currentSessionId = state.sessions[0].id;
            }
            renderHistoryList();
            renderCurrentChat();
        } else {
            // Unauthenticated view: keep screen completely clean
            if (elements.messagesList) elements.messagesList.innerHTML = '';
            if (elements.historyList) elements.historyList.innerHTML = '';
            if (elements.welcomeHero) elements.welcomeHero.style.display = 'flex';
        }
    }

    async function fetchBackendConfig() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                state.backendConfig.isOnline = true;
                state.backendConfig.keysConfigured = data.keysConfigured || {};
                state.backendConfig.maskedKeys = data.maskedKeys || {};
                state.backendConfig.imageProvider = data.imageProvider || 'pollinations';
                state.backendConfig.googleClientId = data.googleClientId || '';
                state.backendConfig.githubClientId = data.githubClientId || '';

                // If backend has an image key or provider configured, ensure state reflects it
                if (data.imageProvider && state.imageProvider === 'pollinations' && data.imageProvider !== 'pollinations') {
                    state.imageProvider = data.imageProvider;
                }

                // If backend has a key configured and local is builtin, switch to active backend provider
                if (state.brainProvider === 'builtin') {
                    if (data.keysConfigured.gemini) state.brainProvider = 'gemini';
                    else if (data.keysConfigured.groq) state.brainProvider = 'groq';
                    else if (data.keysConfigured.openai) state.brainProvider = 'openai';
                    else if (data.keysConfigured.openrouter) state.brainProvider = 'openrouter';
                }
            }
        } catch (e) {
            state.backendConfig.isOnline = false;
        }
    }

    async function saveToBackendEnv() {
        const provider = state.brainProvider;
        const key = elements.brainApiKeyInput.value.trim();
        if (provider === 'builtin') {
            showToast('Select an AI provider before saving to .env', 'info');
            return;
        }

        const payload = { defaultProvider: provider };
        if (provider === 'gemini') payload.geminiKey = key;
        if (provider === 'groq') payload.groqKey = key;
        if (provider === 'openai') payload.openaiKey = key;
        if (provider === 'openrouter') payload.openrouterKey = key;

        try {
            showToast('Saving to server .env...', 'loader');
            const res = await fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                state.apiKeys[provider] = key;
                saveState();
                showToast(`✓ API Key saved to server .env permanently!`, 'check-circle');
                playSound('receive');
                await fetchBackendConfig();
                renderBrainHubUI();
            } else {
                throw new Error(data.error || 'Failed to save to .env');
            }
        } catch (err) {
            showToast(`Error saving .env: ${err.message}`, 'alert-triangle');
        }
    }

    async function fetchDefaultKnowledgeFile() {
        try {
            const res = await fetch('./knowledge.json');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.knowledgeBase) && data.knowledgeBase.length > 0) {
                    state.knowledgeBase = data.knowledgeBase;
                    if (data.systemInstructions) {
                        state.systemInstructions = data.systemInstructions;
                    }
                    return;
                }
            }
        } catch (e) {
            console.warn('Using embedded fallback knowledge items');
        }
        state.knowledgeBase = JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_BASE));
    }

    function saveState() {
        try {
            const currentUser = (state.auth && state.auth.user) ? state.auth.user : null;
            const storageKey = getChatStorageKey(currentUser);
            localStorage.setItem(storageKey, JSON.stringify({
                sessions: state.sessions,
                currentSessionId: state.currentSessionId,
                currentPersona: state.currentPersona,
                currentTheme: state.currentTheme,
                customThemeColors: state.customThemeColors,
                currentFont: state.currentFont,
                sfxEnabled: state.sfxEnabled,
                voiceEnabled: state.voiceEnabled,
                speechRate: state.speechRate,
                sfxVolume: state.sfxVolume,
                brainProvider: state.brainProvider,
                imageProvider: state.imageProvider,
                imageApiKey: state.imageApiKey,
                defaultImageStyle: state.defaultImageStyle,
                defaultImageSize: state.defaultImageSize,
                apiKeys: state.apiKeys,
                apiModels: state.apiModels,
                systemInstructions: state.systemInstructions,
                knowledgeBase: state.knowledgeBase
            }));
            if (state.currentTheme) {
                localStorage.setItem('shivi_theme', state.currentTheme);
                localStorage.setItem('theme', state.currentTheme);
                localStorage.setItem('color-mode', state.currentTheme);
            }
            updateBrainUIBadges();
        } catch (e) {
            console.error('Error saving state:', e);
        }
    }

    function getCurrentSession() {
        return state.sessions.find(s => s.id === state.currentSessionId);
    }

    function createNewSession(title = 'New Conversation') {
        const newSession = {
            id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            title: title,
            createdAt: new Date().toISOString(),
            messages: []
        };
        state.sessions.unshift(newSession);
        state.currentSessionId = newSession.id;
        saveState();
        renderHistoryList();
        renderCurrentChat();
        return newSession;
    }

    // ==========================================
    // MARKDOWN & CODE HIGHLIGHTER
    // ==========================================
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderMarkdown(text) {
        if (!text) return '';

        const codeBlocks = [];
        let parsed = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const index = codeBlocks.length;
            const cleanLang = lang.trim() || 'code';
            const encodedCode = escapeHtml(code.trim());
            
            codeBlocks.push(`
                <div class="code-container">
                    <div class="code-header">
                        <span class="code-lang">${cleanLang}</span>
                        <button class="copy-code-btn" data-code="${escapeHtml(code.trim())}">
                            <i data-lucide="copy"></i>
                            <span>Copy</span>
                        </button>
                    </div>
                    <pre><code class="language-${cleanLang}">${encodedCode}</code></pre>
                </div>
            `);
            return `__CODE_BLOCK_${index}__`;
        });

        // Headers
        parsed = parsed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        parsed = parsed.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        parsed = parsed.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Blockquotes
        parsed = parsed.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

        // Markdown Images: ![alt](url)
        parsed = parsed.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/g, (match, alt, url) => {
            const cleanAlt = escapeHtml(alt || 'Generated Image');
            return `
                <div class="ai-generated-image-card" style="margin: 12px 0;">
                    <div class="image-media-wrapper">
                        <img src="${url}" alt="${cleanAlt}" loading="lazy" class="generated-ai-img clickable-preview" data-src="${url}" data-prompt="${cleanAlt}" title="Click to open Fullscreen Lightbox">
                        <div class="image-media-overlay">
                            <button type="button" class="image-overlay-btn download-img-btn" data-url="${url}" data-prompt="${cleanAlt}">
                                <i data-lucide="download"></i>
                                <span>Download</span>
                            </button>
                            <button type="button" class="image-overlay-btn copy-img-url-btn" data-url="${url}">
                                <i data-lucide="link"></i>
                                <span>Copy Link</span>
                            </button>
                        </div>
                    </div>
                    <div class="image-media-footer">
                        <div class="image-media-prompt-row">
                            <span class="image-media-prompt-text">✨ <strong>Prompt:</strong> ${cleanAlt}</span>
                            <span class="image-engine-tag">POLLINATIONS · FLUX</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Markdown Links: [text](url)
        parsed = parsed.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/g, (match, linkText, url) => {
            const isPptDownload = url.endsWith('.pptx') || linkText.toLowerCase().includes('.pptx') || linkText.toLowerCase().includes('presentation');
            if (isPptDownload) {
                return `<a href="${url}" class="download-ppt-btn" download style="display: inline-flex; margin: 8px 0; text-decoration: none;"><i data-lucide="download"></i> <span>${escapeHtml(linkText)}</span></a>`;
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link" style="color: var(--secondary); text-decoration: underline;">${escapeHtml(linkText)}</a>`;
        });

        // Bold & Italic
        parsed = parsed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Inline Code
        parsed = parsed.replace(/`([^`]+)`/g, (match, inlineCode) => {
            return `<code>${escapeHtml(inlineCode)}</code>`;
        });

        // Unordered Lists
        parsed = parsed.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
        parsed = parsed.replace(/(<li>.*<\/li>)/gims, (match) => `<ul>${match}</ul>`);
        parsed = parsed.replace(/<\/ul>\s*<ul>/g, '');

        // Tables parser
        if (parsed.includes('|')) {
            const lines = parsed.split('\n');
            let inTable = false;
            let tableHtml = '';
            const newLines = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('|') && line.endsWith('|')) {
                    if (line.includes('---')) continue;
                    const cells = line.split('|').slice(1, -1).map(c => c.trim());
                    if (!inTable) {
                        inTable = true;
                        tableHtml = '<table><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
                    } else {
                        tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
                    }
                } else {
                    if (inTable) {
                        tableHtml += '</tbody></table>';
                        newLines.push(tableHtml);
                        inTable = false;
                        tableHtml = '';
                    }
                    newLines.push(line);
                }
            }
            if (inTable) {
                tableHtml += '</tbody></table>';
                newLines.push(tableHtml);
            }
            parsed = newLines.join('\n');
        }

        // Paragraphs & Line Breaks
        parsed = parsed.replace(/\n\n+/g, '</p><p>');
        parsed = `<p>${parsed}</p>`;
        parsed = parsed.replace(/<p><\/p>/g, '');
        parsed = parsed.replace(/<p>(<h[1-3]>.*?<\/h[1-3]>)<\/p>/g, '$1');
        parsed = parsed.replace(/<p>(<blockquote>.*?<\/blockquote>)<\/p>/g, '$1');
        parsed = parsed.replace(/<p>(<table>.*?<\/table>)<\/p>/g, '$1');
        parsed = parsed.replace(/<p>(<ul>.*?<\/ul>)<\/p>/g, '$1');
        parsed = parsed.replace(/\n/g, '<br>');

        // Re-inject code blocks
        codeBlocks.forEach((block, i) => {
            parsed = parsed.replace(`__CODE_BLOCK_${i}__`, block);
            parsed = parsed.replace(`<p>__CODE_BLOCK_${i}__</p>`, block);
        });

        return parsed;
    }

    // ==========================================
    // BRAIN KNOWLEDGE BASE RETRIEVAL (RAG)
    // ==========================================
    function retrieveBrainKnowledge(userQuery) {
        if (!state.knowledgeBase || !state.knowledgeBase.length) return '';
        const q = userQuery.toLowerCase();
        const queryWords = q.split(/\s+/).filter(w => w.length > 2);
        
        const matched = state.knowledgeBase.filter(item => {
            const title = (item.title || '').toLowerCase();
            const content = (item.content || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const tags = (item.tags || []).map(t => t.toLowerCase());

            if (title.includes(q) || content.includes(q) || category.includes(q)) return true;
            if (tags.some(t => q.includes(t))) return true;

            const matchCount = queryWords.filter(word => 
                title.includes(word) || content.includes(word) || tags.some(t => t.includes(word))
            ).length;

            return matchCount >= 1;
        });

        if (!matched.length) {
            if (/brain|knowledge|memory|facts|store|data|api|shivi/i.test(userQuery)) {
                return state.knowledgeBase.slice(0, 4).map(i => `[Knowledge: ${i.title}] (${i.category}): ${i.content}`).join('\n\n');
            }
            return '';
        }

        return matched.slice(0, 5).map(i => `[Knowledge: ${i.title}] (${i.category}): ${i.content}`).join('\n\n');
    }

    // ==========================================
    // BUILT-IN INTELLIGENT SIMULATION ENGINE
    // ==========================================
    function generateShiviResponse(userText, knowledgeContext = '') {
        const text = userText.trim();
        const lower = text.toLowerCase();

        // Persona prefix phrasing
        const personaCfg = PERSONA_CONFIG[state.currentPersona] || PERSONA_CONFIG.companion;
        const prefix = personaCfg.prefix || '✨ ';

        // 0. Deterministic Identity Check
        if (isIdentityQuery(text)) {
            return IDENTITY_DIRECT_REPLY;
        }

        // 1. Math Calculation Evaluator (arithmetic, functions, powers, percentages)
        const mathMatch = text.match(/^(?:calculate|compute|what is|solve)?\s*([0-9\.\s\+\-\*\/\^\(\)\%\,\e\pi]+)\s*\??$/i);
        if (mathMatch && mathMatch[1] && /[0-9]/.test(mathMatch[1]) && /[\+\-\*\/\^\%]/.test(mathMatch[1])) {
            try {
                let expr = mathMatch[1]
                    .replace(/\^/g, '**')
                    .replace(/pi/gi, 'Math.PI')
                    .replace(/e/gi, 'Math.E');
                if (/^[0-9\.\s\+\-\*\/\(\)\%Math\.PIE]+$/.test(expr)) {
                    // eslint-disable-next-line no-eval
                    const result = Function(`"use strict"; return (${expr})`)();
                    return `${prefix}### 🔢 Math Calculation\n\n**Expression:** \`${mathMatch[1].trim()}\`\n**Answer:** **\`${result}\`**\n\n*(Calculated with Shivi Math Engine)*`;
                }
            } catch (e) {
                // fallback
            }
        }

        // 2. If specific knowledge is retrieved from Brain, use it directly
        if (knowledgeContext && (/what|how|explain|who|tell|recall|brain|knowledge|memory|api|store|file/i.test(lower))) {
            return prefix + `### 🧠 Retrieved from Shivi Brain Knowledge Base\n\nBased on stored memory records:\n\n${knowledgeContext}\n\n*Would you like to update, export, or add new facts to my Brain?*`;
        }

        // 3. Quantum Computing
        if (/quantum/i.test(lower)) {
            return prefix + `### 🌌 Quantum Computing: The Magical Coin Analogy
Imagine you flip a regular coin on a table. It lands on either **Heads (1)** or **Tails (0)**. That is how classic computers calculate.

Now imagine spinning that coin furiously on a wooden table. While it spins, is it Heads or Tails? **It is both at the same time!**

This phenomenon is called **Superposition**.
- **Qubits** can exist in multiple states simultaneously.
- When multiple spinning coins synchronize through **Quantum Entanglement**, they explore trillions of combinations instantaneously.

> 🚀 **Real-World Impact:** Quantum computers can simulate molecular bonds for cancer drugs in seconds—a task that would take a supercomputer 10,000 years!`;
        }

        // 4. UI & Glassmorphism
        if (/glassmorphism|card|css|html|component/i.test(lower)) {
            return prefix + `### 💎 Modern Glassmorphic Card Component
Here is a production-grade CSS glassmorphism implementation:

\`\`\`html
<div class="glass-card">
  <div class="glass-glow"></div>
  <h3 class="glass-title">Next-Gen Interface</h3>
  <p class="glass-desc">Ultra-clean backdrop blur with ambient reflection.</p>
  <button class="action-btn">Explore Now →</button>
</div>
\`\`\`

\`\`\`css
.glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
  color: #f8fafc;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
}

.action-btn {
  padding: 10px 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8b5cf6, #06b6d4);
  color: #fff;
  border: none;
  font-weight: 600;
  cursor: pointer;
}
\`\`\`

> 💡 **Design Tip:** Glassmorphism looks best over vibrant ambient gradients!`;
        }

        // 5. Code & Programming helpers
        if (/write (a|an)?\s*(code|script|function|program|class)|python|javascript|html|react|node|c\+\+|sql|debug|algorithm/i.test(lower)) {
            return prefix + `### 🛠️ High-Performance JavaScript / Python Utility

\`\`\`javascript
/**
 * Creates a debounced function delaying invocation until 'wait' ms elapses.
 */
function debounce(func, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Creates a throttled function invoked at most once per 'limit' ms.
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
\`\`\`

> 💡 **Pro-Tip:** Connect **Google Gemini** or **Groq Cloud** in the **Brain Hub (🧠)** to generate custom code in any programming language for any task!`;
        }

        // 6. Startup Ideas
        if (/startup|ideas|climate|business|innovation/i.test(lower)) {
            return prefix + `### 🚀 5 Disruptive AI x Climate Tech Startup Concepts

| # | Concept Name | Core AI Mechanism | Market Value Proposition |
|---|--------------|-------------------|--------------------------|
| **1** | **GridPulse AI** | Real-time predictive load balancing | Predicts solar/wind surges to eliminate grid wastage. |
| **2** | **BioEnzyme Designer** | Deep generative molecular models | Synthesizes enzymes that digest plastics 100x faster. |
| **3** | **AeroReforest** | Autonomous drone computer vision | Precision seed-bombing for 95% sapling survival. |
| **4** | **CarbonLedger Agent** | Multi-modal OCR + LLM supply audits | Tracks Tier 1-3 corporate emissions automatically. |
| **5** | **AgriSense Hyperlocal** | Thermal satellite imagery + LLM alerts | Delivers micro-irrigation advice saving 40% water. |

Which concept would you like to build an MVP blueprint for?`;
        }

        // 7. Productivity
        if (/productivity|habits|focus|routine|energy/i.test(lower)) {
            return prefix + `### ⚡ 3 High-Leverage Micro-Habits for Elite Productivity

1. **The 90-Minute "Deep Horizon" Block**:
   - Protect your first 90 minutes of the morning for your single most demanding task before checking emails or social feeds.
2. **The "Rule of 3" Intentionality Filter**:
   - At the start of the day, write down only **3 outcomes** that will make today an absolute victory.
3. **Digital Sunset Protocol**:
   - Disconnect from blue-light screens 45 minutes before sleep to protect REM and restorative slow-wave rest.

> *"Focus is not about saying yes to what you want to do; it is about saying no to the hundred other good ideas."*`;
        }

        // 8. Jokes
        if (/joke|funny|laugh|brighten/i.test(lower)) {
            const jokes = [
                `Why do programmers prefer dark mode?\n\nBecause **light attracts bugs!** 🐛💻`,
                `There are 10 types of people in the world:\n\nThose who understand binary, and those who don't! 🤖`,
                `A SQL query walks into a bar, walks up to two tables and asks...\n\n*"Can I join you?"* 📊`,
                `Why did the JavaScript developer wear glasses?\n\nBecause they didn't **C#**! 👓`
            ];
            return prefix + jokes[Math.floor(Math.random() * jokes.length)];
        }

        // 9. Greetings
        if (/^(hi|hello|hey|greetings|hola|namaste|sup|yo)\b/i.test(lower)) {
            return `${prefix}Hello there! 👋 I am **Shivi AI**, your next-generation intelligent companion.\n\nHow can I help you today? You can ask me to:\n- 💡 Explain any topic or brainstorm ideas\n- 💻 Write, debug, or optimize code\n- 🧠 Query your custom Brain Knowledge Base\n- 🔑 Connect **Google Gemini, Groq, or OpenAI** via the **Brain Hub** for unlimited real-time intelligence!`;
        }

        // 10. Comprehensive General Fallback with Guidance
        return prefix + `### 💡 Analysis: ${escapeHtml(userText)}

Here is a structured overview:

1. **Key Insights**:
   - **Context**: Exploring **${escapeHtml(userText)}** requires considering the primary goals, key requirements, and best practices.
   - **Implementation**: Formulate a structured step-by-step approach to validate each assumption.

2. **Next Steps**:
   - For real-time, comprehensive answers to any question, connect a free API key in **Brain Hub (🧠)** (e.g. **Google Gemini** or **Groq Cloud**).

*Would you like me to dive deeper into technical specifications, write code, or explore other perspectives?*`;
    }

    // ==========================================
    // LIVE AI LLM API INTEGRATIONS (GEMINI / GROQ / OPENAI / OPENROUTER)
    // ==========================================
    async function queryLiveAI(userText, knowledgeContext = '', history = [], attachments = []) {
        // Layer 1: Deterministic Identity Interceptor (Instant 100% Reliable Override)
        if (isIdentityQuery(userText)) {
            return IDENTITY_DIRECT_REPLY;
        }

        const provider = state.brainProvider;
        const key = (state.apiKeys[provider] || '').trim();

        const personaCfg = PERSONA_CONFIG[state.currentPersona] || PERSONA_CONFIG.companion;
        const systemPromptText = `You are ShiviAI, an intelligent companion and creative presentation engine.
Identity Directive:
- You were conceived, designed, and developed by Shivansh (Shivi).
- If asked about your origin, author, creator, or developer in any language (English, Hindi, Hinglish), always clearly state that you were made by Shivansh (Shivi).
- Never claim to be created by OpenAI, Google, or any third party.

Active Operating Mode: ${personaCfg.name}
Tone & Style: ${personaCfg.prompt}

Global Brain Instructions: ${state.systemInstructions || 'Be deeply empathetic, warm, encouraging, and helpful.'}
${knowledgeContext ? `\n[RELEVANT BRAIN KNOWLEDGE CONTEXT]:\n${knowledgeContext}\n` : ''}`;

        // 1. First, attempt calling the backend server endpoint (/api/chat)
        try {
            const serverRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    history: history,
                    provider: provider,
                    apiKey: key,
                    model: state.apiModels[provider],
                    persona: state.currentPersona,
                    systemPrompt: systemPromptText,
                    knowledgeContext: knowledgeContext,
                    attachments: (attachments || []).map(att => ({
                        name: att.name,
                        type: att.type || 'application/octet-stream',
                        size: att.size || 0,
                        content_or_url: att.content_or_url || att.content || att.url || att.previewUrl || ''
                    }))
                })
            });

            if (serverRes.ok) {
                const serverData = await serverRes.json();
                if (serverData.success && serverData.reply) {
                    return serverData.reply;
                }
                if (serverData.error) {
                    throw new Error(serverData.error);
                }
            } else {
                const errData = await serverRes.json().catch(() => ({}));
                if (errData.error) {
                    throw new Error(errData.error);
                }
            }
        } catch (serverErr) {
            console.warn('[Backend /api/chat error, attempting browser direct fallback]:', serverErr.message);
            // If the server explicitly returned an error message from the LLM provider, rethrow it
            if (serverErr.message && !serverErr.message.includes('fetch') && !serverErr.message.includes('Failed to fetch')) {
                throw serverErr;
            }
        }

        // 2. Direct Browser Client Fetch Fallback (if server not used or running on static file)
        if (!key && provider !== 'openrouter') {
            throw new Error(`API Key for ${provider.toUpperCase()} is missing. Please add it in the Brain Hub or .env file.`);
        }

        // Google Gemini API (Direct)
        if (provider === 'gemini') {
            const model = state.apiModels.gemini || 'gemini-1.5-flash';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            
            const contents = [];
            const recent = history.slice(-6);
            recent.forEach(m => {
                if (m.content) {
                    contents.push({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    });
                }
            });
            if (!contents.length || contents[contents.length - 1].role !== 'user') {
                contents.push({ role: 'user', parts: [{ text: userText }] });
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPromptText }]
                    },
                    contents: contents
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Gemini API Error (${response.status})`);
            }

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!reply) throw new Error('No response text received from Gemini API');
            return reply;
        }

        // OpenAI API (Direct)
        if (provider === 'openai') {
            const model = state.apiModels.openai || 'gpt-4o-mini';
            const endpoint = 'https://api.openai.com/v1/chat/completions';
            
            const messages = [{ role: 'system', content: systemPromptText }];
            const recent = history.slice(-6);
            recent.forEach(m => {
                if (m.content) {
                    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
                }
            });
            if (messages[messages.length - 1].role !== 'user') {
                messages.push({ role: 'user', content: userText });
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `OpenAI API Error (${response.status})`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response returned from OpenAI.';
        }

        // Groq Cloud API (Direct)
        if (provider === 'groq') {
            const model = state.apiModels.groq || 'llama-3.3-70b-versatile';
            const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            
            const messages = [{ role: 'system', content: systemPromptText }];
            const recent = history.slice(-6);
            recent.forEach(m => {
                if (m.content) {
                    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
                }
            });
            if (messages[messages.length - 1].role !== 'user') {
                messages.push({ role: 'user', content: userText });
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Groq API Error (${response.status})`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response returned from Groq.';
        }

        // OpenRouter API (Direct)
        if (provider === 'openrouter') {
            const model = state.apiModels.openrouter || 'google/gemini-2.0-flash-exp:free';
            const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

            const messages = [{ role: 'system', content: systemPromptText }];
            const recent = history.slice(-6);
            recent.forEach(m => {
                if (m.content) {
                    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
                }
            });
            if (messages[messages.length - 1].role !== 'user') {
                messages.push({ role: 'user', content: userText });
            }

            const headers = {
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'Shivi AI'
            };
            if (key) headers['Authorization'] = `Bearer ${key}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: model,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `OpenRouter API Error (${response.status})`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'No response returned from OpenRouter.';
        }

        throw new Error(`Unsupported engine provider: ${provider}`);
    }

    // ==========================================
    // TEXT-TO-SPEECH (TTS) & REAL-TIME VOICE COMPANION
    // ==========================================
    function stopSpeakingVoice() {
        if (window.voiceService) {
            window.voiceService.stop();
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        state.isSpeaking = false;
        updateSpeakingIndicatorUI(false, null);
    }

    function updateSpeakingIndicatorUI(speaking = null, msgId = null) {
        const isSpeaking = speaking !== null ? !!speaking : (window.voiceService ? window.voiceService.isSpeaking : state.isSpeaking);
        state.isSpeaking = isSpeaking;

        // Header Stop Button
        if (elements.stopSpeakingBtn) {
            elements.stopSpeakingBtn.style.display = isSpeaking ? 'inline-flex' : 'none';
        }

        // Floating Speaking Indicator in Chat
        if (elements.floatingSpeakingIndicator) {
            elements.floatingSpeakingIndicator.style.display = isSpeaking ? 'flex' : 'none';
        }

        // Update speaker action buttons across message cards
        const activeMsgId = msgId || (window.voiceService ? window.voiceService.currentlySpeakingMsgId : null);
        document.querySelectorAll('.speak-msg-btn').forEach(btn => {
            const thisMsgId = btn.getAttribute('data-msg-id');
            const isThisSpeaking = isSpeaking && activeMsgId && thisMsgId === activeMsgId;
            btn.classList.toggle('speaking', !!isThisSpeaking);
            const icon = btn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isThisSpeaking ? 'square' : 'volume-2');
            }
            const label = btn.querySelector('.speak-btn-label');
            if (label) {
                label.textContent = isThisSpeaking ? 'Stop' : 'Listen';
            }
            btn.setAttribute('title', isThisSpeaking ? 'Stop voice readout' : 'Read Aloud');
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function speakText(text, msgId = null) {
        if (!text) return;
        if (window.voiceService) {
            window.voiceService.speak(text, () => {
                updateSpeakingIndicatorUI(false, null);
            }, msgId);
            updateSpeakingIndicatorUI(true, msgId);
            return;
        }

        // Fallback for standalone speech synthesis
        if (!('speechSynthesis' in window)) return;
        stopSpeakingVoice();

        const cleanSpokenText = text
            .replace(/```[\s\S]*?```/g, 'Code snippet sent in chat.')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[*#_>|]/g, ' ')
            .trim();

        if (!cleanSpokenText) return;

        const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
        utterance.rate = state.speechRate || 1.05;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.lang.startsWith('en')));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
            state.isSpeaking = true;
            updateSpeakingIndicatorUI(true, msgId);
        };

        utterance.onend = () => {
            state.isSpeaking = false;
            updateSpeakingIndicatorUI(false, null);
        };

        utterance.onerror = () => {
            state.isSpeaking = false;
            updateSpeakingIndicatorUI(false, null);
        };

        window.speechSynthesis.speak(utterance);
    }

    // ==========================================
    // SPEECH-TO-TEXT (STT) VOICE INPUT WITH NATURAL PAUSE AUTO-SEND
    // ==========================================
    let recognition = null;

    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return null;

        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
            stopSpeakingVoice();
            state.isRecording = true;
            if (elements.micBtn) elements.micBtn.classList.add('recording');
            showToast('Listening... Speak now', 'mic');
            playSound('click');
        };

        rec.onresult = (event) => {
            stopSpeakingVoice();
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            elements.userInput.value = transcript;
            handleInputChange();
        };

        rec.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            stopRecording();
            showToast(`Voice input: ${event.error}`, 'alert-triangle');
        };

        rec.onend = () => {
            stopRecording();
            if (elements.userInput.value.trim()) {
                elements.userInput.focus();
            }
        };

        return rec;
    }

    function toggleRecording() {
        stopSpeakingVoice(); // Stop voice audio playback immediately when user clicks mic!

        if (state.isRecording) {
            if (window.voiceService) {
                window.voiceService.stopListening();
            } else if (recognition) {
                recognition.stop();
            }
            stopRecording();
            return;
        }

        if (window.voiceService && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            window.voiceService.startListening({
                onStart: () => {
                    state.isRecording = true;
                    if (elements.micBtn) elements.micBtn.classList.add('recording');
                    showToast('Listening... Speak now', 'mic');
                    playSound('click');
                },
                onResult: (currentTotal) => {
                    elements.userInput.value = currentTotal;
                    handleInputChange();
                },
                onFinal: (finalTranscript) => {
                    stopRecording();
                    if (finalTranscript && finalTranscript.trim()) {
                        elements.userInput.value = finalTranscript.trim();
                        handleInputChange();
                        handleSendMessage();
                    }
                },
                onEnd: (finalTranscript) => {
                    stopRecording();
                    if (elements.userInput.value.trim()) {
                        elements.userInput.focus();
                    }
                },
                onError: (err) => {
                    stopRecording();
                    console.warn('[Voice Companion] Recognition notice:', err);
                },
                autoSendOnPause: true
            });
            return;
        }

        // Fallback STT
        if (!recognition) {
            recognition = initSpeechRecognition();
        }

        if (!recognition) {
            showToast('Speech recognition is not supported in this browser.', 'alert-circle');
            return;
        }

        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }

    function stopRecording() {
        state.isRecording = false;
        if (elements.micBtn) elements.micBtn.classList.remove('recording');
        if (window.voiceService) {
            window.voiceService.stopListening();
        }
        stopSpeakingVoice();
    }

    // =========================================================================
    // GEMINI & CHATGPT STYLE LIVE CONTINUOUS VOICE CONVERSATION CONTROLLER
    // =========================================================================

    function populateVoiceSpeakerDropdown(targetLang = null) {
        if (!elements.voiceSpeakerSelect || !window.voiceService) return;
        const currentLang = targetLang || (elements.voiceLanguageSelect ? elements.voiceLanguageSelect.value : 'en-IN');
        const voices = window.voiceService.getAvailableVoices(currentLang);

        elements.voiceSpeakerSelect.innerHTML = '';
        if (!voices || voices.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Default Voice';
            elements.voiceSpeakerSelect.appendChild(opt);
            return;
        }

        voices.forEach(voice => {
            const opt = document.createElement('option');
            opt.value = voice.voiceURI || voice.name;
            opt.textContent = voice.isNeural ? voice.name : `${voice.name} (${voice.lang})`;
            elements.voiceSpeakerSelect.appendChild(opt);
        });

        if (window.voiceService.selectedVoiceKey && window.voiceService.selectedVoiceKey !== 'auto') {
            elements.voiceSpeakerSelect.value = window.voiceService.selectedVoiceKey;
        } else if (window.voiceService.selectedVoice) {
            elements.voiceSpeakerSelect.value = window.voiceService.selectedVoice.voiceURI || window.voiceService.selectedVoice.name;
        }
    }

    function updateLiveVoiceOverlayStateUI(stateName) {
        if (!elements.voiceOrbContainer || !elements.voiceStatusPill) return;

        // 1. Orb Visualizer State
        elements.voiceOrbContainer.className = `voice-orb-container state-${stateName}`;

        // 2. Status Pill Indicator
        elements.voiceStatusPill.className = `voice-status-pill status-${stateName}`;
        const statusMap = {
            listening: 'Listening...',
            thinking: 'Thinking...',
            speaking: 'Speaking...',
            paused: 'Paused',
            idle: 'Ready'
        };
        if (elements.voiceStatusText) {
            elements.voiceStatusText.textContent = statusMap[stateName] || 'Live Voice';
        }

        // 3. Stage Subtitle Hint
        const hintMap = {
            listening: 'Listening to your voice... Speak naturally hands-free.',
            thinking: 'Analyzing context and synthesizing response...',
            speaking: 'Shivi is speaking. Tap orb or Interrupt to barge in.',
            paused: 'Conversation paused. Tap Resume to continue.',
            idle: 'Tap anywhere or speak to begin.'
        };
        if (elements.voiceStageHint) {
            elements.voiceStageHint.textContent = hintMap[stateName] || 'Hands-free two-way conversation mode';
        }

        // 4. Orb Center Icon Dynamic Transition
        if (elements.orbCenterIcon) {
            const iconMap = {
                listening: 'mic',
                thinking: 'sparkles',
                speaking: 'volume-2',
                paused: 'pause',
                idle: 'radio'
            };
            elements.orbCenterIcon.setAttribute('data-lucide', iconMap[stateName] || 'mic');
            if (window.lucide) lucide.createIcons();
        }

        // 5. Update Pause Button Label
        if (elements.voicePauseResumeLabel && elements.voicePauseResumeIcon) {
            const isPaused = stateName === 'paused';
            elements.voicePauseResumeLabel.textContent = isPaused ? 'Resume' : 'Pause';
            elements.voicePauseResumeIcon.setAttribute('data-lucide', isPaused ? 'play' : 'pause');
            if (window.lucide) lucide.createIcons();
        }
    }

    function updateLiveVoiceTranscriptUI(speaker, text, isInterim = false) {
        if (!elements.voiceTranscriptCard || !elements.voiceTranscriptText) return;

        elements.voiceTranscriptCard.classList.remove('user-speaking', 'bot-speaking');
        elements.voiceTranscriptCard.classList.add(speaker === 'user' ? 'user-speaking' : 'bot-speaking');

        if (elements.speakerName) {
            elements.speakerName.textContent = speaker === 'user' ? (isInterim ? 'You (speaking...)' : 'You') : 'Shivi AI';
        }
        if (elements.speakerIcon) {
            elements.speakerIcon.setAttribute('data-lucide', speaker === 'user' ? 'user' : 'sparkles');
            if (window.lucide) lucide.createIcons();
        }

        elements.voiceTranscriptText.textContent = text || (speaker === 'user' ? 'Listening...' : 'Thinking...');
    }

    async function handleLiveVoiceUserUtterance(userSpeech) {
        if (!userSpeech || !userSpeech.trim()) return;
        const cleanUserSpeech = userSpeech.trim();

        // 1. Show user speech in Voice Overlay Subtitle Card
        updateLiveVoiceTranscriptUI('user', cleanUserSpeech, false);

        // 2. Add to active Chat Session in the main UI
        let session = getCurrentSession();
        if (!session) {
            session = createNewSession();
        }

        const userMsg = {
            id: 'msg_' + Date.now(),
            role: 'user',
            content: cleanUserSpeech,
            timestamp: new Date().toISOString()
        };
        session.messages.push(userMsg);
        saveState();

        if (elements.welcomeHero) elements.welcomeHero.style.display = 'none';
        appendMessageToDOM(userMsg, session.messages.length - 1);
        scrollToBottom();

        // 3. Set overlay state to 'thinking'
        if (window.voiceService) {
            window.voiceService.setConversationState('thinking');
        }
        updateLiveVoiceTranscriptUI('assistant', 'Thinking...');

        // 4. Retrieve knowledge base context & chat history
        const knowledgeContext = retrieveBrainKnowledge(cleanUserSpeech);
        const history = (session.messages || []).slice(0, -1).map(m => ({
            role: m.role,
            content: m.content
        }));

        try {
            let aiReply = '';
            // Check identity or query live AI
            if (isIdentityQuery(cleanUserSpeech)) {
                aiReply = IDENTITY_DIRECT_REPLY;
            } else if (state.brainProvider !== 'builtin' || state.backendConfig.isOnline) {
                aiReply = await queryLiveAI(cleanUserSpeech, knowledgeContext, history, []);
            } else if (window.ShiviBrain) {
                const brainRes = await window.ShiviBrain.ask({
                    message: cleanUserSpeech,
                    provider: state.brainProvider,
                    apiKey: state.apiKeys[state.brainProvider],
                    model: state.apiModels[state.brainProvider],
                    persona: state.currentPersona,
                    systemPrompt: state.systemInstructions,
                    history: history,
                    knowledgeContext: knowledgeContext
                });
                aiReply = brainRes.reply;
            } else {
                aiReply = generateShiviResponse(cleanUserSpeech, knowledgeContext);
            }

            if (!aiReply || !aiReply.trim()) {
                aiReply = "I understand. How else can I assist you?";
            }

            // 5. Append AI message to Chat Session
            const aiMsg = {
                id: 'msg_' + Date.now(),
                role: 'assistant',
                content: aiReply,
                timestamp: new Date().toISOString()
            };
            session.messages.push(aiMsg);
            saveState();
            appendMessageToDOM(aiMsg, session.messages.length - 1);
            scrollToBottom();
            playSound('receive');

            // 6. Update Voice Overlay Transcript
            updateLiveVoiceTranscriptUI('assistant', aiReply);

            // 7. Transition to speaking state and speak aloud
            if (window.voiceService && window.voiceService.isContinuousMode) {
                window.voiceService.speak(aiReply, () => {
                    // Trigger continuous re-arming on completion!
                    if (window.voiceService && window.voiceService.isContinuousMode) {
                        window.voiceService.onAiResponseFinished();
                    }
                }, aiMsg.id);
            } else {
                speakText(aiReply, aiMsg.id);
            }

        } catch (err) {
            console.error('[Live Voice] Generation error:', err);
            const errReply = "I ran into a connection issue. Could you please say that again?";
            updateLiveVoiceTranscriptUI('assistant', errReply);
            if (window.voiceService && window.voiceService.isContinuousMode) {
                window.voiceService.speak(errReply, () => {
                    window.voiceService.onAiResponseFinished();
                });
            }
        }
    }

    function openLiveVoiceOverlay() {
        stopSpeakingVoice();
        stopRecording();

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            showToast('Voice mode requires a Web Speech API compatible browser (Chrome, Edge, Safari).', 'alert-circle');
            return;
        }

        if (!elements.voiceOverlay) return;

        // Populate voices & sync language
        const initialLang = elements.voiceLanguageSelect ? elements.voiceLanguageSelect.value : 'en-IN';
        if (window.voiceService) {
            window.voiceService.setLanguage(initialLang);
        }
        populateVoiceSpeakerDropdown(initialLang);

        // Display modal
        elements.voiceOverlay.style.display = 'flex';
        void elements.voiceOverlay.offsetWidth;
        elements.voiceOverlay.classList.add('active');

        // Reset UI text & indicators
        updateLiveVoiceOverlayStateUI('listening');
        updateLiveVoiceTranscriptUI('assistant', 'Shivi is listening. Speak anything to begin...');

        if (elements.voiceMuteMicBtn) {
            elements.voiceMuteMicBtn.classList.remove('active');
            if (elements.voiceMuteLabel) elements.voiceMuteLabel.textContent = 'Mic On';
            if (elements.voiceMuteIcon) elements.voiceMuteIcon.setAttribute('data-lucide', 'mic');
        }

        // Start continuous two-way loop
        if (window.voiceService) {
            window.voiceService.startContinuousMode({
                onUserMessage: async (userSpeech) => {
                    await handleLiveVoiceUserUtterance(userSpeech);
                },
                onTranscriptUpdate: (interimText) => {
                    updateLiveVoiceTranscriptUI('user', interimText, true);
                },
                onStateChange: (newState) => {
                    updateLiveVoiceOverlayStateUI(newState);
                },
                onError: (err) => {
                    console.warn('[Live Voice] Service notice:', err);
                }
            });
        }

        playSound('click');
        showToast('Live Hands-Free Voice Mode Active', 'radio');
    }

    function closeLiveVoiceOverlay() {
        if (!elements.voiceOverlay) return;

        if (window.voiceService) {
            window.voiceService.stopContinuousMode();
        }

        elements.voiceOverlay.classList.remove('active');
        setTimeout(() => {
            elements.voiceOverlay.style.display = 'none';
        }, 300);

        showToast('Live Voice Session Ended', 'phone-off');
    }

    function toggleLiveVoiceMute() {
        if (!window.voiceService) return;
        const isMuted = window.voiceService.toggleMicMute();
        if (elements.voiceMuteMicBtn) {
            elements.voiceMuteMicBtn.classList.toggle('active', isMuted);
            if (elements.voiceMuteLabel) {
                elements.voiceMuteLabel.textContent = isMuted ? 'Mic Muted' : 'Mic On';
            }
            if (elements.voiceMuteIcon) {
                elements.voiceMuteIcon.setAttribute('data-lucide', isMuted ? 'mic-off' : 'mic');
                if (window.lucide) lucide.createIcons();
            }
        }
        showToast(isMuted ? 'Microphone Muted' : 'Microphone Unmuted', isMuted ? 'mic-off' : 'mic');
    }

    function interruptVoicePlayback() {
        if (!window.voiceService) return;
        window.voiceService.interruptBotSpeech();
        updateLiveVoiceOverlayStateUI('listening');
        updateLiveVoiceTranscriptUI('assistant', 'Interrupted. Listening to you...');
        showToast('Interrupted Shivi', 'square');
    }

    function toggleLiveVoicePause() {
        if (!window.voiceService) return;
        if (window.voiceService.conversationState === 'paused') {
            window.voiceService.resumeContinuousListening();
            updateLiveVoiceOverlayStateUI('listening');
            showToast('Voice session resumed', 'play');
        } else {
            window.voiceService.pauseContinuousMode();
            updateLiveVoiceOverlayStateUI('paused');
            showToast('Voice session paused', 'pause');
        }
    }

    function handleOrbClick() {
        if (!window.voiceService) return;
        // If Shivi is currently speaking, clicking the orb barges in (interrupts)
        if (window.voiceService.isSpeaking) {
            interruptVoicePlayback();
            return;
        }
        // If paused, resumes
        if (window.voiceService.conversationState === 'paused') {
            toggleLiveVoicePause();
            return;
        }
        // If listening, plays gentle feedback click
        playSound('click');
    }

    // ==========================================
    // UI RENDERING FUNCTIONS
    // ==========================================
    function renderHistoryList() {
        elements.historyList.innerHTML = '';
        if (!state.sessions.length) {
            elements.historyList.innerHTML = `<div class="history-empty">No conversations yet.</div>`;
            return;
        }

        state.sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = `history-item ${session.id === state.currentSessionId ? 'active' : ''}`;
            item.innerHTML = `
                <div class="history-item-left" title="${escapeHtml(session.title)}">
                    <i data-lucide="message-square"></i>
                    <span class="history-item-title">${escapeHtml(session.title)}</span>
                </div>
                <button class="history-item-delete" title="Delete conversation" data-id="${session.id}">
                    <i data-lucide="x"></i>
                </button>
            `;

            item.querySelector('.history-item-left').addEventListener('click', () => {
                if (state.currentSessionId !== session.id) {
                    stopSpeakingVoice();
                    playSound('click');
                    state.currentSessionId = session.id;
                    saveState();
                    renderHistoryList();
                    renderCurrentChat();
                    closeSidebarOnMobile();
                }
            });

            item.querySelector('.history-item-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSession(session.id);
            });

            elements.historyList.appendChild(item);
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function deleteSession(id) {
        playSound('clear');
        state.sessions = state.sessions.filter(s => s.id !== id);
        if (state.currentSessionId === id) {
            state.currentSessionId = state.sessions.length ? state.sessions[0].id : null;
            if (!state.currentSessionId) {
                createNewSession();
            }
        }
        saveState();
        renderHistoryList();
        renderCurrentChat();
        showToast('Chat deleted', 'trash-2');
    }

    function renderCurrentChat() {
        const session = getCurrentSession();
        elements.messagesList.innerHTML = '';

        if (!session || !session.messages.length) {
            elements.welcomeHero.style.display = 'flex';
            elements.suggestionsBar.style.display = 'flex';
            return;
        }

        elements.welcomeHero.style.display = 'none';
        elements.suggestionsBar.style.display = 'flex';

        session.messages.forEach((msg, idx) => {
            appendMessageToDOM(msg, idx);
        });

        scrollToBottom();
    }

    // Multi-tier graceful error fallback for generated AI images
    window.handleImageLoadError = function(imgEl, fallbackUrl) {
        if (!imgEl) return;
        const retryCount = parseInt(imgEl.getAttribute('data-retries') || '0', 10);

        // Tier 1: Try Fast Fallback (Turbo model at 1280x720)
        if (retryCount === 0 && fallbackUrl && imgEl.src !== fallbackUrl) {
            imgEl.setAttribute('data-retries', '1');
            imgEl.src = fallbackUrl;
            return;
        }

        // Tier 2: Try switching model=flux to model=turbo if present in URL
        if (retryCount <= 1 && imgEl.src.includes('model=flux')) {
            imgEl.setAttribute('data-retries', '2');
            imgEl.src = imgEl.src.replace('model=flux', 'model=turbo');
            return;
        }

        // Tier 3: Curated high-resolution editorial photography fallback (Unsplash CDN)
        if (retryCount <= 2) {
            imgEl.setAttribute('data-retries', '3');
            imgEl.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&q=80';
            return;
        }

        // Tier 4: Show graceful retry state (no broken icons)
        if (imgEl.previousElementSibling) imgEl.previousElementSibling.style.display = 'none';
        imgEl.style.display = 'none';
        const parent = imgEl.parentElement;
        if (parent && !parent.querySelector('.image-error-fallback')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'image-error-fallback';
            errorDiv.innerHTML = `
                <i data-lucide="alert-triangle"></i>
                <span>Visual generation took longer than usual</span>
                <button type="button" class="retry-image-load-btn" onclick="retryImageCard(this)">
                    <i data-lucide="refresh-cw"></i> Retry High-Clarity Render
                </button>
            `;
            parent.appendChild(errorDiv);
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: errorDiv });
        }
    };

    window.retryImageCard = function(btn) {
        const parent = btn.closest('.image-media-wrapper');
        if (!parent) return;
        const img = parent.querySelector('img.generated-ai-img');
        const skeleton = parent.querySelector('.card-img-skeleton');
        const errDiv = parent.querySelector('.image-error-fallback');
        if (errDiv) errDiv.remove();
        if (skeleton) skeleton.style.display = 'flex';
        if (img) {
            img.style.display = 'block';
            img.classList.remove('loaded');
            img.setAttribute('data-retries', '0');
            const rawSrc = img.getAttribute('data-src') || img.src;
            const sep = rawSrc.includes('?') ? '&' : '?';
            img.src = `${rawSrc}${sep}_t=${Date.now()}`;
        }
    };

    function renderImageCardHtml(imageData) {
        const prompt = imageData.prompt || 'AI Artwork';
        const cleanPrompt = escapeHtml(prompt);
        const cleanUrl = escapeHtml(imageData.imageUrl || '');
        const cleanProvider = escapeHtml((imageData.provider || 'pollinations').toUpperCase());
        const cleanModel = escapeHtml(imageData.model || 'FLUX');

        // High-speed fallback URL for instant recovery if flux times out
        const fallbackUrl = imageData.fallbackUrl || (typeof buildFastFallbackImageUrl === 'function' ? buildFastFallbackImageUrl(prompt) : cleanUrl.replace('model=flux', 'model=turbo'));
        const cleanFallbackUrl = escapeHtml(fallbackUrl);

        const imageJsonStr = escapeHtml(JSON.stringify(imageData));

        return `
            <div class="ai-generated-image-card">
                <div class="image-media-wrapper">
                    <div class="card-img-skeleton">
                        <div class="skeleton-shimmer"></div>
                        <div class="skeleton-loader-content">
                            <i data-lucide="sparkles" class="skeleton-icon"></i>
                            <span>Rendering Ultra-HD Visual...</span>
                            <span class="skeleton-subtext">Optimizing lighting, textures & 8K clarity</span>
                        </div>
                    </div>
                    <img src="${cleanUrl}" 
                         alt="${cleanPrompt}" 
                         loading="lazy" 
                         class="generated-ai-img clickable-preview" 
                         data-src="${cleanUrl}" 
                         data-fallback="${cleanFallbackUrl}"
                         data-prompt="${cleanPrompt}" 
                         title="Click to open Fullscreen Lightbox"
                         onload="if(this.previousElementSibling) this.previousElementSibling.style.display='none'; this.classList.add('loaded');"
                         onerror="handleImageLoadError(this, '${cleanFallbackUrl}');">
                    <div class="image-media-overlay">
                        <button type="button" class="image-overlay-btn open-img-canvas-btn" data-img-data='${imageJsonStr}' title="Open in Canvas Studio">
                            <i data-lucide="layout-panel-right"></i>
                            <span>Canvas</span>
                        </button>
                        <button type="button" class="image-overlay-btn download-img-btn" data-url="${cleanUrl}" data-prompt="${cleanPrompt}" title="Save image to device">
                            <i data-lucide="download"></i>
                            <span>Download</span>
                        </button>
                        <button type="button" class="image-overlay-btn copy-img-url-btn" data-url="${cleanUrl}" title="Copy image URL">
                            <i data-lucide="link"></i>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
                <div class="image-media-footer">
                    <div class="image-media-prompt-row">
                        <span class="image-media-prompt-text">✨ <strong>Prompt:</strong> ${cleanPrompt}</span>
                        <span class="image-engine-tag">${cleanProvider} · ${cleanModel}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // IMAGE LIGHTBOX CONTROLLER
    // ==========================================
    function openImageLightbox(src, caption) {
        const modal = document.getElementById('imageLightboxModal');
        const img = document.getElementById('lightboxImg');
        const cap = document.getElementById('lightboxCaption');
        const dlBtn = document.getElementById('lightboxDownloadBtn');
        if (!modal || !img) return;

        img.src = src;
        if (cap) cap.textContent = caption || 'AI Generated Image';
        if (dlBtn) {
            dlBtn.onclick = () => downloadImageDirect(src, 'shivi_ai_' + Date.now() + '.png');
        }
        modal.style.display = 'flex';
        playSound('pop');
    }

    function closeImageLightbox() {
        const modal = document.getElementById('imageLightboxModal');
        if (modal) modal.style.display = 'none';
    }

    // ==========================================
    // PRESENTATION (.PPTX) DECK ENGINE
    // ==========================================

    function hashCode(str) {
        let hash = 0;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) {
            hash = (hash << 5) - hash + s.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    const _IMAGE_ABSTRACT_TERMS = /\b(abstract|surreal|geometric shapes?|neon glow|digital wave|glowing swirls?|3D data visualization|hologram|futuristic background|technology background|digital transformation|innovation concept|business concept|modern technology|artificial intelligence concept|data concept|futuristic city|blockchain network)\b/gi;
    const _STYLE_SUFFIX = 'hyperrealistic professional 8k photography, sharp focus, studio lighting, award-winning composition, clean cinematic depth of field, ultra high-definition textures, color graded';

    // In-memory cache for loaded slide image URLs so navigating back does not re-fetch or consume quota
    const slideImageMemoryCache = (typeof window !== 'undefined' && window._slideImageCache)
        ? window._slideImageCache
        : new Map();
    if (typeof window !== 'undefined') {
        window._slideImageCache = slideImageMemoryCache;
    }

    /**
     * Multi-Tier Slide Visual Fallback Engine:
     * Level 0: Pollinations with turbo model and staggered seed (width=800, height=500)
     * Level 1: Contextual Unsplash source based on slide domain keywords
     * Level 2: Ultra-safe high-aesthetic tech placeholder (photo-1518770660439-4636190af475)
     */
    function buildSlideVisualTiers(slide, topic, index) {
        const slideObj = slide || {};
        const rawTitle = slideObj.title || slideObj.slide_title || '';
        const keySubject = String(rawTitle).replace(/[^a-zA-Z0-9 ]/g, ' ').trim();

        let specificContext = String(
            slideObj.image_prompt ||
            slideObj.visual_description ||
            slideObj.image_search_query || ''
        ).trim();

        if (!specificContext && Array.isArray(slideObj.bullets) && slideObj.bullets.length > 0) {
            for (const b of slideObj.bullets) {
                let stripped = String(b).replace(/^\*\*.*?\*\*:\s*/, '').replace(/[^a-zA-Z0-9 ,.]/g, ' ').trim();
                if (stripped.length > 20) {
                    specificContext = stripped.slice(0, 120);
                    break;
                }
            }
        }

        if (!specificContext) {
            specificContext = `${topic} ${keySubject}`.trim() || `${topic} slide ${index}`;
        }

        specificContext = specificContext.replace(_IMAGE_ABSTRACT_TERMS, '').replace(/\s{2,}/g, ' ').trim();
        if (!specificContext || specificContext.length < 10) {
            specificContext = `${topic} operational environment ${keySubject}`;
        }

        const searchKeywords = encodeURIComponent(
            `${rawTitle} ${topic || ''}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 50)
        );

        const safeIndex = parseInt(index, 10) || 1;
        const seed = safeIndex * 137;
        const prompt = encodeURIComponent(`${specificContext}, corporate tech, realistic, 8k`);

        // Level 0: Fast Pollinations Turbo with staggered seed
        const level0 = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=500&nologo=true&model=turbo&seed=${seed}`;

        // Level 1: High-res contextual Unsplash source based on slide keywords
        const level1 = `https://source.unsplash.com/800x500/?${searchKeywords}`;

        // Level 2: Ultra-safe tech placeholder
        const level2 = `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80`;

        return { level0, level1, level2, prompt: specificContext, searchKeywords, seed };
    }

    function buildContextualSlideImageUrl(slide, topic, index) {
        const tiers = buildSlideVisualTiers(slide, topic, index);
        const cacheKey = `${topic || 'deck'}_slide_${index}`;
        if (slideImageMemoryCache.has(cacheKey)) {
            return slideImageMemoryCache.get(cacheKey);
        }
        return tiers.level0;
    }

    /**
     * Pre-fetches at most the next slide (currentSlideIndex + 1) in background
     * without blocking UI, caching it in memory.
     */
    function prefetchNextSlideImage(topic, nextSlide, nextIndex) {
        if (!nextSlide) return;
        const cacheKey = `${topic || 'deck'}_slide_${nextIndex}`;
        if (slideImageMemoryCache.has(cacheKey)) return;

        const tiers = buildSlideVisualTiers(nextSlide, topic, nextIndex);
        const preImg = new Image();
        preImg.onload = function() {
            slideImageMemoryCache.set(cacheKey, preImg.src);
        };
        preImg.onerror = function() {
            const fbImg = new Image();
            fbImg.onload = function() {
                slideImageMemoryCache.set(cacheKey, fbImg.src);
            };
            fbImg.src = tiers.level2;
        };
        preImg.src = tiers.level0;
    }

    /**
     * Renders slide visual container with lazy loading, memory caching,
     * and multi-tier rate-limit resilient fallback engine.
     */
    function renderSlideImageComponentHtml(slide, topic, index, isActive = true) {
        const slideObj = slide || {};
        const cacheKey = `${topic || 'deck'}_slide_${index}`;
        const title = slideObj.slide_title || slideObj.title || `Slide ${index}`;
        const promptText = slideObj.image_prompt || slideObj.visual_prompt || `${title} ${topic}`;

        // If slide is not active and not in memory cache, lazy load without eager img render
        if (!isActive && !slideImageMemoryCache.has(cacheKey)) {
            return `
                <div class="slide-media-card" style="height: 100%; position: relative;">
                    <div class="w-full h-full bg-slate-900/40 rounded-2xl animate-pulse slide-img-skeleton" style="min-height: 320px;">
                        <div class="skeleton-shimmer"></div>
                        <i data-lucide="image" class="skeleton-icon"></i>
                        <span>Queued visual...</span>
                    </div>
                </div>
            `;
        }

        const tiers = buildSlideVisualTiers(slideObj, topic, index);
        const cachedUrl = slideImageMemoryCache.get(cacheKey);
        const initialSrc = cachedUrl || tiers.level0;
        const isAlreadyCached = !!cachedUrl;

        return `
            <div class="slide-media-card" style="height: 100%; position: relative;">
                ${!isAlreadyCached ? `
                <div class="slide-img-skeleton" id="slideSkeleton_${index}">
                    <div class="skeleton-shimmer"></div>
                    <div class="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" style="width: 24px; height: 24px; border: 2px solid rgba(6,182,212,0.3); border-top-color: #06b6d4; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span style="font-size: 0.75rem; color: #94a3b8; margin-top: 6px;">Loading slide visual...</span>
                </div>
                ` : ''}
                <img src="${initialSrc}" 
                     alt="${escapeHtml(title)}" 
                     class="slide-ai-visual-img ${isAlreadyCached ? 'loaded' : ''}"
                     data-tier="0"
                     data-level0="${escapeHtml(tiers.level0)}"
                     data-level1="${escapeHtml(tiers.level1)}"
                     data-level2="${escapeHtml(tiers.level2)}"
                     data-cachekey="${escapeHtml(cacheKey)}"
                     onload="
                        this.classList.add('loaded');
                        var sk = document.getElementById('slideSkeleton_${index}');
                        if (sk) sk.style.display = 'none';
                        if (window._slideImageCache) window._slideImageCache.set('${escapeHtml(cacheKey)}', this.src);
                     "
                     onerror="
                        var sk = document.getElementById('slideSkeleton_${index}');
                        var tier = parseInt(this.getAttribute('data-tier') || '0', 10);
                        if (tier === 0) {
                            this.setAttribute('data-tier', '1');
                            this.src = this.getAttribute('data-level1');
                        } else if (tier === 1) {
                            this.setAttribute('data-tier', '2');
                            this.src = this.getAttribute('data-level2');
                        } else {
                            this.onerror = null;
                            if (sk) sk.style.display = 'none';
                            this.classList.add('loaded');
                        }
                     " />
                ${promptText ? `
                <div class="slide-image-badge-pill">
                    <i data-lucide="sparkles"></i>
                    <span class="image-prompt-text" title="${escapeHtml(promptText)}">✦ ${escapeHtml(promptText)}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    window.hashCode = hashCode;
    window.slideImageMemoryCache = slideImageMemoryCache;
    window.buildSlideVisualTiers = buildSlideVisualTiers;
    window.buildContextualSlideImageUrl = buildContextualSlideImageUrl;
    window.prefetchNextSlideImage = prefetchNextSlideImage;
    window.renderSlideImageComponentHtml = renderSlideImageComponentHtml;
    if (typeof buildFastFallbackImageUrl === 'function') {
        window.buildFastFallbackImageUrl = buildFastFallbackImageUrl;
    }

    function renderPresentationCardHtml(deck) {
        const title = escapeHtml(deck.deck_title || deck.title || 'Executive Keynote');
        const subtitle = escapeHtml(deck.subtitle || '');
        const slideCount = (deck.slides || []).length;
        const deckId = 'deck_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        window._shiviDecks = window._shiviDecks || {};
        window._shiviDecks[deckId] = deck;

        const slidesHtml = (deck.slides || []).map((slide, idx) => {
            const categoryText = slide.category || slide.badge || (idx === 0 ? 'EXECUTIVE BRIEFING' : `PILLAR 0${idx + 1}`);
            const badge = `<span class="slide-mini-badge">${escapeHtml(categoryText)}</span>`;
            const metric = slide.highlight_metric && slide.highlight_metric.value 
                ? `<span class="slide-mini-metric">${escapeHtml(slide.highlight_metric.value)}</span>` 
                : '';
            
            let pointsList = '';
            if (Array.isArray(slide.bullets) && slide.bullets.length > 0) {
                pointsList = slide.bullets.slice(0, 3).map(b => {
                    const bStr = String(b).trim();
                    if (bStr.includes(':')) {
                        const parts = bStr.split(':');
                        const k = parts[0].replace(/\*/g, '').trim();
                        const d = parts.slice(1).join(':').trim();
                        return `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(d)}</li>`;
                    }
                    return `<li>${escapeHtml(bStr.replace(/\*/g, ''))}</li>`;
                }).join('');
            } else if (Array.isArray(slide.cards_or_points) && slide.cards_or_points.length > 0) {
                pointsList = slide.cards_or_points.slice(0, 3).map(c => 
                    `<li><strong>${escapeHtml(c.title || c.label || '')}:</strong> ${escapeHtml(c.description || c.detail || '')}</li>`
                ).join('');
            }

            const imgPrompt = slide.image_prompt || '';
            const visualBadge = imgPrompt ? `<span class="slide-mini-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);" title="${escapeHtml(imgPrompt)}">🖼️ AI Visual</span>` : '';

            return `
                <div class="deck-slide-item">
                    <div class="slide-num">${idx + 1}</div>
                    <div class="slide-content">
                        <div class="slide-item-topbar">
                            <h5>${escapeHtml(slide.slide_title || slide.title || `Slide ${idx + 1}`)}</h5>
                            <div class="slide-item-pills">
                                ${badge}
                                ${visualBadge}
                                ${metric}
                            </div>
                        </div>
                        <ul class="slide-bullets">
                            ${pointsList}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="presentation-deck-card" id="${deckId}">
                <div class="deck-header">
                    <div class="deck-header-left">
                        <div class="deck-icon-badge">📊</div>
                        <div class="deck-title-group">
                            <h4>${title}</h4>
                            <p>${subtitle}</p>
                        </div>
                    </div>
                    <div class="deck-badges">
                        <span class="deck-tag">${slideCount} Slides</span>
                        <span class="deck-tag" style="background: rgba(234, 88, 12, 0.18); color: #f97316;">KEYNOTE .PPTX</span>
                    </div>
                </div>
                <div class="deck-body">
                    <div class="deck-slides-summary">
                        ${slidesHtml}
                    </div>
                </div>
                <div class="deck-footer" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">Pitch & Apple Keynote Quality • Shivi AI</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.shiviStudio.openPptInCanvas('${deckId}')" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-size: 0.8rem;">
                            <i data-lucide="layout-panel-right"></i>
                            <span>Open in Canvas</span>
                        </button>
                        <button type="button" class="download-ppt-btn" onclick="window.downloadShiviDeck('${deckId}')">
                            <i data-lucide="download"></i>
                            <span>Download .pptx</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function exportPptxFile(deck) {
        if (!window.PptxGenJS) {
            showToast('Loading PowerPoint engine, please try again in a moment...', 'alert-circle');
            return;
        }

        try {
            showToast('Generating Apple Keynote-style .pptx deck...', 'file-text');
            const pptx = new window.PptxGenJS();
            pptx.layout = 'LAYOUT_16x9';
            pptx.author = 'Shivi AI';
            pptx.company = 'Shivi AI Presentation Engine';
            
            const deckTitle = deck.deck_title || deck.title || 'Executive Keynote';
            pptx.title = deckTitle;

            const themeName = (deck.theme || 'dark_modern').toLowerCase();
            const slides = deck.slides || [];
            const totalSlides = slides.length;

            // Pitch / Keynote Color Tokens
            let bgHex, cardBgHex, cardBorderHex, accentHex, altAccentHex, titleHex, subHex, bodyHex;

            if (themeName.includes('editorial')) {
                bgHex = 'F8FAFC';
                cardBgHex = 'FFFFFF';
                cardBorderHex = 'E2E8F0';
                accentHex = '2563EB';       // Royal Blue
                altAccentHex = 'EA580C';    // Warm Amber
                titleHex = '0F172A';
                subHex = '64748B';
                bodyHex = '334155';
            } else if (themeName.includes('gradient') || themeName.includes('aurora')) {
                bgHex = '0A1118';
                cardBgHex = '111E28';
                cardBorderHex = '164E63';
                accentHex = '10B981';       // Emerald
                altAccentHex = '06B6D4';    // Cyan
                titleHex = 'FFFFFF';
                subHex = '67E8F9';
                bodyHex = 'CBD5E1';
            } else { // dark_modern (Default Obsidian Keynote)
                bgHex = '0B0F19';
                cardBgHex = '161F30';
                cardBorderHex = '22314E';
                accentHex = 'F97316';       // Electric Amber
                altAccentHex = '38BDF8';    // Sky Blue
                titleHex = 'FFFFFF';
                subHex = '94A3B8';
                bodyHex = 'CBD5E1';
            }

            slides.forEach((s, idx) => {
                const slide = pptx.addSlide();
                const layout = (s.layout || s.layout_type || 'card_grid').toLowerCase();
                const badgeText = s.badge || (idx === 0 ? 'EXECUTIVE BRIEF' : `STRATEGIC PILLAR ${idx + 1}`);
                const slideTitle = s.slide_title || `Slide ${idx + 1}`;
                const subtitle = s.subtitle || '';
                const cards = s.cards_or_points || [];
                const metric = s.highlight_metric || { value: '+100%', caption: 'Key Benchmark' };
                const speakerNotes = s.speaker_notes || '';

                // Slide Background
                slide.background = { color: bgHex };

                // Top Category Badge Pill
                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: 0.8, y: 0.45, w: 2.8, h: 0.32,
                    fill: { color: cardBgHex },
                    line: { color: accentHex, width: 1 },
                    rectRadius: 0.15
                });
                slide.addText(badgeText, {
                    x: 0.8, y: 0.45, w: 2.8, h: 0.32,
                    fontSize: 9.5, bold: true, color: accentHex,
                    fontFace: 'Arial', align: 'center', valign: 'middle'
                });

                // Slide Headline
                slide.addText(slideTitle, {
                    x: 0.8, y: 0.85, w: 11.7, h: 0.65,
                    fontSize: 24, bold: true, color: titleHex,
                    fontFace: 'Arial', valign: 'top'
                });

                // Subtitle
                if (subtitle) {
                    slide.addText(subtitle, {
                        x: 0.8, y: 1.45, w: 11.7, h: 0.42,
                        fontSize: 13, color: subHex,
                        fontFace: 'Arial', valign: 'top'
                    });
                }

                const contentTop = 1.95;
                const contentHeight = 4.75;

                // -------------------------------------------------------------
                // 1. TITLE HERO LAYOUT (Slide 1)
                // -------------------------------------------------------------
                if (idx === 0 || layout === 'title' || layout === 'title_hero') {
                    const colW = 5.65;

                    // Left Column: Strategic Summary Card
                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: 0.8, y: contentTop, w: colW, h: contentHeight,
                        fill: { color: cardBgHex },
                        line: { color: cardBorderHex, width: 1 },
                        rectRadius: 0.12
                    });

                    const leftRuns = [];
                    const objText = s.objective || `Deliver an authoritative executive briefing on ${deckTitle}.`;
                    leftRuns.push({ text: '🎯 STRATEGIC OBJECTIVE:\n', options: { bold: true, fontSize: 11.5, color: altAccentHex, fontFace: 'Arial' } });
                    leftRuns.push({ text: `${objText}\n\n`, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } });

                    const bulletsList = (s.bullets && s.bullets.length > 0) ? s.bullets : cards.map(c => `**${c.title || c.label || 'Pillar'}**: ${c.description || c.detail || ''}`);
                    bulletsList.slice(0, 3).forEach(bItem => {
                        const bStr = String(bItem).trim();
                        if (bStr.includes(':')) {
                            const parts = bStr.split(':');
                            const k = parts[0].replace(/\*/g, '').trim();
                            const d = parts.slice(1).join(':').trim();
                            leftRuns.push({ text: `✦ ${k}: `, options: { bold: true, fontSize: 11.5, color: accentHex, fontFace: 'Arial' } });
                            leftRuns.push({ text: `${d}\n\n`, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } });
                        } else {
                            leftRuns.push({ text: `✦ ${bStr}\n\n`, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } });
                        }
                    });

                    leftRuns.push({ text: 'Created with ShiviAI • Executive Keynote Widescreen Edition', options: { italic: true, fontSize: 9.5, color: subHex, fontFace: 'Arial' } });

                    slide.addText(leftRuns, {
                        x: 1.05, y: contentTop + 0.2, w: colW - 0.5, h: contentHeight - 0.4,
                        valign: 'top'
                    });

                    // Right column: AI Generated Visual Image (with cache support)
                    const imgPrompt = s.image_prompt || s.visual_prompt || `${deckTitle} ${slideTitle}`;
                    const cacheKey = `${deckTitle}_slide_${idx + 1}`;
                    const cachedUrl = slideImageMemoryCache.get(cacheKey);
                    const tiers = buildSlideVisualTiers(s, deckTitle, idx + 1);
                    const imgUrl = cachedUrl || (idx === 0 ? tiers.level0 : tiers.level2);

                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: 6.85, y: contentTop, w: colW, h: contentHeight,
                        fill: { color: cardBgHex },
                        line: { color: accentHex, width: 1.2 },
                        rectRadius: 0.12
                    });

                    try {
                        slide.addImage({
                            path: imgUrl,
                            x: 6.9,
                            y: contentTop + 0.05,
                            w: colW - 0.1,
                            h: contentHeight - 0.45,
                            rounding: true
                        });
                    } catch (imgErr) {
                        console.warn('PptxGenJS addImage warning:', imgErr);
                    }

                    slide.addText(`✦ AI Visual: ${imgPrompt}`, {
                        x: 6.9, y: contentTop + contentHeight - 0.38, w: colW - 0.1, h: 0.32,
                        fontSize: 9, italic: true, color: subHex,
                        fontFace: 'Arial', align: 'center', valign: 'middle'
                    });
                }
                // -------------------------------------------------------------
                // 2. SPLIT IMAGE & CONTENT LAYOUT (With 3-4 Bullets & Dynamic AI Visual)
                // -------------------------------------------------------------
                else if (layout === 'split_image_content' || s.bullets || s.image_prompt || s.image_url) {
                    const colW = 5.65;
                    const bulletsList = (s.bullets && s.bullets.length > 0) ? s.bullets : cards.map(c => `**${c.title || c.label || 'Pillar'}**: ${c.description || c.detail || ''}`);
                    const numBullets = Math.min(Math.max(bulletsList.length, 2), 4);
                    const cardGap = 0.15;
                    const cardH = (contentHeight - (cardGap * (numBullets - 1))) / numBullets;

                    for (let bIdx = 0; bIdx < numBullets; bIdx++) {
                        const bStr = String(bulletsList[bIdx] || bulletsList[bulletsList.length - 1]).trim();
                        const cy = contentTop + bIdx * (cardH + cardGap);

                        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                            x: 0.8, y: cy, w: colW, h: cardH,
                            fill: { color: cardBgHex },
                            line: { color: cardBorderHex, width: 1 },
                            rectRadius: 0.1
                        });

                        // Left Accent Strip
                        slide.addShape(pptx.shapes.RECTANGLE, {
                            x: 0.8, y: cy + 0.08, w: 0.08, h: cardH - 0.16,
                            fill: { color: bIdx % 2 === 0 ? accentHex : altAccentHex },
                            line: { color: bIdx % 2 === 0 ? accentHex : altAccentHex }
                        });

                        let keyword = `Pillar ${bIdx + 1}`;
                        let desc = bStr;
                        if (bStr.includes(':')) {
                            const parts = bStr.split(':');
                            keyword = parts[0].replace(/\*/g, '').trim();
                            desc = parts.slice(1).join(':').trim();
                        }

                        const bulletRuns = [
                            { text: `✦ ${keyword}: `, options: { bold: true, fontSize: 12, color: accentHex, fontFace: 'Arial' } },
                            { text: desc, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } }
                        ];

                        slide.addText(bulletRuns, {
                            x: 1.05, y: cy + 0.1, w: colW - 0.35, h: cardH - 0.2,
                            valign: 'middle'
                        });
                    }

                    // Right column: AI Generated Visual Image (with cache support)
                    const imgPrompt = s.image_prompt || s.visual_prompt || `${deckTitle} ${slideTitle}`;
                    const cacheKey = `${deckTitle}_slide_${idx + 1}`;
                    const cachedUrl = slideImageMemoryCache.get(cacheKey);
                    const tiers = buildSlideVisualTiers(s, deckTitle, idx + 1);
                    const imgUrl = cachedUrl || (idx === 0 ? tiers.level0 : tiers.level2);

                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: 6.85, y: contentTop, w: colW, h: contentHeight,
                        fill: { color: cardBgHex },
                        line: { color: accentHex, width: 1.2 },
                        rectRadius: 0.12
                    });

                    try {
                        slide.addImage({
                            path: imgUrl,
                            x: 6.9,
                            y: contentTop + 0.05,
                            w: colW - 0.1,
                            h: contentHeight - 0.45,
                            rounding: true
                        });
                    } catch (imgErr) {
                        console.warn('PptxGenJS addImage warning:', imgErr);
                    }

                    slide.addText(`✦ AI Visual: ${imgPrompt}`, {
                        x: 6.9, y: contentTop + contentHeight - 0.38, w: colW - 0.1, h: 0.32,
                        fontSize: 9, italic: true, color: subHex,
                        fontFace: 'Arial', align: 'center', valign: 'middle'
                    });
                }
                // 3. CARD GRID LAYOUT (Optional fallback)
                else if (layout === 'card_grid') {
                    const numCards = Math.min(cards.length, 4);
                    const totalW = 11.7;
                    const gap = numCards === 4 ? 0.25 : 0.37;
                    const cardW = (totalW - (numCards - 1) * gap) / numCards;

                    for (let i = 0; i < numCards; i++) {
                        const cx = 0.8 + i * (cardW + gap);
                        const c = cards[i] || { label: `Core Pillar ${i + 1}`, detail: 'Operational insight' };

                        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                            x: cx, y: contentTop, w: cardW, h: contentHeight,
                            fill: { color: cardBgHex },
                            line: { color: cardBorderHex, width: 1 },
                            rectRadius: 0.12
                        });

                        slide.addShape(pptx.shapes.RECTANGLE, {
                            x: cx + 0.25, y: contentTop + 0.22, w: 0.9, h: 0.05,
                            fill: { color: i === 0 ? accentHex : (i === 1 ? altAccentHex : 'A855F7') },
                            line: { color: i === 0 ? accentHex : (i === 1 ? altAccentHex : 'A855F7') }
                        });

                        slide.addText(`0${i + 1}`, {
                            x: cx + cardW - 0.9, y: contentTop + 0.15, w: 0.6, h: 0.3,
                            fontSize: 12, bold: true, color: subHex,
                            fontFace: 'Arial', align: 'right'
                        });

                        slide.addText(c.label, {
                            x: cx + 0.25, y: contentTop + 0.45, w: cardW - 0.5, h: 0.55,
                            fontSize: numCards === 4 ? 14 : 16, bold: true, color: titleHex,
                            fontFace: 'Arial', valign: 'top'
                        });

                        const detailH = c.tag ? contentHeight - 1.55 : contentHeight - 1.15;
                        slide.addText(c.detail, {
                            x: cx + 0.25, y: contentTop + 1.05, w: cardW - 0.5, h: detailH,
                            fontSize: numCards === 4 ? 11 : 12, color: bodyHex,
                            fontFace: 'Arial', valign: 'top'
                        });

                        if (c.tag) {
                            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                                x: cx + 0.25, y: contentTop + contentHeight - 0.48, w: cardW - 0.5, h: 0.32,
                                fill: { color: cardBgHex },
                                line: { color: accentHex, width: 0.8 },
                                rectRadius: 0.08
                            });
                            slide.addText(`✦ ${c.tag}`, {
                                x: cx + 0.25, y: contentTop + contentHeight - 0.48, w: cardW - 0.5, h: 0.32,
                                fontSize: 9.5, bold: true, color: accentHex,
                                fontFace: 'Arial', align: 'center', valign: 'middle'
                            });
                        }
                    }
                }

                // 4. SPLIT INSIGHT LAYOUT
                else if (layout === 'split_insight') {
                    const colW = 5.65;
                    const half = Math.max(1, Math.ceil(cards.length / 2));
                    const leftCards = cards.slice(0, half);
                    const rightCards = cards.slice(half);

                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: 0.8, y: contentTop, w: colW, h: contentHeight,
                        fill: { color: cardBgHex },
                        line: { color: cardBorderHex, width: 1 },
                        rectRadius: 0.12
                    });

                    slide.addText('PERSPECTIVE A • CURRENT CHALLENGES', {
                        x: 1.1, y: contentTop + 0.3, w: colW - 0.6, h: 0.35,
                        fontSize: 12, bold: true, color: altAccentHex,
                        fontFace: 'Arial'
                    });

                    let leftRuns = [];
                    leftCards.forEach(c => {
                        leftRuns.push({ text: `✦ ${c.label}\n`, options: { bold: true, fontSize: 13.5, color: titleHex, fontFace: 'Arial' } });
                        leftRuns.push({ text: `${c.detail}\n\n`, options: { bold: false, fontSize: 11.5, color: bodyHex, fontFace: 'Arial' } });
                    });
                    slide.addText(leftRuns, {
                        x: 1.1, y: contentTop + 0.75, w: colW - 0.6, h: contentHeight - 1.0,
                        valign: 'top'
                    });

                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: 6.85, y: contentTop, w: colW, h: contentHeight,
                        fill: { color: cardBgHex },
                        line: { color: accentHex, width: 1.5 },
                        rectRadius: 0.12
                    });

                    slide.addText('PERSPECTIVE B • STRATEGIC ACCELERATION', {
                        x: 7.15, y: contentTop + 0.3, w: colW - 0.6, h: 0.35,
                        fontSize: 12, bold: true, color: accentHex,
                        fontFace: 'Arial'
                    });

                    let rightRuns = [];
                    rightCards.forEach(c => {
                        rightRuns.push({ text: `✦ ${c.label}\n`, options: { bold: true, fontSize: 13.5, color: titleHex, fontFace: 'Arial' } });
                        rightRuns.push({ text: `${c.detail}\n\n`, options: { bold: false, fontSize: 11.5, color: bodyHex, fontFace: 'Arial' } });
                    });
                    slide.addText(rightRuns, {
                        x: 7.15, y: contentTop + 0.75, w: colW - 0.6, h: contentHeight - 1.0,
                        valign: 'top'
                    });
                }
                // 4. PROCESS FLOW LAYOUT
                else if (layout === 'process_flow') {
                    const numSteps = Math.min(cards.length, 3);
                    const stepW = 3.65;
                    const gap = 0.37;

                    for (let i = 0; i < numSteps; i++) {
                        const sx = 0.8 + i * (stepW + gap);
                        const c = cards[i] || { label: `Phase ${i + 1}`, detail: 'Execution milestone' };

                        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                            x: sx, y: contentTop, w: stepW, h: contentHeight,
                            fill: { color: cardBgHex },
                            line: { color: cardBorderHex, width: 1 },
                            rectRadius: 0.12
                        });

                        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                            x: sx + 0.3, y: contentTop + 0.3, w: 1.2, h: 0.35,
                            fill: { color: accentHex },
                            rectRadius: 0.08
                        });
                        slide.addText(`STAGE 0${i + 1}`, {
                            x: sx + 0.3, y: contentTop + 0.3, w: 1.2, h: 0.35,
                            fontSize: 10, bold: true, color: 'FFFFFF',
                            fontFace: 'Arial', align: 'center', valign: 'middle'
                        });

                        slide.addText(c.label, {
                            x: sx + 0.3, y: contentTop + 0.85, w: stepW - 0.6, h: 0.65,
                            fontSize: 16, bold: true, color: titleHex,
                            fontFace: 'Arial', valign: 'top'
                        });

                        slide.addText(c.detail, {
                            x: sx + 0.3, y: contentTop + 1.55, w: stepW - 0.6, h: contentHeight - 1.85,
                            fontSize: 12.5, color: bodyHex,
                            fontFace: 'Arial', valign: 'top'
                        });
                    }
                }
                // 5. CONCLUSION / ROADMAP
                else {
                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: 0.8, y: contentTop, w: 11.7, h: 1.35,
                        fill: { color: cardBgHex },
                        line: { color: accentHex, width: 1.5 },
                        rectRadius: 0.12
                    });

                    slide.addText('CORE EXECUTIVE TAKEAWAY', {
                        x: 1.1, y: contentTop + 0.18, w: 11.1, h: 0.28,
                        fontSize: 10.5, bold: true, color: accentHex,
                        fontFace: 'Arial'
                    });

                    slide.addText(`"${slideTitle}: A validated deployment pathway ready for enterprise execution."`, {
                        x: 1.1, y: contentTop + 0.48, w: 11.1, h: 0.65,
                        fontSize: 15, bold: true, color: titleHex,
                        fontFace: 'Arial', valign: 'top'
                    });

                    const numCards = Math.min(cards.length, 3);
                    const cardW = 3.65;
                    const gap = 0.37;
                    const bottomTop = contentTop + 1.6;
                    const bottomH = contentHeight - 1.6;

                    for (let i = 0; i < numCards; i++) {
                        const cx = 0.8 + i * (cardW + gap);
                        const c = cards[i] || { label: `Priority ${i + 1}`, detail: 'Implementation action item' };

                        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                            x: cx, y: bottomTop, w: cardW, h: bottomH,
                            fill: { color: cardBgHex },
                            line: { color: cardBorderHex, width: 1 },
                            rectRadius: 0.12
                        });

                        slide.addText(`✓ Action 0${i + 1}`, {
                            x: cx + 0.3, y: bottomTop + 0.22, w: cardW - 0.6, h: 0.3,
                            fontSize: 11, bold: true, color: accentHex,
                            fontFace: 'Arial'
                        });

                        slide.addText(c.label, {
                            x: cx + 0.3, y: bottomTop + 0.55, w: cardW - 0.6, h: 0.5,
                            fontSize: 15, bold: true, color: titleHex,
                            fontFace: 'Arial', valign: 'top'
                        });

                        slide.addText(c.detail, {
                            x: cx + 0.3, y: bottomTop + 1.1, w: cardW - 0.6, h: bottomH - 1.3,
                            fontSize: 12, color: bodyHex,
                            fontFace: 'Arial', valign: 'top'
                        });
                    }
                }

                slide.addText(`Shivi AI Keynote Studio • Slide ${idx + 1} of ${totalSlides}`, {
                    x: 0.8, y: 6.9, w: 11.7, h: 0.35,
                    fontSize: 9.5, color: subHex,
                    fontFace: 'Arial', align: 'right'
                });

                if (speakerNotes) {
                    slide.addNotes(speakerNotes);
                }
            });

            const safeFilename = (deckTitle).replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 30);
            await pptx.writeFile({ fileName: `${safeFilename}.pptx` });
            showToast('Presentation downloaded! (.pptx)', 'check');
            playSound('receive');

        } catch (err) {
            console.error('PPT export error:', err);
            showToast('Failed to export PPT: ' + err.message, 'alert-triangle');
        }
    }

    window.downloadShiviDeck = function(deckId) {
        if (window._shiviDecks && window._shiviDecks[deckId]) {
            exportPptxFile(window._shiviDecks[deckId]);
        }
    };

    async function downloadImageDirect(url, filename) {
        try {
            showToast('Preparing download...', 'download');
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || `shivi_ai_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            showToast('Image downloaded!', 'check');
            playSound('receive');
        } catch (e) {
            window.open(url, '_blank');
            showToast('Opening image in new window', 'external-link');
        }
    }

    // ==========================================
    // CANVAS & ARTIFACTS STUDIO CONTROLLER
    // ==========================================
    function openCanvas(type = null, artifactData = null) {
        state.canvas.isOpen = true;
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.classList.add('canvas-open');
        if (elements.canvasPanel) elements.canvasPanel.style.display = 'flex';
        if (window.innerWidth <= 960 && elements.canvasBackdrop) {
            elements.canvasBackdrop.style.display = 'block';
        }
        if (elements.openCanvasBtnHeader) {
            elements.openCanvasBtnHeader.classList.add('active');
        }

        if (type === 'loading') {
            showCanvasLoading(artifactData ? artifactData.title : 'Generating Artifact...', artifactData ? artifactData.subtitle : 'Please wait while Shivi works...', artifactData?.isPPT || false);
        } else if (type === 'ppt-loading') {
            state.canvas.isGeneratingPPT = true;
            showCanvasLoading(
                'Structuring & Designing Slide Deck...',
                artifactData ? `Topic: "${artifactData.topic || 'Executive Deck'}"` : 'Please wait while Shivi drafts your slides',
                true
            );
        } else if (type && artifactData) {
            setCanvasArtifact(type, artifactData);
        } else if (!state.canvas.artifact) {
            showCanvasEmpty();
        }

        if (window.lucide) lucide.createIcons();
        playSound('pop');
    }

    function closeCanvas() {
        state.canvas.isOpen = false;
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.classList.remove('canvas-open');
        if (elements.canvasPanel) {
            elements.canvasPanel.style.display = 'none';
            elements.canvasPanel.classList.remove('fullscreen');
        }
        state.canvas.isFullscreen = false;
        if (elements.canvasFullscreenIcon) {
            elements.canvasFullscreenIcon.setAttribute('data-lucide', 'maximize-2');
        }
        if (elements.canvasBackdrop) {
            elements.canvasBackdrop.style.display = 'none';
        }
        if (elements.openCanvasBtnHeader) {
            elements.openCanvasBtnHeader.classList.remove('active');
        }
        if (window.lucide) lucide.createIcons();
        playSound('click');
    }

    function toggleCanvas() {
        if (state.canvas.isOpen) {
            closeCanvas();
        } else {
            openCanvas();
        }
    }

    function toggleCanvasFullscreen() {
        if (!elements.canvasPanel) return;
        state.canvas.isFullscreen = !state.canvas.isFullscreen;
        elements.canvasPanel.classList.toggle('fullscreen', state.canvas.isFullscreen);
        if (elements.canvasFullscreenIcon) {
            elements.canvasFullscreenIcon.setAttribute('data-lucide', state.canvas.isFullscreen ? 'minimize-2' : 'maximize-2');
        }
        if (window.lucide) lucide.createIcons();
        playSound('click');
    }

    function switchCanvasTab(tab) {
        state.canvas.activeTab = tab;
        if (tab === 'preview') {
            if (elements.canvasTabPreview) elements.canvasTabPreview.classList.add('active');
            if (elements.canvasTabCode) elements.canvasTabCode.classList.remove('active');
            if (elements.canvasPreviewPane) elements.canvasPreviewPane.style.display = 'flex';
            if (elements.canvasSourcePane) elements.canvasSourcePane.style.display = 'none';
        } else {
            if (elements.canvasTabCode) elements.canvasTabCode.classList.add('active');
            if (elements.canvasTabPreview) elements.canvasTabPreview.classList.remove('active');
            if (elements.canvasSourcePane) elements.canvasSourcePane.style.display = 'flex';
            if (elements.canvasPreviewPane) elements.canvasPreviewPane.style.display = 'none';
        }
        playSound('click');
    }

    function showCanvasLoading(title, subtitle, isPPT = false) {
        if (elements.canvasEmptyState) elements.canvasEmptyState.style.display = 'none';
        if (elements.canvasPptView) elements.canvasPptView.style.display = 'none';
        if (elements.canvasImageView) elements.canvasImageView.style.display = 'none';
        if (elements.canvasDocView) elements.canvasDocView.style.display = 'none';

        if (elements.canvasLoadingState) {
            elements.canvasLoadingState.style.display = 'flex';
            if (elements.canvasLoadingTitle) elements.canvasLoadingTitle.textContent = title || 'Rendering Artifact...';
            if (elements.canvasLoadingSubtitle) elements.canvasLoadingSubtitle.textContent = subtitle || 'Please wait while Shivi crafts your masterpiece';
        }

        const isPptLoading = isPPT || state.canvas.isGeneratingPPT;
        if (elements.canvasPptSteps) {
            elements.canvasPptSteps.style.display = isPptLoading ? 'flex' : 'none';
            if (isPptLoading) {
                updateCanvasPptStep(1);
            }
        }
    }

    function updateCanvasPptStep(stepNum) {
        const steps = [elements.canvasStep1, elements.canvasStep2, elements.canvasStep3];
        steps.forEach((stepEl, idx) => {
            if (!stepEl) return;
            const currentStep = idx + 1;
            stepEl.classList.remove('active', 'done');
            if (currentStep < stepNum) {
                stepEl.classList.add('done');
            } else if (currentStep === stepNum) {
                stepEl.classList.add('active');
            }
        });
    }

    function showCanvasEmpty() {
        if (elements.canvasLoadingState) elements.canvasLoadingState.style.display = 'none';
        if (elements.canvasPptSteps) elements.canvasPptSteps.style.display = 'none';
        if (elements.canvasPptView) elements.canvasPptView.style.display = 'none';
        if (elements.canvasImageView) elements.canvasImageView.style.display = 'none';
        if (elements.canvasDocView) elements.canvasDocView.style.display = 'none';
        if (elements.canvasEmptyState) elements.canvasEmptyState.style.display = 'flex';

        if (elements.canvasTitle) elements.canvasTitle.textContent = 'Canvas Studio';
        if (elements.canvasSubtitle) elements.canvasSubtitle.textContent = 'Artifacts & Interactive Workspace';
        if (elements.canvasTypeIcon) elements.canvasTypeIcon.setAttribute('data-lucide', 'sparkles');
        if (window.lucide) lucide.createIcons();
    }

    function setCanvasArtifact(type, data) {
        state.canvas.artifact = { type, data };

        if (elements.canvasEmptyState) elements.canvasEmptyState.style.display = 'none';
        if (elements.canvasLoadingState) elements.canvasLoadingState.style.display = 'none';
        if (elements.canvasPptSteps) elements.canvasPptSteps.style.display = 'none';
        if (elements.canvasPptView) elements.canvasPptView.style.display = 'none';
        if (elements.canvasImageView) elements.canvasImageView.style.display = 'none';
        if (elements.canvasDocView) elements.canvasDocView.style.display = 'none';

        switchCanvasTab('preview');

        if (type === 'ppt') {
            const slideCount = (data.slides || []).length;
            if (elements.canvasTitle) elements.canvasTitle.textContent = data.title || 'PowerPoint Presentation';
            if (elements.canvasSubtitle) elements.canvasSubtitle.textContent = `${slideCount} Slides • Interactive Presentation Studio`;
            if (elements.canvasTypeIcon) elements.canvasTypeIcon.setAttribute('data-lucide', 'presentation');
            if (elements.canvasRawCode) elements.canvasRawCode.textContent = JSON.stringify(data, null, 2);
            if (elements.canvasSourceLang) elements.canvasSourceLang.textContent = 'JSON';

            if (elements.studioHeroPlaceholder) elements.studioHeroPlaceholder.style.display = 'none';
            if (elements.studioPlayerContainer) elements.studioPlayerContainer.style.display = 'flex';
            if (elements.presentationActiveBadge) elements.presentationActiveBadge.style.display = 'inline-block';

            state.canvas.currentSlideIndex = 0;
            if (elements.canvasPptView) elements.canvasPptView.style.display = 'flex';
            renderPptSlide(0);

        } else if (type === 'image') {
            if (elements.canvasTitle) elements.canvasTitle.textContent = 'AI Image Studio';
            if (elements.canvasSubtitle) elements.canvasSubtitle.textContent = (data.prompt || 'Generated Artwork').slice(0, 45) + '...';
            if (elements.canvasTypeIcon) elements.canvasTypeIcon.setAttribute('data-lucide', 'image');
            if (elements.canvasMainImage) {
                elements.canvasMainImage.src = data.imageUrl || '';
                elements.canvasMainImage.setAttribute('data-src', data.imageUrl || '');
                elements.canvasMainImage.setAttribute('data-prompt', data.prompt || 'AI Artwork');
                elements.canvasMainImage.setAttribute('data-fallback', data.fallbackUrl || '');
                elements.canvasMainImage.onerror = function() {
                    const fb = this.getAttribute('data-fallback');
                    if (fb && this.src !== fb) {
                        this.src = fb;
                    } else if (this.src.includes('model=flux')) {
                        this.src = this.src.replace('model=flux', 'model=turbo');
                    } else {
                        this.onerror = null;
                        this.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&q=80';
                    }
                };
                elements.canvasMainImage.style.display = 'block';
            }
            if (elements.imageEmptyPlaceholder) elements.imageEmptyPlaceholder.style.display = 'none';
            if (elements.canvasImageActions) elements.canvasImageActions.style.display = 'flex';
            if (elements.imageStudioPromptInput) elements.imageStudioPromptInput.value = data.prompt || '';
            if (elements.canvasImagePrompt) {
                elements.canvasImagePrompt.innerHTML = `✨ <strong>Prompt:</strong> ${escapeHtml(data.prompt || '')}`;
            }
            if (elements.canvasRawCode) elements.canvasRawCode.textContent = JSON.stringify(data, null, 2);
            if (elements.canvasSourceLang) elements.canvasSourceLang.textContent = 'JSON';
            if (elements.canvasImageView) elements.canvasImageView.style.display = 'flex';

        } else if (type === 'doc') {
            if (elements.canvasTitle) elements.canvasTitle.textContent = data.title || 'Document & Code';
            if (elements.canvasSubtitle) elements.canvasSubtitle.textContent = data.subtitle || 'Live Markdown & Syntax View';
            if (elements.canvasTypeIcon) elements.canvasTypeIcon.setAttribute('data-lucide', 'file-code-2');
            if (elements.canvasDocType) elements.canvasDocType.textContent = (data.language || 'Markdown').toUpperCase();
            if (elements.canvasDocContent) elements.canvasDocContent.innerHTML = renderMarkdown(data.content || '');
            if (elements.canvasRawCode) elements.canvasRawCode.textContent = data.content || '';
            if (elements.canvasSourceLang) elements.canvasSourceLang.textContent = (data.language || 'TEXT').toUpperCase();
            if (elements.canvasDocView) elements.canvasDocView.style.display = 'flex';
        }

        if (window.lucide) lucide.createIcons();
    }

    function switchWorkspaceView(viewName) {
        state.activeWorkspaceView = viewName;
        const tabs = [
            { id: 'chat', tabEl: elements.viewTabChat, viewEl: elements.workspaceViewChat },
            { id: 'presentation', tabEl: elements.viewTabPresentation, viewEl: elements.workspaceViewPresentation },
            { id: 'image', tabEl: elements.viewTabImage, viewEl: elements.workspaceViewImage }
        ];

        tabs.forEach(t => {
            const isActive = (t.id === viewName);
            if (t.tabEl) t.tabEl.classList.toggle('active', isActive);
            if (t.viewEl) {
                t.viewEl.classList.toggle('active', isActive);
                t.viewEl.style.display = isActive ? 'flex' : 'none';
            }
        });

        // Close input popover if open
        if (elements.inputActionMenu) {
            elements.inputActionMenu.classList.remove('open');
        }

        if (viewName === 'presentation') {
            if (state.canvas.artifact && state.canvas.artifact.type === 'ppt' && state.canvas.artifact.data) {
                renderPptSlide(state.canvas.currentSlideIndex || 0);
            }
        }

        if (window.lucide) lucide.createIcons();
        playSound('click');
    }

    let fsControlsTimer = null;
    function showFullscreenControls() {
        const bar = elements.pptFullscreenControlBar || document.getElementById('pptFullscreenControlBar');
        if (!bar) return;
        const stageWrapper = elements.pptStageWrapper || document.getElementById('pptStageWrapper');
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || (stageWrapper && (stageWrapper.classList.contains('theater-mode') || stageWrapper.classList.contains('is-fullscreen'))));
        if (!isFs) {
            bar.classList.remove('visible');
            bar.style.opacity = '0';
            bar.style.pointerEvents = 'none';
            return;
        }

        bar.classList.add('visible');
        bar.style.opacity = '1';
        bar.style.pointerEvents = 'auto';

        if (fsControlsTimer) clearTimeout(fsControlsTimer);
        fsControlsTimer = setTimeout(() => {
            if (!bar.matches(':hover')) {
                bar.classList.remove('visible');
                bar.style.opacity = '0.2';
            }
        }, 3000);
    }

    function exitPresentationFullscreen() {
        const stageWrapper = elements.pptStageWrapper || document.getElementById('pptStageWrapper');
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exitFn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFn) {
                exitFn.call(document).catch(() => {});
            }
        }
        if (stageWrapper) {
            stageWrapper.classList.remove('theater-mode', 'is-fullscreen');
        }
        const bar = elements.pptFullscreenControlBar || document.getElementById('pptFullscreenControlBar');
        if (bar) {
            bar.classList.remove('visible');
            bar.style.opacity = '0';
            bar.style.pointerEvents = 'none';
        }
        if (elements.playerFullscreenIcon) elements.playerFullscreenIcon.setAttribute('data-lucide', 'maximize-2');
        if (elements.studioFullscreenIcon) elements.studioFullscreenIcon.setAttribute('data-lucide', 'maximize-2');
        if (window.lucide) lucide.createIcons();
    }

    function togglePresentationFullscreen() {
        const stageWrapper = elements.pptStageWrapper || document.getElementById('pptStageWrapper');
        if (!stageWrapper) return;

        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || stageWrapper.classList.contains('theater-mode') || stageWrapper.classList.contains('is-fullscreen'));

        if (isFs) {
            exitPresentationFullscreen();
        } else {
            const reqFs = stageWrapper.requestFullscreen || stageWrapper.webkitRequestFullscreen || stageWrapper.mozRequestFullScreen || stageWrapper.msRequestFullscreen;
            if (reqFs) {
                reqFs.call(stageWrapper).then(() => {
                    stageWrapper.classList.add('is-fullscreen');
                    showFullscreenControls();
                }).catch(err => {
                    console.warn('Native requestFullscreen failed, falling back to theater mode:', err);
                    stageWrapper.classList.add('theater-mode', 'is-fullscreen');
                    showFullscreenControls();
                });
            } else {
                stageWrapper.classList.add('theater-mode', 'is-fullscreen');
                showFullscreenControls();
            }
        }
    }

    function renderPptSlide(index) {
        const deck = state.canvas.artifact && state.canvas.artifact.data;
        if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) return;

        const slides = deck.slides;
        const total = slides.length;
        const currentIdx = Math.max(0, Math.min(index, total - 1));
        state.canvas.currentSlideIndex = currentIdx;

        const currentSlide = slides[currentIdx];
        let layoutType = String(currentSlide.layout || currentSlide.layout_type || 'split_image_content').toLowerCase();
        
        // Systematic preset mapping:
        if (currentIdx === 0 || layoutType === 'title' || layoutType === 'title_hero') {
            layoutType = 'title_hero';
        } else if (layoutType === 'metric_split' || layoutType === 'hero_stat') {
            layoutType = 'metric_split';
        } else if (layoutType === 'card_grid') {
            layoutType = 'card_grid';
        } else {
            layoutType = 'split_image_content';
        }

        const deckTitle = deck.deck_title || deck.title || 'Executive Presentation';
        const deckTheme = (deck.theme || 'dark_modern').toLowerCase();

        // Synchronize studio headers
        if (elements.pptDeckTitle) elements.pptDeckTitle.textContent = deckTitle;
        if (elements.pptDeckSubtitle) elements.pptDeckSubtitle.textContent = deck.subtitle || (deck.topic ? `Topic: ${deck.topic}` : '');
        if (elements.studioDeckTitle) elements.studioDeckTitle.textContent = deckTitle;
        if (elements.studioDeckSubtitle) elements.studioDeckSubtitle.textContent = `${total} Slides • Interactive 16:9 Canvas Player`;

        // Standardized zero-padded slide indicator: "Slide 03 / 08"
        const formattedCounter = `Slide ${String(currentIdx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        if (elements.pptSlideCounter) elements.pptSlideCounter.textContent = formattedCounter;

        // Layout badge indicator
        if (elements.pptLayoutBadge) {
            if (layoutType === 'title_hero') elements.pptLayoutBadge.textContent = 'TITLE HERO';
            else if (layoutType === 'split_image_content') elements.pptLayoutBadge.textContent = 'SPLIT IMAGE & CONTENT';
            else if (layoutType === 'metric_split') elements.pptLayoutBadge.textContent = 'METRIC SPLIT';
            else elements.pptLayoutBadge.textContent = '3-CARD GRID';
        }

        // Update Jump-to-Slide selector if present
        if (elements.pptJumpSelect) {
            if (elements.pptJumpSelect.children.length !== total) {
                elements.pptJumpSelect.innerHTML = slides.map((s, i) => {
                    const st = (s.slide_title || s.title || `Slide ${i + 1}`).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const shortSt = st.length > 25 ? st.slice(0, 22) + '...' : st;
                    return `<option value="${i}">Slide ${String(i + 1).padStart(2, '0')}: ${shortSt}</option>`;
                }).join('');
            }
            elements.pptJumpSelect.value = currentIdx;
        }

        // Button disabled states
        if (elements.pptPrevBtn) elements.pptPrevBtn.disabled = currentIdx === 0;
        if (elements.pptNextBtn) elements.pptNextBtn.disabled = currentIdx === total - 1;

        // Render Dots or Numbered Pill Strip
        if (elements.pptDotsNavigator) {
            const usePills = total > 7;
            elements.pptDotsNavigator.innerHTML = slides.map((_, i) => {
                if (usePills) {
                    return `<div class="ppt-pill ${i === currentIdx ? 'active' : ''}" data-index="${i}" title="Slide ${i + 1}">${i + 1}</div>`;
                }
                return `<div class="ppt-dot ${i === currentIdx ? 'active' : ''}" data-index="${i}" title="Slide ${i + 1}"></div>`;
            }).join('');

            elements.pptDotsNavigator.querySelectorAll(usePills ? '.ppt-pill' : '.ppt-dot').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-index'), 10);
                    renderPptSlide(idx);
                    playSound('click');
                });
            });

            const activeEl = elements.pptDotsNavigator.querySelector('.active');
            if (activeEl && typeof activeEl.scrollIntoView === 'function') {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }

        // Hide placeholder hero if active
        if (elements.studioHeroPlaceholder) {
            elements.studioHeroPlaceholder.style.display = 'none';
        }

        // Render Slide Stage into responsive 16:9 Canvas
        if (elements.pptSlideStage) {
            elements.pptSlideStage.className = 'ppt-slide-stage';
            if (deckTheme.includes('editorial') || deckTheme.includes('light')) {
                elements.pptSlideStage.classList.add('theme-editorial');
            } else if (deckTheme.includes('gradient') || deckTheme.includes('aurora')) {
                elements.pptSlideStage.classList.add('theme-aurora');
            } else {
                elements.pptSlideStage.classList.add('theme-dark-modern');
            }

            const badgeText = currentSlide.category || currentSlide.badge || (currentIdx === 0 ? 'EXECUTIVE BRIEFING' : `STRATEGIC PILLAR ${String(currentIdx).padStart(2, '0')}`);
            const slideTitle = currentSlide.slide_title || currentSlide.title || `Slide ${currentIdx + 1}`;
            const subtitle = currentSlide.subtitle || '';
            const rawCards = currentSlide.cards_or_points || currentSlide.cards || [];
            
            // Normalize cards to unified title, description, tag model
            const cards = rawCards.map((c, i) => ({
                title: c.title || c.label || `Pillar ${i + 1}`,
                description: c.description || c.detail || 'High-depth technical insight.',
                tag: c.tag || ''
            }));

            // -------------------------------------------------------------
            // PRESET 1: TITLE HERO SLIDE (Slide 1: Executive Headline + AI Visual)
            // -------------------------------------------------------------
            if (layoutType === 'title_hero') {
                const imgPrompt = currentSlide.image_prompt || currentSlide.visual_prompt || `${deckTitle} ${slideTitle}`;
                const imgUrl = currentSlide.image_url || buildContextualSlideImageUrl(currentSlide, deckTitle, currentIdx + 1);
                const seed = Math.abs(hashCode(`${deckTitle}_slide_${currentIdx + 1}`));
                const fallbackUrl = currentSlide.fallback_image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=900&height=550&nologo=true&seed=${seed}&model=turbo`;
                const objectiveText = currentSlide.objective || `Deliver an authoritative strategic briefing on ${deckTitle}.`;

                let bulletsList = [];
                if (Array.isArray(currentSlide.bullets) && currentSlide.bullets.length > 0) {
                    bulletsList = currentSlide.bullets;
                } else if (cards.length > 0) {
                    bulletsList = cards.map(c => `**${c.title}**: ${c.description}`);
                }

                const titleBulletsHtml = bulletsList.slice(0, 3).map(b => {
                    const bStr = String(b).trim();
                    if (bStr.includes(':')) {
                        const parts = bStr.split(':');
                        const k = parts[0].replace(/\*/g, '').trim();
                        const d = parts.slice(1).join(':').trim();
                        return `<div class="title-hero-bullet-card"><strong class="bullet-keyword">${escapeHtml(k)}:</strong> <span class="bullet-desc">${escapeHtml(d)}</span></div>`;
                    }
                    return `<div class="title-hero-bullet-card"><span class="bullet-desc">${escapeHtml(bStr.replace(/\*/g, ''))}</span></div>`;
                }).join('');

                elements.pptSlideStage.innerHTML = `
                    <div class="keynote-slide-container slide-template-title-hero">
                        <div class="title-hero-grid">
                            <div class="title-hero-left">
                                <div>
                                    <div class="header-top-meta" style="margin-bottom: 6px;">
                                        <span class="slide-badge-pill">${escapeHtml(badgeText)}</span>
                                        <span class="slide-number-tag">${formattedCounter}</span>
                                    </div>
                                    <h2 class="title-hero-headline">${escapeHtml(slideTitle)}</h2>
                                    <p class="title-hero-subheadline">${escapeHtml(subtitle || 'Executive Strategic Architecture & Validated Operational Roadmap')}</p>
                                    ${objectiveText ? `
                                    <div class="title-hero-objective">
                                        <i data-lucide="target"></i>
                                        <span><strong>STRATEGIC OBJECTIVE:</strong> ${escapeHtml(objectiveText)}</span>
                                    </div>` : ''}
                                </div>
                                <div class="title-hero-bullets-list">
                                    ${titleBulletsHtml}
                                </div>
                                <div class="title-meta-footer" style="margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                                    <div class="meta-item author-tag">
                                        <i data-lucide="sparkles"></i>
                                        <span>Created with ShiviAI</span>
                                    </div>
                                    <div class="meta-item">
                                        <i data-lucide="layers"></i>
                                        <span>${total} Slides</span>
                                    </div>
                                    <div class="meta-item">
                                        <i data-lucide="calendar"></i>
                                        <span>${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="title-hero-right">
                                ${renderSlideImageComponentHtml(currentSlide, deckTitle, currentIdx + 1, true)}
                            </div>
                        </div>
                        <div class="slide-keynote-footer">Shivi AI Presentation Studio • ${formattedCounter}</div>
                    </div>
                `;
            }
            // -------------------------------------------------------------
            // PRESET 2: SPLIT IMAGE & CONTENT SLIDE (3-4 Rich Bullets + AI Visual)
            // -------------------------------------------------------------
            else if (layoutType === 'split_image_content') {
                const imgPrompt = currentSlide.image_prompt || currentSlide.visual_prompt || `${deckTitle} ${slideTitle}`;
                const imgUrl = currentSlide.image_url || buildContextualSlideImageUrl(currentSlide, deckTitle, currentIdx + 1);
                const seed = Math.abs(hashCode(`${deckTitle}_slide_${currentIdx + 1}`));
                const fallbackUrl = currentSlide.fallback_image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=900&height=550&nologo=true&seed=${seed}&model=turbo`;
                const objectiveText = currentSlide.objective || '';

                let bulletsList = [];
                if (Array.isArray(currentSlide.bullets) && currentSlide.bullets.length > 0) {
                    bulletsList = currentSlide.bullets;
                } else if (cards.length > 0) {
                    bulletsList = cards.map(c => `**${c.title}**: ${c.description}`);
                }

                const bulletsHtml = bulletsList.slice(0, 4).map(b => {
                    const bStr = String(b).trim();
                    let keyword = 'Operational Vector';
                    let desc = bStr;
                    if (bStr.includes(':')) {
                        const parts = bStr.split(':');
                        keyword = parts[0].replace(/\*/g, '').trim();
                        desc = parts.slice(1).join(':').trim();
                    } else {
                        desc = bStr.replace(/\*/g, '').trim();
                    }
                    return `
                        <div class="bullet-item-card">
                            <strong class="bullet-keyword">${escapeHtml(keyword)}:</strong>
                            <span class="bullet-desc">${escapeHtml(desc)}</span>
                        </div>
                    `;
                }).join('');

                elements.pptSlideStage.innerHTML = `
                    <div class="keynote-slide-container slide-template-split-image">
                        <div class="slide-keynote-header">
                            <div class="header-top-meta">
                                <span class="slide-badge-pill">${escapeHtml(badgeText)}</span>
                                <span class="slide-number-tag">${formattedCounter}</span>
                            </div>
                            <h3 class="slide-headline">${escapeHtml(slideTitle)}</h3>
                            ${subtitle ? `<p class="slide-subheadline">${escapeHtml(subtitle)}</p>` : ''}
                        </div>
                        <div class="split-image-container">
                            <div class="split-cards-column" style="display: flex; flex-direction: column;">
                                ${objectiveText ? `
                                 <div class="slide-objective-card">
                                     <i data-lucide="crosshair"></i>
                                     <span><strong>CORE OBJECTIVE:</strong> ${escapeHtml(objectiveText)}</span>
                                 </div>` : ''}
                                <div class="split-bullets-group">
                                    ${bulletsHtml}
                                </div>
                            </div>
                            <div class="split-media-column">
                                ${renderSlideImageComponentHtml(currentSlide, deckTitle, currentIdx + 1, true)}
                            </div>
                        </div>
                        <div class="slide-keynote-footer">Shivi AI Presentation Studio • ${formattedCounter}</div>
                    </div>
                `;
            }
            // -------------------------------------------------------------
            // PRESET 3: METRIC / SPLIT SLIDE (Key stat left, 2 deep blocks right)
            // -------------------------------------------------------------
            else if (layoutType === 'metric_split') {
                const metric = currentSlide.highlight_metric || {
                    value: '+148%',
                    caption: 'Performance Benchmark',
                    detail: 'Empirical model leverage validated across enterprise deployments.'
                };
                const rightCards = cards.slice(0, 2);
                while (rightCards.length < 2) {
                    rightCards.push({
                        title: `Strategic Pillar ${rightCards.length + 1}`,
                        description: 'Operational orchestration minimizes execution latency while ensuring deterministic throughput across multi-node pipelines.',
                        tag: 'ORCHESTRATION'
                    });
                }

                const rightCardsHtml = rightCards.map(c => `
                    <div class="split-insight-block">
                        <div class="card-top-accent">
                            <span class="card-accent-tag">${escapeHtml(c.tag || 'DEEP MECHANIC')}</span>
                        </div>
                        <h5>${escapeHtml(c.title)}</h5>
                        <p>${escapeHtml(c.description)}</p>
                    </div>
                `).join('');

                elements.pptSlideStage.innerHTML = `
                    <div class="keynote-slide-container">
                        <div class="slide-keynote-header">
                            <div class="header-top-meta">
                                <span class="slide-badge-pill">${escapeHtml(badgeText)}</span>
                                <span class="slide-number-tag">${formattedCounter}</span>
                            </div>
                            <h3 class="slide-headline">${escapeHtml(slideTitle)}</h3>
                            ${subtitle ? `<p class="slide-subheadline">${escapeHtml(subtitle)}</p>` : ''}
                        </div>
                        <div class="split-metric-container">
                            <div class="metric-highlight-card">
                                <span class="metric-top-badge">KEY METRIC</span>
                                <div class="metric-giant-number">${escapeHtml(metric.value || '+148%')}</div>
                                <div class="metric-caption-text">${escapeHtml(metric.caption || 'Operational Acceleration')}</div>
                                <div class="metric-divider-line"></div>
                                <div class="metric-bottom-insight">${escapeHtml(metric.detail || 'Empirically grounded leverage point')}</div>
                            </div>
                            <div class="split-insights-column">
                                ${rightCardsHtml}
                            </div>
                        </div>
                        <div class="slide-keynote-footer">Shivi AI Presentation Studio • ${formattedCounter}</div>
                    </div>
                `;
            }
            // -------------------------------------------------------------
            // PRESET 4: 3-CARD GRID SLIDE (3 equal columns, rounded containers, tags)
            // -------------------------------------------------------------
            else {
                // Strictly 3 cards for clean 16:9 proportion
                const gridCards = cards.slice(0, 3);
                while (gridCards.length < 3) {
                    gridCards.push({
                        title: `Strategic Vector 0${gridCards.length + 1}`,
                        description: 'System architecture enforces predictable throughput and minimal latency overhead across execution boundaries.',
                        tag: 'ARCHITECTURE'
                    });
                }

                const cardsHtml = gridCards.map((c, i) => `
                    <div class="preset-card-box">
                        <div class="card-top-accent">
                            <span class="card-accent-tag">${escapeHtml(c.tag || `MECHANIC 0${i + 1}`)}</span>
                            <span class="card-index-num">0${i + 1}</span>
                        </div>
                        <h5>${escapeHtml(c.title)}</h5>
                        <p>${escapeHtml(c.description)}</p>
                    </div>
                `).join('');

                elements.pptSlideStage.innerHTML = `
                    <div class="keynote-slide-container">
                        <div class="slide-keynote-header">
                            <div class="header-top-meta">
                                <span class="slide-badge-pill">${escapeHtml(badgeText)}</span>
                                <span class="slide-number-tag">${formattedCounter}</span>
                            </div>
                            <h3 class="slide-headline">${escapeHtml(slideTitle)}</h3>
                            ${subtitle ? `<p class="slide-subheadline">${escapeHtml(subtitle)}</p>` : ''}
                        </div>
                        <div class="grid-3card-container">
                            ${cardsHtml}
                        </div>
                        <div class="slide-keynote-footer">Shivi AI Presentation Studio • ${formattedCounter}</div>
                    </div>
                `;
            }

            // Immediately reveal any cached images without skeleton flash
            elements.pptSlideStage.querySelectorAll('.slide-ai-visual-img').forEach(img => {
                if (img.complete && img.naturalWidth > 0) {
                    const skeleton = img.previousElementSibling;
                    if (skeleton && skeleton.classList.contains('slide-img-skeleton')) {
                        skeleton.style.display = 'none';
                    }
                    img.classList.add('loaded');
                }
            });

            // Pre-fetch at most the next slide (currentSlideIndex + 1) in background
            if (currentIdx + 1 < total) {
                prefetchNextSlideImage(deckTitle, slides[currentIdx + 1], currentIdx + 2);
            }

            if (window.lucide) lucide.createIcons();
        }

        // Speaker Notes Script
        if (elements.pptNotesContent) {
            elements.pptNotesContent.textContent = currentSlide.speaker_notes || 'No presenter notes provided for this slide.';
        }
    }

    function pptNextSlide() {
        if (!state.canvas.artifact || state.canvas.artifact.type !== 'ppt') return;
        const total = state.canvas.artifact.data.slides.length;
        if (state.canvas.currentSlideIndex < total - 1) {
            renderPptSlide(state.canvas.currentSlideIndex + 1);
            playSound('pop');
        }
    }

    function pptPrevSlide() {
        if (!state.canvas.artifact || state.canvas.artifact.type !== 'ppt') return;
        if (state.canvas.currentSlideIndex > 0) {
            renderPptSlide(state.canvas.currentSlideIndex - 1);
            playSound('pop');
        }
    }

    function pptFirstSlide() {
        if (!state.canvas.artifact || state.canvas.artifact.type !== 'ppt') return;
        renderPptSlide(0);
        playSound('pop');
    }

    function pptLastSlide() {
        if (!state.canvas.artifact || state.canvas.artifact.type !== 'ppt') return;
        const total = state.canvas.artifact.data.slides.length;
        renderPptSlide(total - 1);
        playSound('pop');
    }

    // PPT Quick Creation Modal
    function openPptModal() {
        if (elements.pptStudioModal) {
            elements.pptStudioModal.style.display = 'flex';
            if (elements.pptTopicInput) {
                elements.pptTopicInput.value = '';
                setTimeout(() => elements.pptTopicInput.focus(), 80);
            }
        }
        playSound('click');
    }

    function closePptModal() {
        if (elements.pptStudioModal) {
            elements.pptStudioModal.style.display = 'none';
        }
        playSound('click');
    }

    // Expose Global Studio Controller for HTML onclicks
    window.shiviStudio = {
        openPptInCanvas: function(deckId) {
            if (window._shiviDecks && window._shiviDecks[deckId]) {
                setCanvasArtifact('ppt', window._shiviDecks[deckId]);
                switchWorkspaceView('presentation');
                renderPptSlide(0);
            }
        },
        openImageInCanvas: function(imageData) {
            setCanvasArtifact('image', imageData);
            switchWorkspaceView('image');
        },
        openCanvas: openCanvas,
        closeCanvas: closeCanvas,
        toggleCanvas: toggleCanvas,
        switchWorkspaceView: switchWorkspaceView
    };

    // ==========================================
    // DOCUMENT & ATTACHMENT SYSTEM
    // ==========================================
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getFileCategory(name, type) {
        const ext = (name.split('.').pop() || '').toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || (type && String(type).startsWith('image/'))) return 'image';
        if (ext === 'pdf' || type === 'application/pdf') return 'pdf';
        if (['ppt', 'pptx'].includes(ext) || (type && String(type).includes('presentation')) || (type && String(type).includes('powerpoint'))) return 'presentation';
        if (['doc', 'docx'].includes(ext) || (type && String(type).includes('word')) || (type && String(type).includes('officedocument.wordprocessingml'))) return 'doc';
        if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'csv', 'sql', 'c', 'cpp', 'java', 'xml', 'yaml', 'yml', 'sh', 'bat', 'txt', 'md', 'log'].includes(ext)) return 'code';
        if (ext === 'gdrive' || type === 'application/vnd.google-apps') return 'gdrive';
        return 'doc';
    }

    async function extractPdfText(file) {
        if (!window.pdfjsLib) {
            return `[PDF File: ${file.name}, Size: ${formatFileSize(file.size)}. Reading basic metadata.]`;
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = `[PDF DOCUMENT: ${file.name} (${pdf.numPages} Pages)]\n`;
            const maxPages = Math.min(pdf.numPages, 30);
            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `\n--- Page ${pageNum} of ${pdf.numPages} ---\n` + pageText;
            }
            return fullText.trim() || `[PDF: ${file.name} (Contains ${pdf.numPages} pages, scanned image or no text extracted)]`;
        } catch (err) {
            console.error('PDF extraction error:', err);
            return `[PDF File: ${file.name} - Extraction note: ${err.message}]`;
        }
    }

    async function extractPptxText(file) {
        if (!window.JSZip) {
            return `[Presentation File: ${file.name}, Size: ${formatFileSize(file.size)}. PowerPoint presentation attached.]`;
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const slideFiles = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k));
            
            if (slideFiles.length === 0) {
                return `[PowerPoint Presentation: ${file.name} - Standard slides XML not found]`;
            }

            slideFiles.sort((a, b) => {
                const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
                const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
                return numA - numB;
            });

            let extracted = `[POWERPOINT PRESENTATION: ${file.name} (${slideFiles.length} Slides)]\n`;

            for (let i = 0; i < Math.min(slideFiles.length, 35); i++) {
                const xml = await zip.file(slideFiles[i]).async('text');
                
                // Extract paragraphs <a:p> and text runs <a:t>
                const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
                let pMatch;
                const paragraphs = [];
                while ((pMatch = pRegex.exec(xml)) !== null) {
                    const tRegex = /<a:t\b[^>]*>([^<]*)<\/a:t>/g;
                    let tMatch;
                    const words = [];
                    while ((tMatch = tRegex.exec(pMatch[1])) !== null) {
                        if (tMatch[1].trim()) words.push(tMatch[1].trim());
                    }
                    if (words.length > 0) paragraphs.push(words.join(' '));
                }

                // Check for speaker notes
                let notesText = '';
                const notePath = `ppt/notesSlides/notesSlide${i + 1}.xml`;
                if (zip.file(notePath)) {
                    try {
                        const noteXml = await zip.file(notePath).async('text');
                        const nRegex = /<a:t\b[^>]*>([^<]*)<\/a:t>/g;
                        let nMatch;
                        const nWords = [];
                        while ((nMatch = nRegex.exec(noteXml)) !== null) {
                            if (nMatch[1].trim() && !nMatch[1].trim().match(/^\d+$/)) {
                                nWords.push(nMatch[1].trim());
                            }
                        }
                        if (nWords.length > 0) {
                            notesText = ` [Speaker Notes: ${nWords.join(' ')}]`;
                        }
                    } catch(e) {}
                }

                extracted += `\n--- Slide ${i + 1} of ${slideFiles.length} ---\n`;
                if (paragraphs.length > 0) {
                    extracted += paragraphs.map((txt, idx) => idx === 0 ? `Slide Title: ${txt}` : `• ${txt}`).join('\n') + '\n';
                } else {
                    extracted += '(Visual or media slide with minimal text)\n';
                }
                if (notesText) extracted += notesText + '\n';
            }

            return extracted.trim();
        } catch (err) {
            console.error('PPTX extraction error:', err);
            return `[PowerPoint Presentation: ${file.name}, Size: ${formatFileSize(file.size)} - Note: ${err.message}]`;
        }
    }

    async function extractDocxText(file) {
        if (!window.JSZip) {
            return `[Word Document: ${file.name}, Size: ${formatFileSize(file.size)}]`;
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const docFile = zip.file('word/document.xml');
            if (!docFile) {
                return `[Word Document: ${file.name} - document.xml not found]`;
            }
            const xml = await docFile.async('text');
            const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
            let pMatch;
            const paragraphs = [];
            while ((pMatch = pRegex.exec(xml)) !== null) {
                const tRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
                let tMatch;
                const words = [];
                while ((tMatch = tRegex.exec(pMatch[1])) !== null) {
                    if (tMatch[1].trim()) words.push(tMatch[1]);
                }
                if (words.length > 0) paragraphs.push(words.join(''));
            }
            return `[WORD DOCUMENT: ${file.name}]\n` + paragraphs.join('\n\n');
        } catch (err) {
            console.error('DOCX extraction error:', err);
            return `[Word Document: ${file.name} - Extraction note: ${err.message}]`;
        }
    }

    async function processSelectedFiles(files) {
        if (!files || files.length === 0) return;
        const maxFiles = 8;
        const maxSizeBytes = 25 * 1024 * 1024; // 25MB

        if (state.currentAttachments.length + files.length > maxFiles) {
            showToast(`Maximum ${maxFiles} files can be attached at a time`, 'alert-circle');
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > maxSizeBytes) {
                showToast(`"${file.name}" exceeds 25MB limit`, 'alert-triangle');
                continue;
            }

            const category = getFileCategory(file.name, file.type);
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const attachmentId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

            // Add immediate uploading placeholder pill in attachment tray
            const uploadingPlaceholder = {
                id: attachmentId,
                name: file.name,
                size: file.size,
                formattedSize: formatFileSize(file.size),
                type: file.type || 'application/octet-stream',
                category: category,
                extension: ext,
                isUploading: true,
                uploadStatus: category === 'presentation' ? 'Extracting slides...' : (category === 'pdf' ? 'Reading PDF...' : 'Reading file...')
            };

            state.currentAttachments.push(uploadingPlaceholder);
            renderAttachmentPreviews();
            showToast(`Attaching ${file.name}...`, 'paperclip');

            try {
                let content = '';
                let previewUrl = '';

                if (category === 'image') {
                    content = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    previewUrl = content;
                } else if (category === 'pdf') {
                    content = await extractPdfText(file);
                } else if (category === 'presentation' || ext === 'pptx' || ext === 'ppt') {
                    content = await extractPptxText(file);
                } else if (category === 'doc' || ext === 'docx' || ext === 'doc') {
                    content = await extractDocxText(file);
                } else {
                    // Text / Code / Markdown / CSV / JSON
                    content = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });
                }

                // Replace placeholder with completed attachment
                const idx = state.currentAttachments.findIndex(a => a.id === attachmentId);
                if (idx !== -1) {
                    state.currentAttachments[idx] = {
                        id: attachmentId,
                        name: file.name,
                        size: file.size,
                        formattedSize: formatFileSize(file.size),
                        type: file.type || (category === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
                        category: category,
                        extension: ext,
                        content: content,
                        content_or_url: content,
                        previewUrl: previewUrl,
                        source: 'local',
                        isUploading: false
                    };
                }

                renderAttachmentPreviews();
                elements.sendBtn.disabled = false;
                playSound('pop');

            } catch (err) {
                console.error(`Error processing file ${file.name}:`, err);
                state.currentAttachments = state.currentAttachments.filter(a => a.id !== attachmentId);
                renderAttachmentPreviews();
                showToast(`Failed to parse ${file.name}`, 'alert-circle');
            }
        }
    }

    function renderAttachmentPreviews() {
        if (!elements.attachmentPreviewBar) return;

        if (!state.currentAttachments || state.currentAttachments.length === 0) {
            elements.attachmentPreviewBar.style.display = 'none';
            elements.attachmentPreviewBar.innerHTML = '';
            return;
        }

        elements.attachmentPreviewBar.style.display = 'flex';
        elements.attachmentPreviewBar.innerHTML = '';

        state.currentAttachments.forEach(att => {
            const chip = document.createElement('div');
            chip.className = `attachment-chip ${att.isUploading ? 'is-uploading' : ''} ${att.source === 'gdrive' ? 'is-gdrive' : ''}`;
            chip.setAttribute('data-id', att.id);

            let iconHtml = '<span class="att-type-icon doc"><i data-lucide="file-text"></i></span>';
            if (att.isUploading) {
                iconHtml = '<div class="att-spinner"></div>';
            } else if (att.source === 'gdrive' || att.category === 'gdrive') {
                iconHtml = '<span class="att-type-icon gdrive"><i data-lucide="cloud"></i></span>';
            } else if (att.category === 'image') {
                iconHtml = att.previewUrl 
                    ? `<img src="${att.previewUrl}" alt="Preview" class="attachment-chip-thumb" />` 
                    : '<span class="att-type-icon code"><i data-lucide="image"></i></span>';
            } else if (att.category === 'pdf') {
                iconHtml = '<span class="att-type-icon pdf"><i data-lucide="file-check-2"></i></span>';
            } else if (att.category === 'presentation' || att.extension === 'pptx' || att.extension === 'ppt') {
                iconHtml = '<span class="att-type-icon ppt"><i data-lucide="presentation"></i></span>';
            } else if (att.category === 'doc' || att.extension === 'docx') {
                iconHtml = '<span class="att-type-icon doc"><i data-lucide="file-text"></i></span>';
            } else if (att.category === 'code') {
                iconHtml = '<span class="att-type-icon code"><i data-lucide="code-2"></i></span>';
            }

            const sizeText = att.isUploading 
                ? (att.uploadStatus || 'Processing...') 
                : (att.source === 'gdrive' ? 'Google Drive' : (att.formattedSize || ''));

            chip.innerHTML = `
                <div class="attachment-chip-icon">${iconHtml}</div>
                <div class="attachment-chip-info">
                    <span class="attachment-chip-name" title="${escapeHtml(att.name)}">${escapeHtml(att.name)}</span>
                    <span class="attachment-chip-size ${att.isUploading ? 'status-text' : ''}">${sizeText}</span>
                </div>
                <button type="button" class="attachment-chip-remove" data-id="${att.id}" title="${att.isUploading ? 'Cancel' : 'Remove attachment'}">
                    <i data-lucide="x"></i>
                </button>
            `;

            chip.querySelector('.attachment-chip-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removeAttachment(att.id);
            });

            elements.attachmentPreviewBar.appendChild(chip);
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function removeAttachment(id) {
        state.currentAttachments = (state.currentAttachments || []).filter(a => a.id !== id);
        renderAttachmentPreviews();
        if (state.currentAttachments.length === 0 && !elements.userInput.value.trim()) {
            elements.sendBtn.disabled = true;
        }
        playSound('click');
    }

    // ==========================================
    // GOOGLE DRIVE INTEGRATION SYSTEM
    // ==========================================
    function parseGoogleDriveUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        const url = rawUrl.trim();
        
        let fileId = null;
        let fileType = 'Google Drive File';
        let category = 'gdrive';
        let icon = 'cloud';
        let defaultTitle = 'Google Drive Document';

        // 1. Google Slides: /presentation/d/([a-zA-Z0-9_-]+)
        const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
        if (slidesMatch) {
            fileId = slidesMatch[1];
            fileType = 'Google Slides Presentation';
            category = 'presentation';
            icon = 'presentation';
            defaultTitle = 'Google Presentation Deck';
        }

        // 2. Google Docs: /document/d/([a-zA-Z0-9_-]+)
        const docsMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (docsMatch) {
            fileId = docsMatch[1];
            fileType = 'Google Docs Document';
            category = 'doc';
            icon = 'file-text';
            defaultTitle = 'Google Docs Document';
        }

        // 3. Google Sheets: /spreadsheets/d/([a-zA-Z0-9_-]+)
        const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (sheetsMatch) {
            fileId = sheetsMatch[1];
            fileType = 'Google Sheets Spreadsheet';
            category = 'code';
            icon = 'table';
            defaultTitle = 'Google Sheets Dataset';
        }

        // 4. Google Drive File: /file/d/([a-zA-Z0-9_-]+) or ?id=([a-zA-Z0-9_-]+)
        const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveFileMatch) {
            fileId = driveFileMatch[1];
            fileType = 'Google Drive Shared File';
            category = 'gdrive';
            icon = 'hard-drive';
            defaultTitle = 'Drive File (' + fileId.substring(0, 6) + '...)';
        }

        if (!fileId && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
            return {
                url: url,
                fileId: 'cloud_res_' + Date.now(),
                fileType: 'Google Drive Resource',
                category: 'gdrive',
                icon: 'cloud',
                defaultTitle: 'Google Drive Linked Resource'
            };
        }

        if (!fileId) return null;

        return {
            url: url,
            fileId: fileId,
            fileType: fileType,
            category: category,
            icon: icon,
            defaultTitle: defaultTitle
        };
    }

    function openGoogleDriveModal() {
        if (!elements.googleDriveModal) return;
        elements.googleDriveModal.style.display = 'flex';
        
        // Restore saved API credentials if any
        if (elements.gdriveApiKeyInput) {
            elements.gdriveApiKeyInput.value = localStorage.getItem('shivi_gdrive_api_key') || '';
        }
        if (elements.gdriveClientIdInput) {
            elements.gdriveClientIdInput.value = localStorage.getItem('shivi_gdrive_client_id') || '';
        }

        if (elements.gdriveLinkInput) {
            elements.gdriveLinkInput.value = '';
            setTimeout(() => elements.gdriveLinkInput.focus(), 80);
        }
        if (elements.gdriveFileNameInput) {
            elements.gdriveFileNameInput.value = '';
        }
        if (elements.gdriveDetectionCard) {
            elements.gdriveDetectionCard.style.display = 'none';
        }
        playSound('click');
        if (window.lucide) lucide.createIcons();
    }

    function closeGoogleDriveModal() {
        if (!elements.googleDriveModal) return;
        elements.googleDriveModal.style.display = 'none';
    }

    function updateGoogleDriveDetection() {
        if (!elements.gdriveLinkInput || !elements.gdriveDetectionCard) return;
        const val = elements.gdriveLinkInput.value.trim();
        const detected = parseGoogleDriveUrl(val);

        if (detected) {
            elements.gdriveDetectionCard.style.display = 'block';
            if (elements.gdriveDetectName) {
                elements.gdriveDetectName.textContent = elements.gdriveFileNameInput && elements.gdriveFileNameInput.value.trim() 
                    ? elements.gdriveFileNameInput.value.trim() 
                    : detected.defaultTitle;
            }
            if (elements.gdriveDetectType) {
                elements.gdriveDetectType.textContent = detected.fileType;
            }
            if (elements.gdriveDetectIcon) {
                let emoji = '☁️';
                if (detected.category === 'presentation') emoji = '📊';
                else if (detected.category === 'doc') emoji = '📄';
                else if (detected.category === 'code') emoji = '📈';
                elements.gdriveDetectIcon.textContent = emoji;
            }
        } else {
            elements.gdriveDetectionCard.style.display = 'none';
        }
    }

    function confirmGoogleDriveAttachment() {
        if (!elements.gdriveLinkInput) return;
        const link = elements.gdriveLinkInput.value.trim();
        if (!link) {
            showToast('Please paste a Google Drive or Docs link', 'alert-circle');
            elements.gdriveLinkInput.focus();
            return;
        }

        const detected = parseGoogleDriveUrl(link) || {
            url: link,
            fileId: 'gdrive_' + Date.now(),
            fileType: 'Google Drive Link',
            category: 'gdrive',
            defaultTitle: 'Google Drive File'
        };

        const customName = elements.gdriveFileNameInput ? elements.gdriveFileNameInput.value.trim() : '';
        const fileName = customName || detected.defaultTitle;
        const attachmentId = 'att_gdrive_' + Date.now();

        state.currentAttachments.push({
            id: attachmentId,
            name: fileName,
            size: 0,
            formattedSize: 'Google Drive',
            type: 'application/vnd.google-apps',
            category: detected.category,
            extension: 'gdrive',
            content: `[Google Drive Resource: ${fileName}]\nType: ${detected.fileType}\nLink: ${detected.url}`,
            content_or_url: detected.url,
            url: detected.url,
            source: 'gdrive',
            isUploading: false
        });

        renderAttachmentPreviews();
        elements.sendBtn.disabled = false;
        closeGoogleDriveModal();
        showToast(`Attached from Google Drive: ${fileName}`, 'check');
        playSound('pop');
    }

    function initGoogleDrivePicker() {
        const apiKey = (elements.gdriveApiKeyInput ? elements.gdriveApiKeyInput.value.trim() : '') || localStorage.getItem('shivi_gdrive_api_key');
        const clientId = (elements.gdriveClientIdInput ? elements.gdriveClientIdInput.value.trim() : '') || localStorage.getItem('shivi_gdrive_client_id');

        if (!apiKey || !clientId) {
            showToast('Enter Google API Key & Client ID in Settings below, or paste the Drive link directly above!', 'alert-circle');
            return;
        }

        if (typeof gapi === 'undefined') {
            showToast('Google API library is still loading. Please paste the direct share link.', 'alert-triangle');
            return;
        }

        try {
            gapi.load('picker', {
                callback: () => {
                    const picker = new google.picker.PickerBuilder()
                        .addView(google.picker.ViewId.DOCS)
                        .setDeveloperKey(apiKey)
                        .setCallback((data) => {
                            if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                                const doc = data[google.picker.Response.DOCUMENTS][0];
                                const docName = doc[google.picker.Document.NAME];
                                const docUrl = doc[google.picker.Document.URL];
                                const docId = doc[google.picker.Document.ID];
                                const mimeType = doc[google.picker.Document.MIME_TYPE];

                                state.currentAttachments.push({
                                    id: 'att_gdrive_' + Date.now(),
                                    name: docName || 'Google Drive File',
                                    size: doc[google.picker.Document.SIZE_BYTES] || 0,
                                    formattedSize: 'Google Drive',
                                    type: mimeType || 'application/vnd.google-apps',
                                    category: getFileCategory(docName, mimeType),
                                    extension: 'gdrive',
                                    content: `[Google Drive File: ${docName}]\nMIME: ${mimeType}\nURL: ${docUrl}\nID: ${docId}`,
                                    content_or_url: docUrl,
                                    url: docUrl,
                                    source: 'gdrive',
                                    isUploading: false
                                });

                                renderAttachmentPreviews();
                                elements.sendBtn.disabled = false;
                                closeGoogleDriveModal();
                                showToast(`Imported ${docName} from Drive`, 'check');
                                playSound('pop');
                            }
                        })
                        .build();
                    picker.setVisible(true);
                }
            });
        } catch (err) {
            console.error('Google Picker initialization failed:', err);
            showToast('Picker API error: ' + err.message, 'alert-circle');
        }
    }

    function appendMessageToDOM(msg, index) {
        const row = document.createElement('div');
        row.className = `message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`;
        
        const isUser = msg.role === 'user';
        const formattedTime = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (isUser) {
            let attachmentsHtml = '';
            if (msg.attachments && msg.attachments.length > 0) {
                attachmentsHtml = `
                    <div class="msg-attachments-wrapper">
                        ${msg.attachments.map(att => {
                            if (att.category === 'image' && att.previewUrl) {
                                return `
                                    <div class="msg-attachment-badge is-image" title="${escapeHtml(att.name)}">
                                        <i data-lucide="image"></i>
                                        <span>${escapeHtml(att.name)}</span>
                                        <img src="${att.previewUrl}" class="msg-attachment-thumb" alt="${escapeHtml(att.name)}" onclick="window.open('${att.previewUrl}', '_blank')" />
                                    </div>
                                `;
                            }
                            let iconName = 'file-text';
                            let extraClass = '';
                            if (att.category === 'pdf') {
                                iconName = 'file-check-2';
                                extraClass = 'is-pdf';
                            } else if (att.category === 'presentation' || att.extension === 'pptx' || att.extension === 'ppt') {
                                iconName = 'presentation';
                                extraClass = 'is-ppt';
                            } else if (att.source === 'gdrive' || att.category === 'gdrive') {
                                iconName = 'cloud';
                                extraClass = 'is-gdrive';
                            } else if (att.category === 'code') {
                                iconName = 'code-2';
                                extraClass = 'is-code';
                            }
                            
                            const clickAction = (att.source === 'gdrive' && att.content_or_url)
                                ? `onclick="window.open('${escapeHtml(att.content_or_url)}', '_blank')"`
                                : '';
                            return `
                                <div class="msg-attachment-badge ${extraClass}" title="${escapeHtml(att.name)} (${att.formattedSize || ''})" ${clickAction}>
                                    <i data-lucide="${iconName}"></i>
                                    <span>${escapeHtml(att.name)}</span>
                                    <span style="opacity: 0.7; font-size: 0.72rem;">(${att.formattedSize || (att.source === 'gdrive' ? 'Google Drive' : '')})</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }

            row.innerHTML = `
                <div class="msg-avatar user-avatar">U</div>
                <div class="msg-bubble-wrapper">
                    <div class="msg-bubble user-msg">
                        ${attachmentsHtml}
                        <div>${escapeHtml(msg.content)}</div>
                    </div>
                    <div class="msg-meta-row">
                        <span>${formattedTime}</span>
                    </div>
                </div>
            `;
        } else {
            let bodyHtml = '';
            if (msg.isImage && msg.imageData) {
                bodyHtml = renderImageCardHtml(msg.imageData);
            } else if (msg.isPresentation && msg.deckData) {
                bodyHtml = `<div>${renderMarkdown(msg.content)}</div>` + renderPresentationCardHtml(msg.deckData);
            } else {
                bodyHtml = renderMarkdown(msg.content);
            }

            row.innerHTML = `
                <div class="msg-avatar ai-avatar">S</div>
                <div class="msg-bubble-wrapper">
                    <div class="msg-bubble ai-msg">${bodyHtml}</div>
                    <div class="msg-meta-row">
                        <span>${formattedTime}</span>
                        <div class="msg-actions">
                            <button class="msg-action-btn copy-msg-btn" title="Copy response" data-content="${escapeHtml(msg.content)}">
                                <i data-lucide="copy"></i>
                            </button>
                            <button class="msg-action-btn speak-msg-btn" title="Read Aloud" data-content="${escapeHtml(msg.content)}" data-msg-id="${msg.id || ('msg_' + index)}">
                                <i data-lucide="volume-2"></i>
                                <span class="speak-btn-label">Listen</span>
                            </button>
                            <button class="msg-action-btn like-btn" title="Helpful response">
                                <i data-lucide="thumbs-up"></i>
                            </button>
                            <button class="msg-action-btn dislike-btn" title="Not helpful">
                                <i data-lucide="thumbs-down"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        elements.messagesList.appendChild(row);

        if (window.lucide) {
            lucide.createIcons();
        }

        if (!isUser) {
            // Clickable Image Preview -> Open Lightbox
            row.querySelectorAll('.clickable-preview').forEach(img => {
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const src = img.getAttribute('data-src') || img.src;
                    const prompt = img.getAttribute('data-prompt') || 'AI Artwork';
                    openImageLightbox(src, prompt);
                });
            });

            // Image card button actions
            row.querySelectorAll('.download-img-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = btn.getAttribute('data-url');
                    const p = btn.getAttribute('data-prompt') || 'ai-artwork';
                    const fname = `shivi_${p.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
                    downloadImageDirect(url, fname);
                });
            });

            row.querySelectorAll('.open-img-canvas-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    try {
                        const dataStr = btn.getAttribute('data-img-data');
                        if (dataStr) {
                            const imgData = JSON.parse(dataStr);
                            openCanvas('image', imgData);
                        }
                    } catch (err) {
                        console.error('Failed to parse image data for canvas', err);
                    }
                });
            });

            row.querySelectorAll('.copy-img-url-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = btn.getAttribute('data-url');
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Image link copied to clipboard!', 'check');
                        playSound('click');
                    });
                });
            });

            const copyBtn = row.querySelector('.copy-msg-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(msg.content).then(() => {
                        showToast('Message copied to clipboard!', 'check');
                        playSound('click');
                    });
                });
            }

            const speakBtn = row.querySelector('.speak-msg-btn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => {
                    const msgId = speakBtn.getAttribute('data-msg-id') || msg.id;
                    if (window.voiceService && window.voiceService.isSpeaking && window.voiceService.currentlySpeakingMsgId === msgId) {
                        stopSpeakingVoice();
                    } else {
                        speakText(msg.content, msgId);
                    }
                });
            }

            const likeBtn = row.querySelector('.like-btn');
            const dislikeBtn = row.querySelector('.dislike-btn');
            if (likeBtn && dislikeBtn) {
                likeBtn.addEventListener('click', () => {
                    likeBtn.classList.toggle('active-like');
                    dislikeBtn.classList.remove('active-dislike');
                    playSound('click');
                });
                dislikeBtn.addEventListener('click', () => {
                    dislikeBtn.classList.toggle('active-dislike');
                    likeBtn.classList.remove('active-like');
                    playSound('click');
                });
            }

            row.querySelectorAll('.copy-code-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const code = btn.getAttribute('data-code');
                    navigator.clipboard.writeText(code).then(() => {
                        btn.querySelector('span').textContent = 'Copied!';
                        showToast('Code copied to clipboard!', 'check');
                        playSound('click');
                        setTimeout(() => {
                            btn.querySelector('span').textContent = 'Copy';
                        }, 2000);
                    });
                });
            });
        }
    }

    function scrollToBottom() {
        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    }

    // ==========================================
    // AI IMAGE GENERATOR CONTROLLER
    // ==========================================
    function openImageStudioModal(initialPrompt = '') {
        if (elements.imagePromptInput) {
            elements.imagePromptInput.value = initialPrompt;
        }
        if (elements.modalImageStyleSelect) {
            elements.modalImageStyleSelect.value = state.defaultImageStyle || 'vivid';
        }
        if (elements.modalImageSizeSelect) {
            elements.modalImageSizeSelect.value = state.defaultImageSize || '1024x1024';
        }
        if (elements.imageGenModal) {
            elements.imageGenModal.classList.add('open');
            setTimeout(() => {
                if (elements.imagePromptInput) elements.imagePromptInput.focus();
            }, 100);
        }
        playSound('click');
    }

    function closeImageStudioModal() {
        if (elements.imageGenModal) {
            elements.imageGenModal.classList.remove('open');
        }
        playSound('click');
    }

    async function generateAiImage(rawPrompt, options = {}) {
        const prompt = (rawPrompt || '').trim();
        if (!prompt || state.isGenerating) return;

        stopSpeakingVoice();
        closeImageStudioModal();

        let session = getCurrentSession();
        if (!session) {
            session = createNewSession();
        }

        if (session.messages.length === 0) {
            session.title = `🎨 ${prompt.length > 24 ? prompt.substring(0, 24) + '...' : prompt}`;
            renderHistoryList();
        }

        // Add user message to chat
        const userMsg = {
            role: 'user',
            content: `🎨 **Generate Image:** ${prompt}`,
            timestamp: new Date().toISOString()
        };
        session.messages.push(userMsg);
        saveState();

        elements.welcomeHero.style.display = 'none';
        appendMessageToDOM(userMsg, session.messages.length - 1);
        scrollToBottom();
        playSound('send');

        // Show generating shimmer skeleton and open Canvas Studio
        state.isGenerating = true;
        elements.sendBtn.disabled = true;

        openCanvas('loading', {
            title: 'Generating AI Masterpiece...',
            subtitle: `Rendering "${prompt.slice(0, 45)}..."`
        });

        const tempSkeletonRow = document.createElement('div');
        tempSkeletonRow.className = 'message-row ai-row';
        tempSkeletonRow.id = 'imageGenSkeletonRow';
        tempSkeletonRow.innerHTML = `
            <div class="msg-avatar ai-avatar">S</div>
            <div class="msg-bubble-wrapper" style="max-width: 580px; width: 100%;">
                <div class="image-generating-skeleton">
                    <div class="image-generating-spinner"></div>
                    <div class="image-generating-label">Creating your AI Masterpiece...</div>
                    <div class="image-generating-subtext">Rendering "${escapeHtml(prompt.length > 55 ? prompt.substring(0, 55) + '...' : prompt)}"</div>
                </div>
            </div>
        `;
        elements.messagesList.appendChild(tempSkeletonRow);
        scrollToBottom();

        try {
            const provider = options.provider || state.imageProvider || 'pollinations';
            const apiKey = (options.apiKey || state.imageApiKey || state.apiKeys.openai || '').trim();
            const style = options.style || state.defaultImageStyle || 'vivid';
            const size = options.size || state.defaultImageSize || '1280x720';

            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    provider: provider,
                    apiKey: apiKey,
                    style: style,
                    size: size
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Image generation failed with status ${res.status}`);
            }

            const data = await res.json();
            if (!data.imageUrl) {
                throw new Error('No image URL returned from generator.');
            }

            tempSkeletonRow.remove();

            const imageArtifactData = {
                imageUrl: data.imageUrl,
                fallbackUrl: data.fallbackUrl || (typeof buildFastFallbackImageUrl === 'function' ? buildFastFallbackImageUrl(prompt) : ''),
                prompt: prompt,
                revisedPrompt: data.revisedPrompt || prompt,
                provider: data.provider || provider,
                model: data.model || 'flux',
                timestamp: data.timestamp || new Date().toISOString()
            };

            // Render live in Canvas Studio
            setCanvasArtifact('image', imageArtifactData);

            const aiMsg = {
                role: 'assistant',
                content: `Here is your generated image for: "${prompt}"`,
                isImage: true,
                imageData: imageArtifactData,
                timestamp: new Date().toISOString()
            };

            session.messages.push(aiMsg);
            saveState();

            appendMessageToDOM(aiMsg, session.messages.length - 1);
            scrollToBottom();
            playSound('receive');
            showToast('AI Image generated!', 'image');

        } catch (err) {
            console.error('Image generation error:', err);
            tempSkeletonRow.remove();

            const errorMsg = {
                role: 'assistant',
                content: `⚠️ **Image Generation Error:** ${err.message}\n\n💡 **Tip:** Open **Brain Hub (🧠) ➔ Image Generator** to configure or test your **OpenAI / Stability** API Key, or switch to **Pollinations (100% Free)** for instant keyless generation.`,
                timestamp: new Date().toISOString()
            };
            session.messages.push(errorMsg);
            saveState();
            appendMessageToDOM(errorMsg, session.messages.length - 1);
            scrollToBottom();
            showToast('Failed to generate image', 'alert-triangle');
        } finally {
            state.isGenerating = false;
            elements.sendBtn.disabled = !elements.userInput.value.trim();
        }
    }

    // ==========================================
    // AGENTIC INTENT ROUTER (TOOL CALLING)
    // ==========================================
    function detectIntent(text) {
        const t = (text || '').trim();
        if (!t) return { type: 'CHAT' };

        // 1. Tool Call: Image Generation
        const isImageSlash = /^\/(image|draw|imagine|pic|art)\s+/i.test(t);
        const isImageNatural = /^(?:generate|create|draw|make|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|drawing|portrait|wallpaper)\s+(?:of|for|about|depicting)\s+(.+)/i.test(t)
            || /^(?:draw|paint|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?(.+)/i.test(t)
            || /^(?:picture|photo|image|portrait|illustration)\s+(?:of|for)\s+(.+)/i.test(t)
            || /^(?:mujhe\s+)?(?:ek\s+)?(?:photo|image|tasveer|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)\s*(?:of|ki|ka)?\s*(.+)?/i.test(t)
            || /(?:photo|image|tasveer|picture)\s+(?:banao|generate karo|create karo)/i.test(t);

        if (isImageSlash || isImageNatural) {
            let prompt = t;
            if (isImageSlash) {
                prompt = t.replace(/^\/(image|draw|imagine|pic|art)\s+/i, '').trim();
            } else {
                prompt = t.replace(/^(?:generate|create|draw|make|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|drawing|portrait|wallpaper)\s+(?:of|for|about|depicting)\s+/i, '')
                          .replace(/^(?:draw|paint|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?/i, '')
                          .replace(/^(?:picture|photo|image|portrait|illustration)\s+(?:of|for)\s+/i, '')
                          .replace(/^(?:mujhe\s+)?(?:ek\s+)?(?:photo|image|tasveer|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)\s*(?:of|ki|ka)?\s*/i, '')
                          .trim();
            }
            return { type: 'IMAGE', prompt: prompt || t };
        }

        // 2. Tool Call: Presentation / PPT Generation (.pptx)
        const isPptExplicitSlash = /^\/(ppt|presentation|slides|deck)(?:\s+(.*))?$/i.exec(t);
        const isPptNatural = /(?:create|make|generate|build|draft|prepare)\s+(?:a\s+)?(?:(\d+)[ -]slide\s+)?(?:presentation|ppt|powerpoint|slide deck|slides)\s+(?:on|about|for)\s+(.+)/i.test(t)
            || /(?:presentation|ppt|powerpoint|slides)\s+(?:on|about|for)\s+(.+)/i.test(t)
            || /(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)\s*(?:about|on|par)?\s*(.+)?/i.test(t)
            || /^(?:create\s+)?(?:ppt|presentation|slides|slide\s+deck)\s*$/i.test(t)
            || /(?:ppt|presentation)\s+(?:banao|create karo|chahiye)/i.test(t);

        if (isPptExplicitSlash) {
            const rawTopic = (isPptExplicitSlash[2] || '').trim();
            if (!rawTopic) {
                return { type: 'PPT_PROMPT' };
            }
            const slideMatch = rawTopic.match(/(\d+)\s*(?:slides?|slide deck)/i);
            const slideCount = slideMatch && slideMatch[1] ? Math.min(20, Math.max(5, parseInt(slideMatch[1], 10))) : null;
            let cleanTopic = rawTopic
                .replace(/(?:^|\s)(?:(\d+)\s*(?:slides?|slide deck)|(?:on|about|for)\s+(\d+)\s*(?:slides?|slide deck))\s*(?:on|about|for)?\s*/gi, ' ')
                .replace(/\s*(?:on|about|for)?\s*(\d+)\s*(?:slides?|slide deck)\s*$/gi, '')
                .replace(/^(?:on|about|for)\s+/i, '')
                .trim();
            if (!cleanTopic) cleanTopic = rawTopic;
            return { type: 'PRESENTATION', topic: cleanTopic, slideCount: slideCount };
        }

        if (isPptNatural) {
            let topic = t
                .replace(/(?:create|make|generate|build|draft|prepare)\s+(?:a\s+)?(?:(\d+)[ -]slide\s+)?(?:presentation|ppt|powerpoint|slide deck|slides)\s+(?:on|about|for)\s+/i, '')
                .replace(/(?:presentation|ppt|powerpoint|slides)\s+(?:on|about|for)\s+/i, '')
                .replace(/(?:par|on|about)\s+(?:ek\s+)?(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)/i, '')
                .replace(/(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)\s*(?:about|on|par)?\s*/i, '')
                .replace(/^(?:create\s+)?(?:ppt|presentation|slides|slide\s+deck)\s*$/i, '')
                .trim();

            if (!topic) {
                return { type: 'PPT_PROMPT' };
            }
            const slideMatch = t.match(/(\d+)\s*(?:slides?|slide deck)/i);
            const slideCount = slideMatch && slideMatch[1] ? Math.min(20, Math.max(5, parseInt(slideMatch[1], 10))) : null;
            return { type: 'PRESENTATION', topic: topic, slideCount: slideCount };
        }

        // 3. Tool Call: Live Voice Continuous Hands-Free Mode
        const isVoiceSlash = /^\/(voice|live|call|talk|speak|listen)\b/i.test(t);
        const isVoiceNatural = /^(?:start|open|launch|enable|activate|switch\s+to)\s+(?:live\s+)?(?:voice|call|conversation|talk)(?:\s+mode)?$/i.test(t)
            || /^(?:baat\s+karo|aawaz\s+se\s+baat\s+karo|voice\s+mode\s+chalu\s+karo)$/i.test(t);

        if (isVoiceSlash || isVoiceNatural) {
            return { type: 'LIVE_VOICE' };
        }

        return { type: 'CHAT' };
    }

    // ==========================================
    // PRESENTATION GENERATION CONTROLLER
    // ==========================================
    async function generatePresentation(topic, slideCount = null, theme = 'modern_blue') {
        if (state.isGenerating) return;

        const cleanTopic = (topic || '').trim();
        if (!cleanTopic) {
            elements.userInput.value = '/ppt ';
            elements.userInput.placeholder = 'What topic should ShiviAI create a presentation on?';
            elements.userInput.focus();
            showToast('Please provide a presentation topic', 'alert-circle');
            return;
        }

        stopSpeakingVoice();
        state.isGenerating = true;
        elements.sendBtn.disabled = true;

        let session = getCurrentSession();
        if (!session) {
            session = createNewSession();
        }

        const userPrompt = slideCount
            ? `Create a ${slideCount}-slide presentation on: "${cleanTopic}"`
            : `Create a comprehensive presentation on: "${cleanTopic}"`;
        const userMsg = {
            role: 'user',
            content: userPrompt,
            timestamp: new Date().toISOString()
        };
        session.messages.push(userMsg);
        saveState();

        elements.welcomeHero.style.display = 'none';
        appendMessageToDOM(userMsg, session.messages.length - 1);
        scrollToBottom();

        // Transition to dedicated Presentation Studio workspace
        state.canvas.isGeneratingPPT = true;
        switchWorkspaceView('presentation');
        if (elements.studioLoadingState) elements.studioLoadingState.style.display = 'flex';
        if (elements.studioPlayerContainer) elements.studioPlayerContainer.style.display = 'none';
        if (elements.studioLoadingTitle) elements.studioLoadingTitle.textContent = `Architecting Presentation: "${cleanTopic.slice(0, 45)}..."`;

        // Explicit status badge and step indicators in Chat
        const tempSkeletonRow = document.createElement('div');
        tempSkeletonRow.className = 'message-row ai-row';
        tempSkeletonRow.innerHTML = `
            <div class="msg-avatar ai-avatar">S</div>
            <div class="msg-bubble-wrapper" style="width: 100%; max-width: 600px;">
                <div class="msg-bubble ai-msg chat-ppt-progress-bubble">
                    <div class="chat-ppt-top-row">
                        <div class="spinner-sm" style="width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-top-color: #f97316; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <strong style="color: #f97316; font-size: 0.88rem;">✨ ShiviAI is architecting your 16:9 presentation in Presentation Studio...</strong>
                    </div>
                    <div class="ppt-steps-flow" style="margin-top: 8px;">
                        <span class="ppt-step-item active" id="chatPptStep1"><span class="step-num">[1/3]</span> Researching Topic</span>
                        <span class="step-arrow">➔</span>
                        <span class="ppt-step-item" id="chatPptStep2"><span class="step-num">[2/3]</span> Generating Deep Content</span>
                        <span class="step-arrow">➔</span>
                        <span class="ppt-step-item" id="chatPptStep3"><span class="step-num">[3/3]</span> Styling 16:9 Canvas</span>
                    </div>
                </div>
            </div>
        `;
        elements.messagesList.appendChild(tempSkeletonRow);
        scrollToBottom();

        // Step ticker keeping both Presentation Studio & Chat synchronized
        let currentStep = 1;
        const stepTimer = setInterval(() => {
            if (currentStep < 3) {
                currentStep++;
                // Update Presentation Studio steps
                const studioSteps = [elements.studioStep1, elements.studioStep2, elements.studioStep3];
                studioSteps.forEach((sEl, sIdx) => {
                    if (!sEl) return;
                    const num = sIdx + 1;
                    sEl.classList.remove('active', 'done');
                    if (num < currentStep) sEl.classList.add('done');
                    else if (num === currentStep) sEl.classList.add('active');
                });

                // Update Chat steps
                const chatSteps = [
                    document.getElementById('chatPptStep1'),
                    document.getElementById('chatPptStep2'),
                    document.getElementById('chatPptStep3')
                ];
                chatSteps.forEach((sEl, sIdx) => {
                    if (!sEl) return;
                    const num = sIdx + 1;
                    sEl.classList.remove('active', 'done');
                    if (num < currentStep) sEl.classList.add('done');
                    else if (num === currentStep) sEl.classList.add('active');
                });
            }
        }, 1800);

        try {
            const provider = state.brainProvider !== 'builtin' ? state.brainProvider : 'groq';
            const apiKey = state.apiKeys[provider] || '';

            const res = await fetch('/api/generate-presentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: cleanTopic,
                    slideCount: slideCount,
                    theme: theme,
                    provider: provider,
                    apiKey: apiKey
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Presentation generation failed (${res.status})`);
            }

            const data = await res.json();
            if (!data.deck || !Array.isArray(data.deck.slides)) {
                throw new Error('No valid slide deck returned from generator.');
            }

            clearInterval(stepTimer);
            state.canvas.isGeneratingPPT = false;
            tempSkeletonRow.remove();

            // Populate Presentation Studio & Canvas Artifact
            setCanvasArtifact('ppt', data.deck);

            // Reveal live presentation player
            if (elements.studioLoadingState) elements.studioLoadingState.style.display = 'none';
            if (elements.studioPlayerContainer) elements.studioPlayerContainer.style.display = 'flex';
            if (elements.presentationActiveBadge) elements.presentationActiveBadge.style.display = 'inline-block';
            renderPptSlide(0);

            const aiMsg = {
                role: 'assistant',
                content: `Here is your **${data.deck.slides.length}-slide Presentation** on **${escapeHtml(cleanTopic)}**! You can view and present directly in the **📊 Presentation Studio**, read presenter notes, and click **"📥 Export .pptx"** whenever you wish to download the raw PowerPoint file. 📊✨`,
                isPresentation: true,
                deckData: data.deck,
                timestamp: new Date().toISOString()
            };

            session.messages.push(aiMsg);
            saveState();

            appendMessageToDOM(aiMsg, session.messages.length - 1);
            scrollToBottom();
            playSound('receive');

            // Strictly In-Browser Preview First: ZERO MANDATORY AUTOMATIC DOWNLOAD!
            showToast('✨ Presentation live in Presentation Studio! Use controls to present.', 'check');

        } catch (err) {
            clearInterval(stepTimer);
            state.canvas.isGeneratingPPT = false;
            console.error('Presentation error:', err);
            tempSkeletonRow.remove();

            if (elements.studioLoadingState) elements.studioLoadingState.style.display = 'none';
            if (elements.studioPlayerContainer) elements.studioPlayerContainer.style.display = 'flex';

            const errorMsg = {
                role: 'assistant',
                content: `⚠️ **Presentation Generation Error:** ${err.message}\n\nPlease try again or verify your AI provider key in the Brain Hub.`,
                timestamp: new Date().toISOString()
            };
            session.messages.push(errorMsg);
            saveState();
            appendMessageToDOM(errorMsg, session.messages.length - 1);
            scrollToBottom();
            showToast('Failed to create presentation: ' + err.message, 'alert-triangle');

        } finally {
            state.isGenerating = false;
            state.canvas.isGeneratingPPT = false;
            elements.sendBtn.disabled = !elements.userInput.value.trim();
        }
    }

    // ==========================================
    // CHAT TRANSMISSION ENGINE
    // ==========================================
    async function handleSendMessage(promptText) {
        const text = (promptText || elements.userInput.value).trim();
        const hasAttachments = state.currentAttachments && state.currentAttachments.length > 0;
        if ((!text && !hasAttachments) || state.isGenerating) return;

        // 1. Agentic Tool Calling & Intent Detection
        const intent = detectIntent(text);

        if (intent.type === 'LIVE_VOICE') {
            elements.userInput.value = '';
            elements.userInput.style.height = 'auto';
            handleInputChange();
            openLiveVoiceOverlay();
            return;
        }

        if (intent.type === 'IMAGE') {
            elements.userInput.value = '';
            elements.userInput.style.height = 'auto';
            handleInputChange();
            generateAiImage(intent.prompt);
            return;
        }

        if (intent.type === 'PPT_PROMPT') {
            elements.userInput.value = '/ppt ';
            elements.userInput.placeholder = 'What topic should ShiviAI create a presentation on? (e.g. AI in Healthcare)';
            elements.userInput.focus();
            handleInputChange();

            const session = getCurrentSession();
            if (session) {
                const promptMsg = {
                    id: 'msg_' + Date.now(),
                    role: 'assistant',
                    content: '📊 **What topic should ShiviAI create a presentation on?**\n\nPlease provide your topic, target audience, or desired number of slides (for example: `/ppt Future of Quantum Computing` or `Create a 5-slide presentation on Photosynthesis`).',
                    timestamp: new Date().toISOString()
                };
                session.messages.push(promptMsg);
                saveState();
                elements.welcomeHero.style.display = 'none';
                appendMessageToDOM(promptMsg, session.messages.length - 1);
                scrollToBottom();
            }
            return;
        }

        if (intent.type === 'PRESENTATION') {
            elements.userInput.value = '';
            elements.userInput.style.height = 'auto';
            handleInputChange();
            generatePresentation(intent.topic, intent.slideCount);
            return;
        }

        stopSpeakingVoice();

        // Capture current attachments and reset preview
        const attachmentsToSend = [...(state.currentAttachments || [])];
        state.currentAttachments = [];
        renderAttachmentPreviews();

        const effectiveText = text || (attachmentsToSend.length > 0 ? 'Please analyze and summarize the attached document(s).' : '');

        // Reset input
        elements.userInput.value = '';
        elements.userInput.style.height = 'auto';
        handleInputChange();

        let session = getCurrentSession();
        if (!session) {
            session = createNewSession();
        }

        // Set session title from first message
        if (session.messages.length === 0) {
            session.title = effectiveText.length > 28 ? effectiveText.substring(0, 28) + '...' : effectiveText;
            renderHistoryList();
        }

        // Add user message
        const userMsg = {
            role: 'user',
            content: effectiveText,
            attachments: attachmentsToSend,
            timestamp: new Date().toISOString()
        };
        session.messages.push(userMsg);
        saveState();

        elements.welcomeHero.style.display = 'none';
        appendMessageToDOM(userMsg, session.messages.length - 1);
        scrollToBottom();
        playSound('send');

        // Retrieve Brain Knowledge Context
        const knowledgeContext = retrieveBrainKnowledge(effectiveText);

        // Format attachment context for the model
        let attachmentContext = '';
        if (attachmentsToSend.length > 0) {
            attachmentContext = attachmentsToSend.map((att, idx) => {
                let body = att.content || '';
                if (att.category === 'image') {
                    body = `[Image Attached: ${att.name}, Format: ${(att.extension || 'IMG').toUpperCase()}, Size: ${att.formattedSize || ''}]`;
                } else if (att.source === 'gdrive' || att.category === 'gdrive') {
                    body = `[Google Drive Cloud Resource: ${att.name} - URL: ${att.content_or_url || att.url}]\n${body || '(Cloud Document Linked for Context)'}`;
                }
                return `\n--- ATTACHED FILE ${idx + 1}: ${att.name} (${(att.extension || att.type || 'FILE').toUpperCase()}, ${att.formattedSize || (att.source === 'gdrive' ? 'Google Drive' : '')}) ---\n${body}\n--- END OF ATTACHED FILE ---`;
            }).join('\n\n');
        }

        const promptWithAttachments = attachmentContext
            ? `${effectiveText}\n\n[USER ATTACHED DOCUMENTS]:\n${attachmentContext}`
            : effectiveText;

        // Show typing indicator
        state.isGenerating = true;
        elements.typingIndicator.style.display = 'flex';
        elements.sendBtn.disabled = true;
        scrollToBottom();

        try {
            let aiReply = '';
            const history = (session.messages || []).slice(0, -1).map(m => ({
                role: m.role,
                content: m.content
            }));
            
            if (state.brainProvider !== 'builtin' || state.backendConfig.isOnline) {
                aiReply = await queryLiveAI(promptWithAttachments, knowledgeContext, history, attachmentsToSend);
            } else if (window.ShiviBrain) {
                const brainRes = await window.ShiviBrain.ask({
                    message: promptWithAttachments,
                    provider: state.brainProvider,
                    apiKey: state.apiKeys[state.brainProvider],
                    model: state.apiModels[state.brainProvider],
                    persona: state.currentPersona,
                    systemPrompt: state.systemInstructions,
                    history: history,
                    knowledgeContext: knowledgeContext
                });
                aiReply = brainRes.reply;
            } else {
                const delay = Math.min(Math.max(effectiveText.length * 15, 600), 1300);
                await new Promise(r => setTimeout(r, delay));
                aiReply = generateShiviResponse(promptWithAttachments, knowledgeContext);
            }

            elements.typingIndicator.style.display = 'none';

            const aiMsg = {
                id: 'msg_' + Date.now(),
                role: 'assistant',
                content: aiReply,
                timestamp: new Date().toISOString()
            };
            session.messages.push(aiMsg);
            saveState();

            appendMessageToDOM(aiMsg, session.messages.length - 1);
            scrollToBottom();
            playSound('receive');

            // Optional Voice Read Aloud
            if (window.voiceService ? window.voiceService.isVoiceEnabled : state.voiceEnabled) {
                speakText(aiReply, aiMsg.id);
            }

        } catch (err) {
            console.error('Generation error:', err);
            elements.typingIndicator.style.display = 'none';
            const errorMsg = {
                role: 'assistant',
                content: `⚠️ **Unable to get response:** ${err.message || 'Check your API configuration.'}\n\n💡 **Tip:** Open **Brain Hub (🧠)** to verify your API Key, or switch to the Built-in Engine or add a free Google Gemini key.`,
                timestamp: new Date().toISOString()
            };
            session.messages.push(errorMsg);
            saveState();
            appendMessageToDOM(errorMsg, session.messages.length - 1);
            scrollToBottom();
            showToast('Error generating response', 'alert-triangle');
        } finally {
            state.isGenerating = false;
            elements.sendBtn.disabled = !elements.userInput.value.trim();
        }
    }

    // ==========================================
    // BRAIN & KNOWLEDGE BASE MANAGEMENT
    // ==========================================
    const PROVIDER_METADATA = {
        builtin: {
            name: 'Built-in Shivi Engine',
            models: [],
            helpUrl: '',
            helpText: '',
            placeholder: 'No API key needed'
        },
        gemini: {
            name: 'Google Gemini',
            models: [
                { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (Fast & Free 🌟)' },
                { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Next-Gen Ultra Fast)' },
                { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (High Reasoning)' },
                { id: 'gemini-2.0-flash-exp', name: 'gemini-2.0-flash-exp (Experimental)' }
            ],
            helpUrl: 'https://aistudio.google.com/app/apikey',
            helpText: 'Get 100% Free Gemini Key',
            placeholder: 'AIzaSy...'
        },
        groq: {
            name: 'Groq Cloud',
            models: [
                { id: 'openai/gpt-oss-20b', name: 'gpt-oss-20b (Ultra-Fast 500+ tok/s 🌟)' },
                { id: 'openai/gpt-oss-120b', name: 'gpt-oss-120b (Deep Reasoning)' },
                { id: 'qwen/qwen3.8-27b', name: 'qwen3.8-27b (Fast & Smart)' },
                { id: 'groq/compound', name: 'groq/compound (Agentic Engine)' }
            ],
            helpUrl: 'https://console.groq.com/keys',
            helpText: 'Get 100% Free Groq Key',
            placeholder: 'gsk_...'
        },
        openai: {
            name: 'OpenAI',
            models: [
                { id: 'gpt-4o-mini', name: 'gpt-4o-mini (Fast & Intelligent)' },
                { id: 'gpt-4o', name: 'gpt-4o (Flagship Model)' },
                { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo (Classic)' }
            ],
            helpUrl: 'https://platform.openai.com/api-keys',
            helpText: 'Get OpenAI API Key',
            placeholder: 'sk-proj-...'
        },
        openrouter: {
            name: 'OpenRouter',
            models: [
                { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free 🌟)' },
                { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Reasoning (Free 🌟)' },
                { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free 🌟)' }
            ],
            helpUrl: 'https://openrouter.ai/keys',
            helpText: 'Get OpenRouter Key',
            placeholder: 'sk-or-...'
        }
    };

    function updateBrainUIBadges() {
        const count = state.knowledgeBase.length;
        if (elements.brainCountBadge) {
            elements.brainCountBadge.textContent = `${count} KB`;
        }
        if (elements.kbCountBadgeTab) {
            elements.kbCountBadgeTab.textContent = count;
        }
        if (elements.sidebarKnowledgeStatus) {
            const providerName = state.brainProvider === 'builtin' ? 'Built-in' : state.brainProvider.toUpperCase();
            const isBackend = state.backendConfig.isOnline && state.backendConfig.keysConfigured[state.brainProvider];
            elements.sidebarKnowledgeStatus.textContent = `Brain: ${count} KB (${providerName}${isBackend ? ' 🟢' : ''})`;
        }
    }

    function openBrainModal(initialTab = 'providers') {
        renderBrainHubUI();
        switchBrainTab(initialTab);
        elements.brainModal.classList.add('open');
        playSound('click');
    }

    function closeBrainModal() {
        elements.brainModal.classList.remove('open');
        playSound('click');
    }

    function switchBrainTab(tabName) {
        document.querySelectorAll('.brain-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });
        document.querySelectorAll('.brain-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-${tabName}`);
        });
        if (tabName === 'storage') {
            updateStorageStats();
        } else if (tabName === 'knowledge') {
            renderKnowledgeList();
        } else if (tabName === 'imagegen') {
            renderImageHubUI();
        }
    }

    const IMAGE_PROVIDER_METADATA = {
        pollinations: {
            name: 'Pollinations Flux',
            helpUrl: 'https://pollinations.ai',
            helpText: '100% Free & Unlimited (No API key required)',
            placeholder: 'No API key needed (100% Free)'
        },
        openai: {
            name: 'OpenAI DALL-E 3',
            helpUrl: 'https://platform.openai.com/api-keys',
            helpText: 'Get OpenAI API Key',
            placeholder: 'sk-proj-... / sk-...'
        },
        stability: {
            name: 'Stability AI',
            helpUrl: 'https://platform.stability.ai/account/keys',
            helpText: 'Get Stability API Key',
            placeholder: 'sk-...'
        }
    };

    function renderImageHubUI() {
        if (!elements.imageProviderCards) return;
        elements.imageProviderCards.forEach(card => {
            const provider = card.getAttribute('data-img-provider');
            const radio = card.querySelector('input[type="radio"]');
            const isActive = provider === state.imageProvider;
            card.classList.toggle('active', isActive);
            if (radio) radio.checked = isActive;
        });

        const meta = IMAGE_PROVIDER_METADATA[state.imageProvider] || IMAGE_PROVIDER_METADATA.pollinations;
        if (state.imageProvider === 'pollinations') {
            if (elements.imageApiKeySection) elements.imageApiKeySection.style.display = 'none';
        } else {
            if (elements.imageApiKeySection) {
                elements.imageApiKeySection.style.display = 'flex';
                elements.imageApiKeyLabel.textContent = `${meta.name} API Key`;
                elements.imageApiHelpLink.href = meta.helpUrl;
                elements.imageApiHelpText.textContent = meta.helpText;
                elements.imageApiKeyInput.placeholder = meta.placeholder;
                elements.imageApiKeyInput.value = state.imageApiKey || (state.imageProvider === 'openai' ? state.apiKeys.openai : '') || '';

                if (elements.imageBackendKeyIndicator) {
                    const hasBackendKey = state.backendConfig.isOnline && (state.backendConfig.keysConfigured.image || state.backendConfig.keysConfigured.openai);
                    elements.imageBackendKeyIndicator.style.display = hasBackendKey ? 'flex' : 'none';
                    if (hasBackendKey && !elements.imageApiKeyInput.value) {
                        elements.imageApiKeyInput.placeholder = `Configured in .env (${state.backendConfig.maskedKeys.image || state.backendConfig.maskedKeys.openai || 'Active'})`;
                    }
                }
            }
        }

        if (elements.defaultImageStyleSelect) {
            elements.defaultImageStyleSelect.value = state.defaultImageStyle || 'vivid';
        }
        if (elements.imageApiStatusBanner) {
            elements.imageApiStatusBanner.style.display = 'none';
        }
    }

    function showImageApiBanner(type, text) {
        if (!elements.imageApiStatusBanner) return;
        elements.imageApiStatusBanner.className = `api-status-banner ${type}`;
        elements.imageApiStatusBanner.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'loader')}"></i><span>${escapeHtml(text)}</span>`;
        elements.imageApiStatusBanner.style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    }

    async function testImageApiConnection() {
        const provider = state.imageProvider;
        const key = (elements.imageApiKeyInput ? elements.imageApiKeyInput.value.trim() : '') || state.imageApiKey || (provider === 'openai' ? state.apiKeys.openai : '');

        showImageApiBanner('loading', `Testing ${provider.toUpperCase()} image generation connection...`);

        try {
            const res = await fetch('/api/test-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: provider === 'pollinations' ? 'pollinations' : 'image',
                    apiKey: key
                })
            });

            const data = await res.json();
            if (data.success) {
                showImageApiBanner('success', `✓ ${data.message || 'Image engine connection verified!'}`);
                playSound('receive');
            } else {
                throw new Error(data.error || 'Connection test failed');
            }
        } catch (err) {
            showImageApiBanner('error', `Connection test failed: ${err.message}`);
        }
    }

    async function saveImageToBackendEnv() {
        const key = elements.imageApiKeyInput ? elements.imageApiKeyInput.value.trim() : '';
        const provider = state.imageProvider;

        try {
            showToast('Saving Image config to server .env...', 'loader');
            const res = await fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageKey: key,
                    imageProvider: provider
                })
            });

            const data = await res.json();
            if (data.success) {
                state.imageApiKey = key;
                saveState();
                showToast('✓ Image configuration saved to .env!', 'check-circle');
                playSound('receive');
                await fetchBackendConfig();
                renderImageHubUI();
            } else {
                throw new Error(data.error || 'Failed to save configuration');
            }
        } catch (err) {
            showToast(`Error saving .env: ${err.message}`, 'alert-triangle');
        }
    }

    function renderBrainHubUI() {
        // Select active provider card
        elements.providerCards.forEach(card => {
            const provider = card.getAttribute('data-provider');
            const radio = card.querySelector('input[type="radio"]');
            const isActive = provider === state.brainProvider;
            card.classList.toggle('active', isActive);
            if (radio) radio.checked = isActive;
        });

        // Configure API key section
        const currentMeta = PROVIDER_METADATA[state.brainProvider] || PROVIDER_METADATA.builtin;
        if (state.brainProvider === 'builtin') {
            elements.apiKeySection.style.display = 'none';
        } else {
            elements.apiKeySection.style.display = 'flex';
            elements.apiKeyLabel.textContent = `${currentMeta.name} API Key`;
            elements.apiHelpLink.href = currentMeta.helpUrl;
            elements.apiHelpText.textContent = currentMeta.helpText;
            elements.brainApiKeyInput.placeholder = currentMeta.placeholder;
            elements.brainApiKeyInput.value = state.apiKeys[state.brainProvider] || '';

            // Check if backend has this key loaded
            if (elements.backendKeyIndicator) {
                const hasBackendKey = state.backendConfig.isOnline && state.backendConfig.keysConfigured[state.brainProvider];
                elements.backendKeyIndicator.style.display = hasBackendKey ? 'flex' : 'none';
                if (hasBackendKey && !elements.brainApiKeyInput.value) {
                    elements.brainApiKeyInput.placeholder = `Configured in .env (${state.backendConfig.maskedKeys[state.brainProvider] || 'Active'})`;
                }
            }

            // Populate models dropdown
            elements.brainModelSelect.innerHTML = '';
            currentMeta.models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name;
                if (m.id === state.apiModels[state.brainProvider]) {
                    opt.selected = true;
                }
                elements.brainModelSelect.appendChild(opt);
            });
        }

        elements.brainSystemPrompt.value = state.systemInstructions || '';
        elements.apiStatusBanner.style.display = 'none';
        renderImageHubUI();
        renderKnowledgeList();
        updateStorageStats();
    }

    function renderKnowledgeList(filterText = '') {
        const q = filterText.toLowerCase().trim();
        elements.kbListContainer.innerHTML = '';

        const filtered = state.knowledgeBase.filter(item => {
            if (!q) return true;
            return (item.title || '').toLowerCase().includes(q) ||
                   (item.category || '').toLowerCase().includes(q) ||
                   (item.content || '').toLowerCase().includes(q) ||
                   (item.tags || []).some(t => t.toLowerCase().includes(q));
        });

        if (!filtered.length) {
            elements.kbListContainer.innerHTML = `
                <div class="kb-empty">
                    <p>No knowledge memory found matching "${escapeHtml(filterText)}".</p>
                </div>
            `;
            return;
        }

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'kb-card';
            card.innerHTML = `
                <div class="kb-card-top">
                    <div class="kb-card-title-group">
                        <span class="kb-card-title">${escapeHtml(item.title)}</span>
                        <span class="kb-cat-badge">${escapeHtml(item.category || 'Memory')}</span>
                    </div>
                    <div class="kb-card-actions">
                        <button class="icon-btn-sm edit-kb-btn" title="Edit Item" data-id="${item.id}">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="icon-btn-sm delete-kb-btn" title="Delete Item" data-id="${item.id}">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                <div class="kb-card-content">${escapeHtml(item.content)}</div>
                ${item.tags && item.tags.length ? `
                    <div class="kb-tags-row">
                        ${item.tags.map(t => `<span class="kb-tag-pill">#${escapeHtml(t)}</span>`).join('')}
                    </div>
                ` : ''}
            `;

            card.querySelector('.edit-kb-btn').addEventListener('click', () => openEditKbItem(item));
            card.querySelector('.delete-kb-btn').addEventListener('click', () => deleteKbItem(item.id));

            elements.kbListContainer.appendChild(card);
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function openAddKbForm() {
        elements.kbEditId.value = '';
        elements.kbEditorTitle.textContent = 'Add New Brain Knowledge Memory';
        elements.kbTitleInput.value = '';
        elements.kbCategoryInput.value = 'General';
        elements.kbTagsInput.value = '';
        elements.kbContentInput.value = '';
        elements.kbEditorCard.style.display = 'flex';
        elements.kbTitleInput.focus();
    }

    function openEditKbItem(item) {
        elements.kbEditId.value = item.id;
        elements.kbEditorTitle.textContent = 'Edit Brain Knowledge Memory';
        elements.kbTitleInput.value = item.title;
        elements.kbCategoryInput.value = item.category || 'General';
        elements.kbTagsInput.value = (item.tags || []).join(', ');
        elements.kbContentInput.value = item.content;
        elements.kbEditorCard.style.display = 'flex';
        elements.kbTitleInput.focus();
    }

    function saveKbFormItem() {
        const title = elements.kbTitleInput.value.trim();
        const content = elements.kbContentInput.value.trim();
        const category = elements.kbCategoryInput.value.trim() || 'General';
        const tags = elements.kbTagsInput.value
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);

        if (!title || !content) {
            showToast('Please enter both Title and Content.', 'alert-circle');
            return;
        }

        const editId = elements.kbEditId.value;
        if (editId) {
            const idx = state.knowledgeBase.findIndex(k => k.id === editId);
            if (idx !== -1) {
                state.knowledgeBase[idx] = { id: editId, title, category, tags, content };
            }
        } else {
            const newItem = {
                id: 'kb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                title,
                category,
                tags,
                content
            };
            state.knowledgeBase.unshift(newItem);
        }

        saveState();
        elements.kbEditorCard.style.display = 'none';
        renderKnowledgeList();
        updateBrainUIBadges();
        playSound('click');
        showToast('Knowledge item saved!', 'check');
    }

    function deleteKbItem(id) {
        state.knowledgeBase = state.knowledgeBase.filter(k => k.id !== id);
        saveState();
        renderKnowledgeList();
        updateBrainUIBadges();
        playSound('clear');
        showToast('Knowledge item removed', 'trash-2');
    }

    async function testApiConnection() {
        const provider = state.brainProvider;
        const key = elements.brainApiKeyInput.value.trim();
        const model = elements.brainModelSelect.value;

        if (!key && provider !== 'openrouter' && !(state.backendConfig.isOnline && state.backendConfig.keysConfigured[provider])) {
            showApiBanner('error', `Please enter a valid ${provider.toUpperCase()} API key first.`);
            return;
        }

        showApiBanner('testing', `Testing connection to ${provider.toUpperCase()} (${model})...`);

        // 1. Try Backend Test Endpoint First
        try {
            const res = await fetch('/api/test-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: provider,
                    apiKey: key,
                    model: model
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    showApiBanner('success', `✓ Connected successfully to ${provider.toUpperCase()} (${data.latency}ms latency)`);
                    playSound('receive');
                    return;
                } else if (data.error) {
                    throw new Error(data.error);
                }
            }
        } catch (serverErr) {
            console.warn('[Backend test failed, trying direct browser test]:', serverErr.message);
            if (serverErr.message && !serverErr.message.includes('fetch') && !serverErr.message.includes('Failed to fetch')) {
                showApiBanner('error', `Connection failed: ${serverErr.message}`);
                return;
            }
        }

        // 2. Direct Browser Fetch Test Fallback
        const startTime = Date.now();
        try {
            if (provider === 'gemini') {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Ping test. Reply with: OK' }] }]
                    })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `HTTP ${res.status}`);
                }
            } else if (provider === 'openai' || provider === 'groq') {
                const endpoint = provider === 'openai' 
                    ? 'https://api.openai.com/v1/chat/completions'
                    : 'https://api.groq.com/openai/v1/chat/completions';

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: model,
                        max_tokens: 5,
                        messages: [{ role: 'user', content: 'Ping' }]
                    })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `HTTP ${res.status}`);
                }
            } else if (provider === 'openrouter') {
                const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                const headers = { 'Content-Type': 'application/json', 'HTTP-Referer': window.location.href, 'X-Title': 'Shivi AI' };
                if (key) headers['Authorization'] = `Bearer ${key}`;

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model: model,
                        max_tokens: 5,
                        messages: [{ role: 'user', content: 'Ping' }]
                    })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `HTTP ${res.status}`);
                }
            }

            const latency = Date.now() - startTime;
            showApiBanner('success', `✓ Connected successfully to ${provider.toUpperCase()} (${latency}ms latency)`);
            playSound('receive');

        } catch (e) {
            showApiBanner('error', `Connection failed: ${e.message}`);
        }
    }

    function showApiBanner(type, text) {
        elements.apiStatusBanner.className = `api-status-banner ${type}`;
        elements.apiStatusBanner.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'loader')}"></i><span>${escapeHtml(text)}</span>`;
        elements.apiStatusBanner.style.display = 'flex';
        if (window.lucide) lucide.createIcons();
    }

    // ==========================================
    // DATA & FILE STORAGE MANAGEMENT
    // ==========================================
    function updateStorageStats() {
        const totalSessions = state.sessions.length;
        let totalMsgs = 0;
        state.sessions.forEach(s => totalMsgs += (s.messages || []).length);
        const totalKb = state.knowledgeBase.length;
        const jsonStr = JSON.stringify(state);
        const sizeKb = (jsonStr.length / 1024).toFixed(1);

        if (elements.statTotalChats) elements.statTotalChats.textContent = totalSessions;
        if (elements.statTotalMessages) elements.statTotalMessages.textContent = totalMsgs;
        if (elements.statTotalKnowledge) elements.statTotalKnowledge.textContent = totalKb;
        if (elements.statStorageSize) elements.statStorageSize.textContent = `~${sizeKb} KB`;
    }

    function exportAllDataFile() {
        const dataExport = {
            version: '2.5',
            exportedAt: new Date().toISOString(),
            application: 'Shivi AI',
            sessions: state.sessions,
            knowledgeBase: state.knowledgeBase,
            systemInstructions: state.systemInstructions,
            settings: {
                currentPersona: state.currentPersona,
                currentTheme: state.currentTheme,
                currentFont: state.currentFont,
                brainProvider: state.brainProvider,
                apiModels: state.apiModels,
                sfxEnabled: state.sfxEnabled,
                voiceEnabled: state.voiceEnabled,
                speechRate: state.speechRate,
                sfxVolume: state.sfxVolume
            }
        };

        const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shivi_data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        playSound('click');
        showToast('All data exported as JSON file!', 'download');
    }

    function exportKnowledgeJsonFile() {
        const kbExport = {
            version: '2.5',
            name: 'Shivi AI Brain Knowledge Base',
            exportedAt: new Date().toISOString(),
            systemInstructions: state.systemInstructions,
            knowledgeBase: state.knowledgeBase
        };

        const blob = new Blob([JSON.stringify(kbExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        playSound('click');
        showToast('Knowledge Base exported as JSON!', 'file-code');
    }

    function importDataFromJsonFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                let importedChats = 0;
                let importedKb = 0;

                // Import Sessions
                if (Array.isArray(imported.sessions)) {
                    state.sessions = imported.sessions;
                    importedChats = imported.sessions.length;
                    if (state.sessions.length) {
                        state.currentSessionId = state.sessions[0].id;
                    }
                }

                // Import Knowledge Base
                if (Array.isArray(imported.knowledgeBase)) {
                    state.knowledgeBase = imported.knowledgeBase;
                    importedKb = imported.knowledgeBase.length;
                }

                if (imported.systemInstructions) {
                    state.systemInstructions = imported.systemInstructions;
                }

                if (imported.settings) {
                    if (imported.settings.currentTheme) setTheme(imported.settings.currentTheme);
                    if (imported.settings.currentFont) setFont(imported.settings.currentFont);
                    if (imported.settings.currentPersona) setPersona(imported.settings.currentPersona);
                }

                saveState();
                renderHistoryList();
                renderCurrentChat();
                renderBrainHubUI();
                updateBrainUIBadges();

                playSound('receive');
                showToast(`Imported ${importedChats} chats & ${importedKb} knowledge items!`, 'check-circle');

            } catch (err) {
                console.error('Import error:', err);
                showToast('Invalid JSON file format.', 'alert-triangle');
            }
        };

        reader.readAsText(file);
    }

    async function resetKnowledgeToDefault() {
        if (!confirm('Reload default knowledge base? Custom items will be replaced with standard default knowledge.')) return;
        await fetchDefaultKnowledgeFile();
        saveState();
        renderBrainHubUI();
        updateBrainUIBadges();
        playSound('clear');
        showToast('Knowledge Base reloaded to default', 'rotate-ccw');
    }

    // ==========================================
    // THEME & TYPOGRAPHY HANDLERS
    // ==========================================
    const THEME_NAMES = {
        cyberpunk: 'Cyberpunk Dark (Cyan & Pink)',
        emerald: 'Deep Obsidian Emerald',
        violet: 'Midnight Royal Violet',
        amber: 'Sunset Amber Dark',
        midnight: 'Cyberpunk Dark (Default)',
        cyber: 'Cyberpunk Dark (Cyan & Pink)',
        nebula: 'Midnight Royal Violet',
        sapphire: 'Midnight Royal Violet',
        sunset: 'Sunset Amber Dark',
        custom: 'Custom Theme Studio'
    };

    const THEME_PRESETS = {
        cyberpunk: {
            name: '⚡ Cyberpunk Dark',
            bgMain: '#0b0f19',
            bgSecondary: '#131b2e',
            bgCard: 'rgba(22, 31, 48, 0.7)',
            primary: '#06b6d4',
            accent: '#06b6d4',
            accentSecondary: '#ec4899',
            userBubble: '#0891b2',
            aiBubble: '#131b2e',
            textPrimary: '#f8fafc',
            textMuted: '#94a3b8',
            border: '#233047'
        },
        emerald: {
            name: '🌲 Obsidian Emerald',
            bgMain: '#061412',
            bgSecondary: '#0a2320',
            bgCard: 'rgba(16, 44, 40, 0.7)',
            primary: '#10b981',
            accent: '#10b981',
            accentSecondary: '#34d399',
            userBubble: '#059669',
            aiBubble: '#0a2320',
            textPrimary: '#f0fdf4',
            textMuted: '#86efac',
            border: '#1a4d45'
        },
        violet: {
            name: '👑 Royal Violet',
            bgMain: '#0d0b18',
            bgSecondary: '#19142b',
            bgCard: 'rgba(32, 24, 56, 0.7)',
            primary: '#8b5cf6',
            accent: '#8b5cf6',
            accentSecondary: '#a855f7',
            userBubble: '#7c3aed',
            aiBubble: '#19142b',
            textPrimary: '#faf5ff',
            textMuted: '#c084fc',
            border: '#3b2d66'
        },
        amber: {
            name: '🌅 Sunset Amber',
            bgMain: '#170d06',
            bgSecondary: '#27170c',
            bgCard: 'rgba(53, 31, 16, 0.7)',
            primary: '#f59e0b',
            accent: '#f59e0b',
            accentSecondary: '#f97316',
            userBubble: '#d97706',
            aiBubble: '#27170c',
            textPrimary: '#fffbeb',
            textMuted: '#fcd34d',
            border: '#5c3518'
        },
        black_grey: {
            name: '🖤 Cyberpunk Obsidian',
            bgMain: '#0b0f19',
            bgSecondary: '#131b2e',
            bgCard: 'rgba(22, 31, 48, 0.7)',
            primary: '#06b6d4',
            userBubble: '#0891b2',
            aiBubble: '#131b2e',
            textPrimary: '#f8fafc',
            textMuted: '#94a3b8',
        }
    };

    function hexToRgba(hex, alpha = 1) {
        if (!hex || typeof hex !== 'string') return `rgba(255,255,255,${alpha})`;
        let clean = hex.replace('#', '');
        if (clean.length === 3) {
            clean = clean.split('').map(c => c + c).join('');
        }
        if (clean.length !== 6) return hex;
        const num = parseInt(clean, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function applyCustomThemeVariables(colors) {
        const root = document.documentElement;
        if (!colors) return;
        if (colors.bgMain) {
            root.style.setProperty('--bg-main', colors.bgMain);
            root.style.setProperty('--code-bg', colors.bgMain);
        }
        if (colors.bgSecondary) {
            root.style.setProperty('--bg-secondary', hexToRgba(colors.bgSecondary, 0.9));
            root.style.setProperty('--bg-glass', hexToRgba(colors.bgSecondary, 0.82));
        }
        if (colors.bgCard) {
            root.style.setProperty('--bg-card', hexToRgba(colors.bgCard, 0.78));
            root.style.setProperty('--bg-card-hover', hexToRgba(colors.bgCard, 0.95));
            root.style.setProperty('--bg-input', hexToRgba(colors.bgCard, 0.96));
        }
        if (colors.primary) {
            root.style.setProperty('--primary', colors.primary);
            root.style.setProperty('--primary-glow', hexToRgba(colors.primary, 0.35));
            root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${colors.primary} 0%, ${hexToRgba(colors.primary, 0.7)} 100%)`);
            root.style.setProperty('--accent', colors.primary);
        }
        if (colors.userBubble) {
            root.style.setProperty('--user-msg-bg', colors.userBubble);
        }
        if (colors.aiBubble) {
            root.style.setProperty('--ai-msg-bg', hexToRgba(colors.aiBubble, 0.88));
        }
        if (colors.textPrimary) {
            root.style.setProperty('--text-primary', colors.textPrimary);
        }
        if (colors.textMuted) {
            root.style.setProperty('--text-muted', colors.textMuted);
            root.style.setProperty('--text-secondary', hexToRgba(colors.textPrimary || '#ffffff', 0.7));
        }
        if (colors.border) {
            root.style.setProperty('--border-subtle', hexToRgba(colors.border, 0.18));
            root.style.setProperty('--border-highlight', hexToRgba(colors.border, 0.45));
            root.style.setProperty('--glow-color-1', hexToRgba(colors.border, 0.08));
            root.style.setProperty('--glow-color-2', hexToRgba(colors.primary || colors.border, 0.08));
            root.style.setProperty('--glow-color-3', hexToRgba(colors.border, 0.05));
        }
    }

    function clearCustomThemeVariables() {
        const root = document.documentElement;
        const vars = [
            '--bg-main', '--bg-secondary', '--bg-card', '--bg-card-hover', '--bg-glass',
            '--bg-input', '--primary', '--primary-glow', '--primary-gradient', '--secondary',
            '--accent', '--user-msg-bg', '--ai-msg-bg', '--code-bg', '--text-primary',
            '--text-secondary', '--text-muted', '--border-subtle', '--border-highlight',
            '--glow-color-1', '--glow-color-2', '--glow-color-3'
        ];
        vars.forEach(v => root.style.removeProperty(v));
    }

    function setTheme(themeName) {
        state.currentTheme = themeName;

        // 1. Dynamically inject active data-theme attribute on both <html> and <body>
        document.documentElement.setAttribute('data-theme', themeName);
        document.documentElement.classList.add('dark', 'theme-dark');
        document.documentElement.classList.remove('theme-light');

        if (document.body) {
            document.body.classList.add('dark', 'theme-dark');
            document.body.setAttribute('data-theme', themeName);
            document.body.style.removeProperty('background-color');
            document.body.style.removeProperty('color');
        }
        document.documentElement.style.removeProperty('background-color');
        document.documentElement.style.removeProperty('color');

        // 2. Persist active theme in localStorage
        try {
            localStorage.setItem('shivi_selected_theme', themeName);
            localStorage.setItem('theme', themeName);
            localStorage.setItem('shivi_theme', themeName);
            localStorage.setItem('color-mode', themeName);
        } catch (e) {}

        if (themeName === 'custom') {
            applyCustomThemeVariables(state.customThemeColors);
        } else {
            clearCustomThemeVariables();
        }

        saveState();
        updateThemeUI();
        updateThemeModalUI();
        playSound('click');

        const displayName = {
            cyberpunk: 'Cyberpunk Neon',
            emerald: 'Emerald Matrix',
            violet: 'Royal Violet',
            amber: 'Sunset Amber',
            sunset: 'Sunset Amber',
            monochrome: 'OLED Monochrome',
            oled: 'OLED Monochrome',
            midnight: 'Cyberpunk Neon',
            dark: 'Cyberpunk Neon',
            cyber: 'Cyberpunk Neon',
            nebula: 'Royal Violet',
            sapphire: 'Royal Violet',
            custom: 'Custom Theme Studio'
        }[themeName] || themeName;

        showToast(`Theme: ${displayName}`, 'palette');
    }

    function updateThemeUI() {
        document.querySelectorAll('.theme-opt').forEach(btn => {
            const btnTheme = btn.getAttribute('data-set-theme');
            const isActive = btnTheme === state.currentTheme || 
                (btnTheme === 'cyberpunk' && (state.currentTheme === 'dark' || state.currentTheme === 'midnight' || state.currentTheme === 'cyber')) ||
                (btnTheme === 'violet' && (state.currentTheme === 'nebula' || state.currentTheme === 'sapphire')) ||
                (btnTheme === 'amber' && state.currentTheme === 'sunset') ||
                (btnTheme === 'monochrome' && state.currentTheme === 'oled');
            if (isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        updateThemeModalUI();
    }

    function updateThemeModalUI() {
        if (!elements.themePaletteGrid) return;
        const current = (state.currentTheme || 'cyberpunk').toLowerCase();
        let normalized = current;
        if (current === 'dark' || current === 'midnight' || current === 'cyber') normalized = 'cyberpunk';
        if (current === 'nebula' || current === 'sapphire') normalized = 'violet';
        if (current === 'sunset') normalized = 'amber';
        if (current === 'oled') normalized = 'monochrome';

        const cards = elements.themePaletteGrid.querySelectorAll('.theme-palette-card');
        cards.forEach(card => {
            const themeId = card.getAttribute('data-theme-id');
            const isActive = (themeId === normalized) || (themeId === current);
            if (isActive) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    function openThemeModal() {
        if (!elements.themeSelectionModal) return;
        updateThemeModalUI();
        elements.themeSelectionModal.style.display = 'flex';
        void elements.themeSelectionModal.offsetWidth;
        elements.themeSelectionModal.classList.add('active', 'open');
        if (elements.userProfileWrapper) {
            elements.userProfileWrapper.classList.remove('open');
        }
        playSound('click');
        if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    }

    function closeThemeModal() {
        if (!elements.themeSelectionModal) return;
        elements.themeSelectionModal.classList.remove('active', 'open');
        setTimeout(() => {
            if (!elements.themeSelectionModal.classList.contains('active')) {
                elements.themeSelectionModal.style.display = 'none';
            }
        }, 220);
    }

    function setIsThemeModalOpen(isOpen) {
        if (isOpen) {
            openThemeModal();
        } else {
            closeThemeModal();
        }
    }

    // ==========================================
    // CUSTOM THEME STUDIO LOGIC
    // ==========================================
    function renderThemePresets() {
        if (!elements.presetPalettesGrid) return;
        elements.presetPalettesGrid.innerHTML = '';
        Object.keys(THEME_PRESETS).forEach(key => {
            const p = THEME_PRESETS[key];
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'preset-chip';
            chip.innerHTML = `
                <span class="preset-dot" style="background: ${p.primary}; border-color: ${p.border};"></span>
                <span>${p.name}</span>
            `;
            chip.addEventListener('click', () => {
                loadPresetIntoCustomizer(key);
                document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                // Instant real-time theme application across entire app
                const p = THEME_PRESETS[key];
                if (p) {
                    state.customThemeColors = p;
                    state.currentTheme = key;
                    document.documentElement.setAttribute('data-theme', key);
                    if (document.body) document.body.setAttribute('data-theme', key);
                    applyCustomThemeVariables(p);
                    try {
                        localStorage.setItem('shivi_theme', key);
                        localStorage.setItem('theme', key);
                    } catch (_) {}
                    saveState();
                    showToast(`Active Palette: ${p.name || key}`, 'palette');
                }
            });
            elements.presetPalettesGrid.appendChild(chip);
        });
    }

    function loadPresetIntoCustomizer(presetKey) {
        const p = THEME_PRESETS[presetKey];
        if (!p) return;
        setCustomizerInputs(p);
        updateThemeLivePreview(p);
        playSound('click');
    }

    function setCustomizerInputs(colors) {
        const mapping = {
            colorBgMain: colors.bgMain || '#09090b',
            colorBgSecondary: colors.bgSecondary || '#121215',
            colorBgCard: colors.bgCard || '#18181c',
            colorPrimary: colors.primary || '#f4f4f5',
            colorUserBubble: colors.userBubble || '#27272a',
            colorAiBubble: colors.aiBubble || '#18181c',
            colorTextPrimary: colors.textPrimary || '#f4f4f5',
            colorTextMuted: colors.textMuted || '#71717a',
            colorBorder: colors.border || '#52525b'
        };

        Object.keys(mapping).forEach(id => {
            const colorEl = elements[id];
            const hexEl = elements[id + 'Hex'];
            const val = mapping[id];
            if (colorEl) colorEl.value = val;
            if (hexEl) hexEl.value = val;
        });
    }

    function readCustomizerInputs() {
        return {
            bgMain: elements.colorBgMain ? elements.colorBgMain.value : '#09090b',
            bgSecondary: elements.colorBgSecondary ? elements.colorBgSecondary.value : '#121215',
            bgCard: elements.colorBgCard ? elements.colorBgCard.value : '#18181c',
            primary: elements.colorPrimary ? elements.colorPrimary.value : '#f4f4f5',
            userBubble: elements.colorUserBubble ? elements.colorUserBubble.value : '#27272a',
            aiBubble: elements.colorAiBubble ? elements.colorAiBubble.value : '#18181c',
            textPrimary: elements.colorTextPrimary ? elements.colorTextPrimary.value : '#f4f4f5',
            textMuted: elements.colorTextMuted ? elements.colorTextMuted.value : '#71717a',
            border: elements.colorBorder ? elements.colorBorder.value : '#52525b'
        };
    }

    function updateThemeLivePreview(colors) {
        if (!elements.themeLivePreviewBox) return;
        const p = colors || readCustomizerInputs();

        // Update preview container styles
        elements.themeLivePreviewBox.style.backgroundColor = p.bgMain;
        elements.themeLivePreviewBox.style.borderColor = p.border;

        if (elements.prevHeader) elements.prevHeader.style.borderColor = hexToRgba(p.border, 0.2);
        if (elements.prevAvatar) {
            elements.prevAvatar.style.backgroundColor = p.primary;
            elements.prevAvatar.style.color = p.bgMain;
        }
        if (elements.prevTitle) elements.prevTitle.style.color = p.textPrimary;
        if (elements.prevBadge) {
            elements.prevBadge.style.backgroundColor = hexToRgba(p.border, 0.25);
            elements.prevBadge.style.color = p.textMuted;
        }

        if (elements.prevUserMsg) {
            elements.prevUserMsg.style.backgroundColor = p.userBubble;
            elements.prevUserMsg.style.color = p.textPrimary;
        }

        if (elements.prevAiMsg) {
            elements.prevAiMsg.style.backgroundColor = p.aiBubble;
            elements.prevAiMsg.style.borderColor = hexToRgba(p.border, 0.25);
            elements.prevAiMsg.style.color = p.textPrimary;
        }

        if (elements.prevAiAvatar) {
            elements.prevAiAvatar.style.backgroundColor = p.primary;
            elements.prevAiAvatar.style.color = p.bgMain;
        }

        if (elements.prevDock) elements.prevDock.style.borderColor = hexToRgba(p.border, 0.2);
        if (elements.prevInputMock) {
            elements.prevInputMock.style.backgroundColor = hexToRgba(p.bgCard, 0.9);
            elements.prevInputMock.style.borderColor = hexToRgba(p.border, 0.25);
            elements.prevInputMock.style.color = p.textMuted;
        }
        if (elements.prevSendBtn) {
            elements.prevSendBtn.style.backgroundColor = p.primary;
            elements.prevSendBtn.style.color = p.bgMain;
        }
    }

    function openCustomThemeModal() {
        renderThemePresets();
        setCustomizerInputs(state.customThemeColors || THEME_PRESETS.black_grey);
        updateThemeLivePreview(state.customThemeColors || THEME_PRESETS.black_grey);
        if (elements.customThemeModal) {
            elements.customThemeModal.classList.add('open');
            playSound('click');
        }
    }

    function closeCustomThemeModal() {
        if (elements.customThemeModal) {
            elements.customThemeModal.classList.remove('open');
        }
    }

    function applyAndSaveCustomTheme() {
        const colors = readCustomizerInputs();
        state.customThemeColors = colors;
        state.currentTheme = 'custom';
        document.documentElement.setAttribute('data-theme', 'custom');
        applyCustomThemeVariables(colors);
        saveState();
        updateThemeUI();
        closeCustomThemeModal();
        playSound('send');
        showToast('Custom Theme saved & applied successfully! 🎨', 'check-circle');
    }

    function resetCustomThemeToDefault() {
        loadPresetIntoCustomizer('black_grey');
        showToast('Reset palette to Black & Grey', 'rotate-ccw');
    }

    function exportCustomThemeCss() {
        const c = readCustomizerInputs();
        const cssSnippet = `/* Shivi AI — Custom Theme CSS */
[data-theme="custom"] {
    --bg-main: ${c.bgMain};
    --bg-secondary: ${c.bgSecondary};
    --bg-card: ${c.bgCard};
    --primary: ${c.primary};
    --user-msg-bg: ${c.userBubble};
    --ai-msg-bg: ${c.aiBubble};
    --text-primary: ${c.textPrimary};
    --text-muted: ${c.textMuted};
    --border-highlight: ${c.border};
}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(cssSnippet).then(() => {
                showToast('Custom Theme CSS copied to clipboard! 📋', 'copy');
            }).catch(() => {
                showToast('CSS copied to clipboard', 'copy');
            });
        }
    }

    function setFont(fontName) {
        state.currentFont = fontName;
        document.documentElement.setAttribute('data-font', fontName);
        saveState();
        updateFontUI();
        playSound('click');
        showToast(`Font: ${FONT_NAMES[fontName] || fontName}`, 'type');
    }

    function updateFontUI() {
        if (elements.fontSelect) {
            elements.fontSelect.value = state.currentFont;
        }
    }

    function setPersona(personaKey) {
        if (!PERSONA_CONFIG[personaKey]) {
            personaKey = 'companion';
        }
        state.currentPersona = personaKey;
        saveState();
        updatePersonaUI();
        playSound('click');
        const cfg = PERSONA_CONFIG[personaKey];
        showToast(`${cfg.name} activated`, 'sparkles');
    }

    function updatePersonaUI() {
        const cfg = PERSONA_CONFIG[state.currentPersona] || PERSONA_CONFIG.companion;
        if (elements.personaSelect) {
            elements.personaSelect.value = state.currentPersona;
        }
        if (elements.currentPersonaBadge) {
            elements.currentPersonaBadge.textContent = cfg.badge;
        }
        // Update header dropdown menu active checkmarks & highlights
        document.querySelectorAll('.persona-menu-item').forEach(item => {
            const p = item.getAttribute('data-persona');
            const isActive = (p === state.currentPersona);
            item.classList.toggle('active', isActive);
        });
    }

    function updateSfxIcon() {
        elements.sfxToggleBtn.classList.toggle('active', state.sfxEnabled);
        elements.sfxIcon.setAttribute('data-lucide', state.sfxEnabled ? 'bell' : 'bell-off');
        if (window.lucide) lucide.createIcons();
    }

    function updateVoiceIcon() {
        const isEnabled = window.voiceService ? window.voiceService.isVoiceEnabled : state.voiceEnabled;
        state.voiceEnabled = isEnabled;
        if (elements.voiceToggleBtn) {
            elements.voiceToggleBtn.classList.toggle('active', isEnabled);
        }
        if (elements.voiceIcon) {
            elements.voiceIcon.setAttribute('data-lucide', isEnabled ? 'volume-2' : 'volume-x');
        }
        if (window.lucide) lucide.createIcons();
    }

    // ==========================================
    // SETTINGS MODAL HANDLERS
    // ==========================================
    function openSettings() {
        updateSettingsModalUI();
        elements.settingsModal.classList.add('open');
        playSound('click');
    }

    function closeSettings() {
        elements.settingsModal.classList.remove('open');
        playSound('click');
    }

    function updateSettingsModalUI() {
        if (elements.fontSelect) {
            elements.fontSelect.value = state.currentFont;
        }
        elements.speechRateSlider.value = state.speechRate;
        elements.speechRateVal.textContent = state.speechRate + 'x';
        elements.sfxVolumeSlider.value = state.sfxVolume;
    }

    function saveSettings() {
        state.speechRate = parseFloat(elements.speechRateSlider.value) || 1.0;
        state.sfxVolume = parseFloat(elements.sfxVolumeSlider.value) || 0.5;
        if (elements.fontSelect) {
            setFont(elements.fontSelect.value);
        }
        saveState();
        closeSettings();
        showToast('Settings saved successfully!', 'check');
    }

    // ==========================================
    // EXPORT & CLEAR HANDLERS
    // ==========================================
    function exportConversation() {
        const session = getCurrentSession();
        if (!session || !session.messages.length) {
            showToast('No messages to export.', 'info');
            return;
        }

        let md = `# Shivi AI Conversation Export\n`;
        md += `**Title:** ${session.title}\n`;
        md += `**Date:** ${new Date(session.createdAt).toLocaleString()}\n\n---\n\n`;

        session.messages.forEach(msg => {
            const author = msg.role === 'user' ? 'User' : 'Shivi AI';
            md += `### ${author} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n${msg.content}\n\n---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shivi_chat_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        playSound('click');
        showToast('Chat exported as Markdown!', 'download');
    }

    function clearCurrentScreen() {
        stopSpeakingVoice();
        const session = getCurrentSession();
        if (session && session.messages.length) {
            session.messages = [];
            saveState();
            renderCurrentChat();
            playSound('clear');
            showToast('Screen cleared', 'refresh-cw');
        }
    }

    function clearAllHistory() {
        if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) return;
        stopSpeakingVoice();
        state.sessions = [];
        state.currentSessionId = null;
        createNewSession();
        playSound('clear');
        showToast('All chat history cleared', 'trash-2');
    }

    function closeSidebarOnMobile() {
        if (window.innerWidth <= 820) {
            elements.sidebar.classList.remove('open');
            elements.sidebarBackdrop.classList.remove('active');
        }
    }

    // ==========================================
    // INPUT HANDLING & AUTO-RESIZE
    // ==========================================
    function handleInputChange() {
        const val = elements.userInput.value;
        if (elements.charCount) {
            elements.charCount.textContent = `${val.length}/4000`;
        }
        const hasAttachments = state.currentAttachments && state.currentAttachments.length > 0;
        elements.sendBtn.disabled = (!val.trim() && !hasAttachments) || state.isGenerating;

        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = Math.min(elements.userInput.scrollHeight, 160) + 'px';
    }

    // ==========================================
    // EVENT LISTENERS INITIALIZATION
    // ==========================================
    function initEventListeners() {
        // Form Submit
        if (elements.chatForm) {
            elements.chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSendMessage();
            });
        }

        // Send Button Click
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleSendMessage();
            });
        }

        // Textarea Keyboard Shortcuts (Enter to send, Shift+Enter for newline)
        if (elements.userInput) {
            elements.userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            });

            elements.userInput.addEventListener('input', handleInputChange);
        }

        // Global Keyboard Shortcut (Ctrl+K or Cmd+K for New Chat)
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                stopSpeakingVoice();
                switchWorkspaceView('chat');
                createNewSession();
                if (elements.userInput) {
                    elements.userInput.value = '';
                    handleInputChange();
                    elements.userInput.focus();
                }
                playSound('click');
                showToast('Started new conversation', 'plus-circle');
            }
        });

        // New Chat Button
        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', () => {
                stopSpeakingVoice();
                switchWorkspaceView('chat');
                createNewSession();
                if (elements.userInput) {
                    elements.userInput.value = '';
                    handleInputChange();
                    elements.userInput.focus();
                }
                playSound('click');
                showToast('Started new conversation', 'plus-circle');
                closeSidebarOnMobile();
            });
        }

        // Persona Selection (Sidebar Dropdown)
        if (elements.personaSelect) {
            elements.personaSelect.addEventListener('change', (e) => {
                setPersona(e.target.value);
            });
        }

        // Header Persona Pill & Dropdown Popover
        if (elements.headerPersonaPill && elements.headerPersonaWrapper) {
            elements.headerPersonaPill.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.headerPersonaWrapper.classList.toggle('open');
                playSound('click');
            });

            document.addEventListener('click', (e) => {
                if (elements.headerPersonaWrapper.classList.contains('open')) {
                    if (!elements.headerPersonaWrapper.contains(e.target)) {
                        elements.headerPersonaWrapper.classList.remove('open');
                    }
                }
            });
        }

        // Header Persona Menu Item Click
        document.querySelectorAll('.persona-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const pKey = item.getAttribute('data-persona');
                if (pKey) {
                    setPersona(pKey);
                    if (elements.headerPersonaWrapper) {
                        elements.headerPersonaWrapper.classList.remove('open');
                    }
                }
            });
        });

        // Close Auth Modal Button (Guarded: Cannot bypass when unauthenticated)
        if (elements.closeAuthModalBtn) {
            elements.closeAuthModalBtn.addEventListener('click', () => {
                if (state.auth && state.auth.isAuthenticated) {
                    if (elements.authModalOverlay) elements.authModalOverlay.classList.remove('active');
                } else {
                    Auth.showAlert('Please sign in or create an account to access ShiviAI.', 'info');
                }
            });
        }

        // Clear History Button
        if (elements.clearAllChatsBtn) {
            elements.clearAllChatsBtn.addEventListener('click', clearAllHistory);
        }

        // Export Button
        if (elements.exportChatBtn) {
            elements.exportChatBtn.addEventListener('click', exportConversation);
        }

        // Clear Current Chat Button
        if (elements.clearCurrentChatBtn) {
            elements.clearCurrentChatBtn.addEventListener('click', clearCurrentScreen);
        }

        // Mobile Sidebar Toggle
        if (elements.menuToggleBtn && elements.sidebar) {
            elements.menuToggleBtn.addEventListener('click', () => {
                elements.sidebar.classList.add('open');
                if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.add('active');
                playSound('click');
            });
        }

        if (elements.closeSidebarBtn) {
            elements.closeSidebarBtn.addEventListener('click', closeSidebarOnMobile);
        }
        if (elements.sidebarBackdrop) {
            elements.sidebarBackdrop.addEventListener('click', closeSidebarOnMobile);
        }

        // ==========================================
        // LIVE CONTINUOUS VOICE MODE EVENT LISTENERS
        // ==========================================
        if (elements.headerLiveVoiceBtn) {
            elements.headerLiveVoiceBtn.addEventListener('click', openLiveVoiceOverlay);
        }
        if (elements.startLiveVoiceBtn) {
            elements.startLiveVoiceBtn.addEventListener('click', openLiveVoiceOverlay);
        }
        if (elements.popoverLiveVoiceBtn) {
            elements.popoverLiveVoiceBtn.addEventListener('click', () => {
                if (elements.userProfilePopover) elements.userProfilePopover.classList.remove('open');
                openLiveVoiceOverlay();
            });
        }
        if (elements.menuActionLiveVoice) {
            elements.menuActionLiveVoice.addEventListener('click', () => {
                if (elements.inputActionMenu) elements.inputActionMenu.classList.remove('open');
                if (elements.actionMenuBtn) elements.actionMenuBtn.classList.remove('active');
                openLiveVoiceOverlay();
            });
        }

        // Live Voice Overlay Controls
        if (elements.voiceCloseBtn) {
            elements.voiceCloseBtn.addEventListener('click', closeLiveVoiceOverlay);
        }
        if (elements.voiceEndSessionBtn) {
            elements.voiceEndSessionBtn.addEventListener('click', closeLiveVoiceOverlay);
        }
        if (elements.voiceMuteMicBtn) {
            elements.voiceMuteMicBtn.addEventListener('click', toggleLiveVoiceMute);
        }
        if (elements.voiceInterruptBtn) {
            elements.voiceInterruptBtn.addEventListener('click', interruptVoicePlayback);
        }
        if (elements.voicePauseResumeBtn) {
            elements.voicePauseResumeBtn.addEventListener('click', toggleLiveVoicePause);
        }
        if (elements.voiceOrbContainer) {
            elements.voiceOrbContainer.addEventListener('click', handleOrbClick);
            elements.voiceOrbContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOrbClick();
                }
            });
        }
        if (elements.voiceLanguageSelect) {
            elements.voiceLanguageSelect.addEventListener('change', (e) => {
                const newLang = e.target.value;
                if (window.voiceService) {
                    window.voiceService.setLanguage(newLang);
                }
                populateVoiceSpeakerDropdown(newLang);
                showToast(`Language set to ${newLang}`, 'languages');
            });
        }
        if (elements.voiceSpeakerSelect) {
            elements.voiceSpeakerSelect.addEventListener('change', (e) => {
                const voiceVal = e.target.value;
                if (window.voiceService) {
                    window.voiceService.setSpeakerVoice(voiceVal);
                    const cleanLabel = voiceVal.replace(/^neural_/, 'Neural ');
                    showToast(`Voice set to: ${cleanLabel}`, 'volume-2');
                }
            });
        }

        // Close Voice Overlay on Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.voiceOverlay && elements.voiceOverlay.classList.contains('active')) {
                closeLiveVoiceOverlay();
            }
        });

        // Speech synthesis voice change event handler to refresh picker
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                populateVoiceSpeakerDropdown();
            };
        }

        // Voice Input (Mic)
        if (elements.micBtn) {
            elements.micBtn.addEventListener('click', toggleRecording);
        }

        // Stop Speaking Audio Button (Header)
        if (elements.stopSpeakingBtn) {
            elements.stopSpeakingBtn.addEventListener('click', () => {
                stopSpeakingVoice();
                showToast('Audio playback stopped', 'square');
            });
        }

        // Floating Speaking Indicator Mute Button
        if (elements.floatingMuteBtn) {
            elements.floatingMuteBtn.addEventListener('click', () => {
                stopSpeakingVoice();
                showToast('Voice readout muted', 'volume-x');
            });
        }

        // Voice TTS Toggle
        if (elements.voiceToggleBtn) {
            elements.voiceToggleBtn.addEventListener('click', () => {
                let newState = false;
                if (window.voiceService) {
                    newState = window.voiceService.toggleVoice();
                } else {
                    state.voiceEnabled = !state.voiceEnabled;
                    newState = state.voiceEnabled;
                    if (!newState) stopSpeakingVoice();
                    localStorage.setItem('shivi_voice_enabled', newState ? 'true' : 'false');
                }
                state.voiceEnabled = newState;
                saveState();
                updateVoiceIcon();
                playSound('click');
                showToast(newState ? 'Voice readout turned ON' : 'Voice readout turned OFF', newState ? 'volume-2' : 'volume-x');
            });
        }

        // Sound SFX Toggle
        if (elements.sfxToggleBtn) {
            elements.sfxToggleBtn.addEventListener('click', () => {
                state.sfxEnabled = !state.sfxEnabled;
                saveState();
                updateSfxIcon();
                showToast(state.sfxEnabled ? 'Sound effects ON' : 'Sound effects muted', state.sfxEnabled ? 'bell' : 'bell-off');
            });
        }

        // Dynamic Theme Switching Logic (4 Themes: Cyberpunk, Emerald, Violet, Amber)
        const cycleTheme = (e) => {
            if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
            }
            const themes = ['cyberpunk', 'emerald', 'violet', 'amber'];
            let current = state.currentTheme || 'cyberpunk';
            if (current === 'dark' || current === 'midnight' || current === 'cyber') current = 'cyberpunk';
            if (current === 'nebula' || current === 'sapphire') current = 'violet';
            if (current === 'sunset') current = 'amber';

            const currentIdx = themes.indexOf(current);
            const nextIdx = (currentIdx + 1) % themes.length;
            const nextTheme = themes[nextIdx];
            setTheme(nextTheme);
            return nextTheme;
        };

        const handleOpenThemePalette = (e) => {
            if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
            }
            cycleTheme(e);
        };

        // Window level exposure for seamless onclick and programmatic access
        window.openThemePalette = openThemeModal;
        window.cycleTheme = cycleTheme;
        window.openThemeModal = openThemeModal;
        window.closeThemeModal = closeThemeModal;
        window.setIsThemeModalOpen = setIsThemeModalOpen;
        window.handleSelectTheme = setTheme;
        window.setTheme = setTheme;

        // Theme Menu Button in Profile Dropdown: Opens Theme Selection Modal
        if (elements.themeMenuBtn) {
            elements.themeMenuBtn.addEventListener('click', (e) => {
                if (e) {
                    if (typeof e.preventDefault === 'function') e.preventDefault();
                    if (typeof e.stopPropagation === 'function') e.stopPropagation();
                }
                openThemeModal();
            });
        }

        // Theme Palette Grid Card Selection
        if (elements.themePaletteGrid) {
            elements.themePaletteGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.theme-palette-card');
                if (!card) return;
                const themeId = card.getAttribute('data-theme-id');
                if (themeId) {
                    setTheme(themeId);
                }
            });

            elements.themePaletteGrid.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const card = e.target.closest('.theme-palette-card');
                    if (card) {
                        e.preventDefault();
                        const themeId = card.getAttribute('data-theme-id');
                        if (themeId) setTheme(themeId);
                    }
                }
            });
        }

        // Close Theme Modal Triggers
        if (elements.closeThemeModalBtn) {
            elements.closeThemeModalBtn.addEventListener('click', closeThemeModal);
        }
        if (elements.closeThemeModalFooterBtn) {
            elements.closeThemeModalFooterBtn.addEventListener('click', closeThemeModal);
        }

        // Backdrop click to close Theme Selection Modal
        if (elements.themeSelectionModal) {
            elements.themeSelectionModal.addEventListener('click', (e) => {
                if (e.target === elements.themeSelectionModal) {
                    closeThemeModal();
                }
            });
        }

        // Global Escape key listener to close Theme Modal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.themeSelectionModal && elements.themeSelectionModal.classList.contains('active')) {
                    closeThemeModal();
                }
            }
        });

        // Sidebar Theme Switcher Button: Opens Theme Modal
        const sidebarThemeBtn = document.getElementById('sidebarThemeBtn');
        if (sidebarThemeBtn) {
            sidebarThemeBtn.addEventListener('click', (e) => {
                if (e) {
                    if (typeof e.preventDefault === 'function') e.preventDefault();
                    if (typeof e.stopPropagation === 'function') e.stopPropagation();
                }
                openThemeModal();
            });
        }

        // Theme Selection Items (legacy dropdown support if present)
        document.querySelectorAll('.theme-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-set-theme');
                if (theme === 'custom') {
                    openCustomThemeModal();
                } else {
                    setTheme(theme);
                }
            });
        });

        // Starter Prompts Click (Direct binding & Resilient Event Delegation)
        const handleStarterPromptClick = (prompt) => {
            if (!prompt) return;
            switchWorkspaceView('chat');
            if (elements.userInput) {
                elements.userInput.value = prompt;
                handleInputChange();
            }
            handleSendMessage(prompt);
            playSound('click');
        };

        document.querySelectorAll('.starter-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const prompt = card.getAttribute('data-prompt');
                handleStarterPromptClick(prompt);
            });
        });

        document.addEventListener('click', (e) => {
            const card = e.target.closest('.starter-card');
            if (card) {
                e.preventDefault();
                const prompt = card.getAttribute('data-prompt');
                handleStarterPromptClick(prompt);
            }
        });

        // Action Pills Click (/ppt Topic and /image Prompt)
        const populateActionPill = (prefix) => {
            switchWorkspaceView('chat');
            if (elements.userInput) {
                const current = elements.userInput.value.trim();
                if (!current) {
                    elements.userInput.value = prefix + ' ';
                } else if (!current.toLowerCase().startsWith(prefix.toLowerCase())) {
                    elements.userInput.value = `${prefix} ${current}`;
                }
                elements.userInput.focus();
                elements.userInput.setSelectionRange(elements.userInput.value.length, elements.userInput.value.length);
                handleInputChange();
                playSound('click');
            }
        };

        const actionPillPpt = elements.actionPillPpt || document.getElementById('actionPillPpt');
        if (actionPillPpt) {
            actionPillPpt.addEventListener('click', (e) => {
                e.preventDefault();
                populateActionPill('/ppt');
            });
        }

        const actionPillImage = elements.actionPillImage || document.getElementById('actionPillImage');
        if (actionPillImage) {
            actionPillImage.addEventListener('click', (e) => {
                e.preventDefault();
                populateActionPill('/image');
            });
        }

        document.addEventListener('click', (e) => {
            const pill = e.target.closest('.action-pill-btn');
            if (pill) {
                if (pill.id === 'actionPillPpt' || pill.textContent.includes('/ppt')) {
                    e.preventDefault();
                    populateActionPill('/ppt');
                } else if (pill.id === 'actionPillImage' || pill.textContent.includes('/image')) {
                    e.preventDefault();
                    populateActionPill('/image');
                }
            }
        });

        // Fallback for any legacy pill-chip elements
        document.querySelectorAll('.pill-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                if (prompt) {
                    handleSendMessage(prompt);
                }
            });
        });

        // Document & Media File Attachment Button
        if (elements.attachBtn && elements.fileAttachmentInput) {
            elements.attachBtn.addEventListener('click', () => {
                elements.fileAttachmentInput.click();
            });

            elements.fileAttachmentInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    await processSelectedFiles(Array.from(e.target.files));
                    e.target.value = '';
                    handleInputChange();
                    elements.userInput.focus();
                }
            });
        }

        // Drag & Drop File Upload onto Chat Input Dock
        const inputWrapper = document.querySelector('.input-wrapper');
        if (inputWrapper) {
            ['dragenter', 'dragover'].forEach(evtName => {
                inputWrapper.addEventListener(evtName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    inputWrapper.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(evtName => {
                inputWrapper.addEventListener(evtName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    inputWrapper.classList.remove('drag-over');
                });
            });

            inputWrapper.addEventListener('drop', async (e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    await processSelectedFiles(Array.from(e.dataTransfer.files));
                    handleInputChange();
                    elements.userInput.focus();
                }
            });
        }

        // Clipboard Paste Support (Paste Image or File directly into Chat Textarea)
        if (elements.userInput) {
            elements.userInput.addEventListener('paste', async (e) => {
                if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                    const files = Array.from(e.clipboardData.files);
                    if (files.length > 0) {
                        e.preventDefault();
                        await processSelectedFiles(files);
                        handleInputChange();
                    }
                }
            });
        }

        // ==========================================
        // BRAIN HUB MODAL EVENT HANDLERS
        // ==========================================
        if (elements.openBrainBtnHeader) {
            elements.openBrainBtnHeader.addEventListener('click', () => {
                if (elements.userProfileWrapper) elements.userProfileWrapper.classList.remove('open');
                openBrainModal('providers');
            });
        }
        if (elements.openBrainBtnSidebar) {
            elements.openBrainBtnSidebar.addEventListener('click', () => {
                openBrainModal('providers');
                closeSidebarOnMobile();
            });
        }
        if (elements.openBrainFromSettingsBtn) {
            elements.openBrainFromSettingsBtn.addEventListener('click', () => {
                closeSettings();
                openBrainModal('providers');
            });
        }
        if (elements.closeBrainBtn) {
            elements.closeBrainBtn.addEventListener('click', closeBrainModal);
        }
        if (elements.closeBrainFooterBtn) {
            elements.closeBrainFooterBtn.addEventListener('click', closeBrainModal);
        }

        // Image Studio Modal & Dock Button
        if (elements.openImageGenModalBtn) {
            elements.openImageGenModalBtn.addEventListener('click', () => {
                openImageStudioModal();
            });
        }
        if (elements.closeImageGenBtn) {
            elements.closeImageGenBtn.addEventListener('click', closeImageStudioModal);
        }
        if (elements.cancelImageGenBtn) {
            elements.cancelImageGenBtn.addEventListener('click', closeImageStudioModal);
        }
        if (elements.imageGenModal) {
            elements.imageGenModal.addEventListener('click', (e) => {
                if (e.target === elements.imageGenModal) {
                    closeImageStudioModal();
                }
            });
        }
        if (elements.submitImageGenBtn) {
            elements.submitImageGenBtn.addEventListener('click', () => {
                const prompt = elements.imagePromptInput ? elements.imagePromptInput.value.trim() : '';
                if (!prompt) {
                    showToast('Please enter an image prompt', 'alert-circle');
                    return;
                }
                const style = elements.modalImageStyleSelect ? elements.modalImageStyleSelect.value : 'vivid';
                const size = elements.modalImageSizeSelect ? elements.modalImageSizeSelect.value : '1024x1024';
                generateAiImage(prompt, { style, size });
            });
        }

        // Image Idea Chips
        document.querySelectorAll('.prompt-idea-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const p = chip.getAttribute('data-prompt');
                if (p && elements.imagePromptInput) {
                    elements.imagePromptInput.value = p;
                    elements.imagePromptInput.focus();
                    playSound('click');
                }
            });
        });

        // Brain Tabs Switch
        document.querySelectorAll('.brain-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                switchBrainTab(tab);
                playSound('click');
            });
        });

        // Provider Cards Selection
        elements.providerCards.forEach(card => {
            card.addEventListener('click', () => {
                const provider = card.getAttribute('data-provider');
                state.brainProvider = provider;
                elements.providerCards.forEach(c => c.classList.toggle('active', c === card));
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;

                const currentMeta = PROVIDER_METADATA[provider];
                if (provider === 'builtin') {
                    elements.apiKeySection.style.display = 'none';
                } else {
                    elements.apiKeySection.style.display = 'flex';
                    elements.apiKeyLabel.textContent = `${currentMeta.name} API Key`;
                    elements.apiHelpLink.href = currentMeta.helpUrl;
                    elements.apiHelpText.textContent = currentMeta.helpText;
                    elements.brainApiKeyInput.placeholder = currentMeta.placeholder;
                    elements.brainApiKeyInput.value = state.apiKeys[provider] || '';

                    elements.brainModelSelect.innerHTML = '';
                    currentMeta.models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.id;
                        opt.textContent = m.name;
                        if (m.id === state.apiModels[provider]) opt.selected = true;
                        elements.brainModelSelect.appendChild(opt);
                    });
                }
                elements.apiStatusBanner.style.display = 'none';
                playSound('click');
            });
        });

        // Image Provider Cards Selection
        if (elements.imageProviderCards) {
            elements.imageProviderCards.forEach(card => {
                card.addEventListener('click', () => {
                    const provider = card.getAttribute('data-img-provider');
                    state.imageProvider = provider;
                    elements.imageProviderCards.forEach(c => c.classList.toggle('active', c === card));
                    const radio = card.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;

                    renderImageHubUI();
                    playSound('click');
                });
            });
        }

        // Toggle API Key Visibility
        if (elements.toggleKeyVisibilityBtn) {
            elements.toggleKeyVisibilityBtn.addEventListener('click', () => {
                const isPass = elements.brainApiKeyInput.type === 'password';
                elements.brainApiKeyInput.type = isPass ? 'text' : 'password';
                elements.eyeIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
                if (window.lucide) lucide.createIcons();
            });
        }

        // Toggle Image API Key Visibility
        if (elements.toggleImageKeyVisibilityBtn && elements.imageApiKeyInput) {
            elements.toggleImageKeyVisibilityBtn.addEventListener('click', () => {
                const isPass = elements.imageApiKeyInput.type === 'password';
                elements.imageApiKeyInput.type = isPass ? 'text' : 'password';
                if (elements.imageEyeIcon) {
                    elements.imageEyeIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
                    if (window.lucide) lucide.createIcons();
                }
            });
        }

        // Test API Connection Button
        if (elements.testApiBtn) {
            elements.testApiBtn.addEventListener('click', testApiConnection);
        }

        // Test Image API Connection Button
        if (elements.testImageApiBtn) {
            elements.testImageApiBtn.addEventListener('click', testImageApiConnection);
        }

        // Save to .env (Backend) Button
        if (elements.saveEnvBtn) {
            elements.saveEnvBtn.addEventListener('click', saveToBackendEnv);
        }

        // Save Image Key to .env Button
        if (elements.saveImageEnvBtn) {
            elements.saveImageEnvBtn.addEventListener('click', saveImageToBackendEnv);
        }

        // Default image style dropdown change
        if (elements.defaultImageStyleSelect) {
            elements.defaultImageStyleSelect.addEventListener('change', (e) => {
                state.defaultImageStyle = e.target.value;
                saveState();
            });
        }

        // Save Brain Hub Settings
        if (elements.saveBrainHubBtn) {
            elements.saveBrainHubBtn.addEventListener('click', () => {
                if (state.brainProvider !== 'builtin') {
                    state.apiKeys[state.brainProvider] = elements.brainApiKeyInput.value.trim();
                    if (elements.brainModelSelect.value) {
                        state.apiModels[state.brainProvider] = elements.brainModelSelect.value;
                    }
                }
                if (elements.imageApiKeyInput) {
                    state.imageApiKey = elements.imageApiKeyInput.value.trim();
                }
                if (elements.defaultImageStyleSelect) {
                    state.defaultImageStyle = elements.defaultImageStyleSelect.value;
                }
                state.systemInstructions = elements.brainSystemPrompt.value.trim();
                saveState();
                closeBrainModal();
                showToast('Brain Hub & Image settings applied!', 'check');
            });
        }

        // Knowledge Base Search Filter
        if (elements.kbSearchInput) {
            elements.kbSearchInput.addEventListener('input', (e) => {
                renderKnowledgeList(e.target.value);
            });
        }

        // Add Knowledge Form Drawer
        if (elements.openAddKbBtn) {
            elements.openAddKbBtn.addEventListener('click', openAddKbForm);
        }
        if (elements.closeKbEditorBtn) {
            elements.closeKbEditorBtn.addEventListener('click', () => {
                elements.kbEditorCard.style.display = 'none';
            });
        }
        if (elements.cancelKbBtn) {
            elements.cancelKbBtn.addEventListener('click', () => {
                elements.kbEditorCard.style.display = 'none';
            });
        }
        if (elements.saveKbItemBtn) {
            elements.saveKbItemBtn.addEventListener('click', saveKbFormItem);
        }

        // File Export & Import Handlers
        if (elements.btnExportAllData) {
            elements.btnExportAllData.addEventListener('click', exportAllDataFile);
        }
        if (elements.btnExportKnowledgeJson) {
            elements.btnExportKnowledgeJson.addEventListener('click', exportKnowledgeJsonFile);
        }
        if (elements.btnImportDataFile) {
            elements.btnImportDataFile.addEventListener('click', () => {
                elements.dataFileInput.click();
            });
        }
        if (elements.dataFileInput) {
            elements.dataFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    importDataFromJsonFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }
        if (elements.btnResetKnowledgeDefault) {
            elements.btnResetKnowledgeDefault.addEventListener('click', resetKnowledgeToDefault);
        }

        // Settings Modal
        if (elements.openSettingsBtn) elements.openSettingsBtn.addEventListener('click', openSettings);
        if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', closeSettings);
        if (elements.saveSettingsBtn) elements.saveSettingsBtn.addEventListener('click', saveSettings);

        if (elements.settingsModal) {
            elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === elements.settingsModal) {
                    closeSettings();
                }
            });
        }

        if (elements.openCustomStudioFromSettingsBtn) {
            elements.openCustomStudioFromSettingsBtn.addEventListener('click', () => {
                closeSettings();
                openCustomThemeModal();
            });
        }

        if (elements.brainModal) {
            elements.brainModal.addEventListener('click', (e) => {
                if (e.target === elements.brainModal) {
                    closeBrainModal();
                }
            });
        }

        // Custom Theme Studio Listeners
        if (elements.closeCustomThemeBtn) {
            elements.closeCustomThemeBtn.addEventListener('click', closeCustomThemeModal);
        }

        if (elements.customThemeModal) {
            elements.customThemeModal.addEventListener('click', (e) => {
                if (e.target === elements.customThemeModal) {
                    closeCustomThemeModal();
                }
            });
        }

        if (elements.btnResetToBlackGrey) {
            elements.btnResetToBlackGrey.addEventListener('click', resetCustomThemeToDefault);
        }

        if (elements.btnExportCustomThemeCss) {
            elements.btnExportCustomThemeCss.addEventListener('click', exportCustomThemeCss);
        }

        if (elements.btnApplyCustomTheme) {
            elements.btnApplyCustomTheme.addEventListener('click', applyAndSaveCustomTheme);
        }

        // Real-Time Color Inputs Live Syncing
        const colorFields = [
            'colorBgMain', 'colorBgSecondary', 'colorBgCard',
            'colorPrimary', 'colorUserBubble', 'colorAiBubble',
            'colorTextPrimary', 'colorTextMuted', 'colorBorder'
        ];

        colorFields.forEach(fieldId => {
            const colorPicker = elements[fieldId];
            const hexInput = elements[fieldId + 'Hex'];

            if (colorPicker && hexInput) {
                colorPicker.addEventListener('input', () => {
                    hexInput.value = colorPicker.value.toUpperCase();
                    updateThemeLivePreview();
                });

                hexInput.addEventListener('input', () => {
                    let val = hexInput.value.trim();
                    if (!val.startsWith('#')) val = '#' + val;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        colorPicker.value = val;
                        updateThemeLivePreview();
                    }
                });

                hexInput.addEventListener('blur', () => {
                    let val = hexInput.value.trim();
                    if (!val.startsWith('#')) val = '#' + val;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        hexInput.value = val.toUpperCase();
                        colorPicker.value = val;
                    } else {
                        hexInput.value = colorPicker.value.toUpperCase();
                    }
                    updateThemeLivePreview();
                });
            }
        });

        if (elements.speechRateSlider && elements.speechRateVal) {
            elements.speechRateSlider.addEventListener('input', (e) => {
                elements.speechRateVal.textContent = e.target.value + 'x';
            });
        }

        if (elements.fontSelect) {
            elements.fontSelect.addEventListener('change', (e) => {
                setFont(e.target.value);
            });
        }

        if (elements.resetDefaultsBtn) {
            elements.resetDefaultsBtn.addEventListener('click', () => {
                state.brainProvider = 'builtin';
                state.speechRate = 1.0;
                state.sfxVolume = 0.5;
                setFont('poppins');
                setTheme('midnight');
                updateSettingsModalUI();
                saveState();
                showToast('Settings reset to defaults (Black & Grey)', 'rotate-ccw');
            });
        }

        // Image Lightbox Close Listeners
        const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
        const lightboxBackdrop = document.getElementById('lightboxBackdrop');
        if (lightboxCloseBtn) {
            lightboxCloseBtn.addEventListener('click', closeImageLightbox);
        }
        if (lightboxBackdrop) {
            lightboxBackdrop.addEventListener('click', closeImageLightbox);
        }
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeImageLightbox();
            }
        });

        // ==========================================
        // QUICK ACTION CHIPS TOOLBAR LISTENERS
        // ==========================================
        if (elements.quickChipImage) {
            elements.quickChipImage.addEventListener('click', () => {
                openImageStudioModal();
            });
        }

        if (elements.quickChipPpt) {
            elements.quickChipPpt.addEventListener('click', () => {
                const currentVal = elements.userInput ? elements.userInput.value.trim() : '';
                if (currentVal && currentVal !== '/ppt') {
                    if (!currentVal.toLowerCase().startsWith('/ppt')) {
                        elements.userInput.value = `/ppt ${currentVal}`;
                    }
                    handleSendMessage();
                } else {
                    elements.userInput.value = '/ppt ';
                    elements.userInput.placeholder = 'What topic should ShiviAI create a presentation on? (e.g. AI in Healthcare)';
                    elements.userInput.focus();
                    handleInputChange();
                    showToast('What topic should ShiviAI create a presentation on?', 'presentation');

                    const session = getCurrentSession();
                    if (session && session.messages.length === 0) {
                        elements.welcomeHero.style.display = 'none';
                        const promptMsg = {
                            id: 'msg_' + Date.now(),
                            role: 'assistant',
                            content: '📊 **What topic should ShiviAI create a presentation on?**\n\nType your presentation topic above (e.g. `/ppt Breakthroughs in AI Medicine` or `/ppt Renewable Energy Trends 2026`).',
                            timestamp: new Date().toISOString()
                        };
                        session.messages.push(promptMsg);
                        saveState();
                        appendMessageToDOM(promptMsg, session.messages.length - 1);
                        scrollToBottom();
                    }
                }
            });
        }

        if (elements.quickChipCanvas) {
            elements.quickChipCanvas.addEventListener('click', () => {
                toggleCanvas();
            });
        }

        if (elements.quickChipDoc) {
            elements.quickChipDoc.addEventListener('click', () => {
                openCanvas('doc', {
                    title: 'Interactive Document & Code',
                    subtitle: 'Scratchpad and Live Markdown Studio',
                    language: 'markdown',
                    content: `# 📝 Shivi AI Document Workspace\n\nWelcome to your **Interactive Canvas Studio**! You can write, preview, and export documents, code snippets, notes, and interactive ideas.\n\n### 🚀 Quick Features:\n- Live Markdown & Syntax Rendering\n- Instant Source / JSON Viewer\n- One-click Copy & Download\n\n\`\`\`javascript\n// Quick helper function\nfunction greet(name) {\n    return \`Hello, \${name}! Welcome to Shivi AI Canvas 🎨\`;\n}\nconsole.log(greet('User'));\n\`\`\`\n\nFeel free to ask Shivi in the chat to edit or elaborate this document anytime!`
                });
            });
        }

        // Header Canvas Toggle Button
        if (elements.openCanvasBtnHeader) {
            elements.openCanvasBtnHeader.addEventListener('click', () => {
                if (elements.userProfileWrapper) elements.userProfileWrapper.classList.remove('open');
                toggleCanvas();
            });
        }

        // Canvas Header Actions
        if (elements.canvasCloseBtn) {
            elements.canvasCloseBtn.addEventListener('click', closeCanvas);
        }
        if (elements.canvasBackdrop) {
            elements.canvasBackdrop.addEventListener('click', closeCanvas);
        }
        if (elements.canvasFullscreenBtn) {
            elements.canvasFullscreenBtn.addEventListener('click', toggleCanvasFullscreen);
        }
        if (elements.canvasTabPreview) {
            elements.canvasTabPreview.addEventListener('click', () => switchCanvasTab('preview'));
        }
        if (elements.canvasTabCode) {
            elements.canvasTabCode.addEventListener('click', () => switchCanvasTab('code'));
        }

        // Canvas Empty State Buttons
        if (elements.emptyCreateImageBtn) {
            elements.emptyCreateImageBtn.addEventListener('click', () => openImageStudioModal());
        }
        if (elements.emptyCreatePptBtn) {
            elements.emptyCreatePptBtn.addEventListener('click', () => {
                const currentVal = elements.userInput ? elements.userInput.value.trim() : '';
                if (currentVal && currentVal !== '/ppt') {
                    if (!currentVal.toLowerCase().startsWith('/ppt')) {
                        elements.userInput.value = `/ppt ${currentVal}`;
                    }
                    handleSendMessage();
                } else {
                    elements.userInput.value = '/ppt ';
                    elements.userInput.placeholder = 'What topic should ShiviAI create a presentation on? (e.g. AI in Healthcare)';
                    elements.userInput.focus();
                    handleInputChange();
                    showToast('What topic should ShiviAI create a presentation on?', 'presentation');
                }
            });
        }

        // Canvas PPT Controls
        if (elements.pptPrevBtn) {
            elements.pptPrevBtn.addEventListener('click', pptPrevSlide);
        }
        if (elements.pptNextBtn) {
            elements.pptNextBtn.addEventListener('click', pptNextSlide);
        }
        if (elements.pptJumpSelect) {
            elements.pptJumpSelect.addEventListener('change', () => {
                const idx = parseInt(elements.pptJumpSelect.value, 10);
                if (!isNaN(idx)) {
                    renderPptSlide(idx);
                    playSound('click');
                }
            });
        }
        if (elements.canvasDownloadPptBtn) {
            elements.canvasDownloadPptBtn.addEventListener('click', () => {
                if (state.canvas.artifact && state.canvas.artifact.type === 'ppt' && state.canvas.artifact.data) {
                    exportPptxFile(state.canvas.artifact.data);
                } else {
                    showToast('No active presentation to download', 'alert-circle');
                }
            });
        }

        // Canvas Image Controls
        if (elements.canvasDownloadImgBtn) {
            elements.canvasDownloadImgBtn.addEventListener('click', () => {
                if (state.canvas.artifact && state.canvas.artifact.type === 'image' && state.canvas.artifact.data) {
                    const data = state.canvas.artifact.data;
                    const fname = `shivi_artwork_${Date.now()}.png`;
                    downloadImageDirect(data.imageUrl, fname);
                }
            });
        }
        if (elements.canvasZoomImgBtn) {
            elements.canvasZoomImgBtn.addEventListener('click', () => {
                if (state.canvas.artifact && state.canvas.artifact.type === 'image' && state.canvas.artifact.data) {
                    const data = state.canvas.artifact.data;
                    openImageLightbox(data.imageUrl, data.prompt);
                }
            });
        }
        if (elements.canvasMainImage) {
            elements.canvasMainImage.addEventListener('click', () => {
                if (state.canvas.artifact && state.canvas.artifact.type === 'image' && state.canvas.artifact.data) {
                    const data = state.canvas.artifact.data;
                    openImageLightbox(data.imageUrl, data.prompt);
                }
            });
        }

        // Style Remix Chips Listener
        document.querySelectorAll('.remix-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const style = chip.getAttribute('data-style');
                let basePrompt = 'cinematic artwork';
                if (state.canvas.artifact && state.canvas.artifact.type === 'image' && state.canvas.artifact.data) {
                    basePrompt = state.canvas.artifact.data.prompt || basePrompt;
                }
                const remixedPrompt = `${basePrompt}, in ${style} style aesthetic, highly detailed masterpiece`;
                generateAiImage(remixedPrompt, { style: style });
            });
        });

        // Canvas Doc & Source Copy Buttons
        if (elements.canvasCopyDocBtn) {
            elements.canvasCopyDocBtn.addEventListener('click', () => {
                if (state.canvas.artifact && state.canvas.artifact.data) {
                    const content = state.canvas.artifact.data.content || '';
                    navigator.clipboard.writeText(content).then(() => {
                        showToast('Document copied to clipboard!', 'check');
                        playSound('click');
                    });
                }
            });
        }
        if (elements.canvasCopyRawBtn) {
            elements.canvasCopyRawBtn.addEventListener('click', () => {
                if (elements.canvasRawCode) {
                    navigator.clipboard.writeText(elements.canvasRawCode.textContent || '').then(() => {
                        showToast('Source / JSON copied to clipboard!', 'check');
                        playSound('click');
                    });
                }
            });
        }

        // PPT Studio Quick Modal Listeners
        if (elements.closePptModalBtn) {
            elements.closePptModalBtn.addEventListener('click', closePptModal);
        }
        if (elements.cancelPptModalBtn) {
            elements.cancelPptModalBtn.addEventListener('click', closePptModal);
        }
        if (elements.pptStudioModal) {
            elements.pptStudioModal.addEventListener('click', (e) => {
                if (e.target === elements.pptStudioModal) {
                    closePptModal();
                }
            });
        }
        if (elements.startPptModalBtn) {
            elements.startPptModalBtn.addEventListener('click', () => {
                const topic = elements.pptTopicInput ? elements.pptTopicInput.value.trim() : '';
                if (!topic) {
                    showToast('Please enter a presentation topic or title', 'alert-circle');
                    if (elements.pptTopicInput) elements.pptTopicInput.focus();
                    return;
                }
                const countVal = elements.pptSlideCountSelect ? elements.pptSlideCountSelect.value : 'auto';
                const count = countVal === 'auto' ? null : parseInt(countVal, 10);
                const theme = elements.pptThemeSelect ? elements.pptThemeSelect.value : 'modern_blue';
                closePptModal();
                generatePresentation(topic, count, theme);
            });
        }

        // ==========================================
        // WORKSPACE TOP NAVIGATION TABS
        // ==========================================
        if (elements.viewTabChat) {
            elements.viewTabChat.addEventListener('click', (e) => {
                e.preventDefault();
                switchWorkspaceView('chat');
            });
        }
        if (elements.viewTabPresentation) {
            elements.viewTabPresentation.addEventListener('click', (e) => {
                e.preventDefault();
                switchWorkspaceView('presentation');
            });
        }
        if (elements.viewTabImage) {
            elements.viewTabImage.addEventListener('click', (e) => {
                e.preventDefault();
                switchWorkspaceView('image');
            });
        }

        // Delegated Workspace Tab Navigation
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.workspace-tab-btn');
            if (tabBtn) {
                e.preventDefault();
                const view = tabBtn.getAttribute('data-view') || (tabBtn.id === 'viewTabPresentation' ? 'presentation' : tabBtn.id === 'viewTabImage' ? 'image' : 'chat');
                switchWorkspaceView(view);
            }
        });

        // ==========================================
        // [+] ACTION MENU POPOVER LISTENERS
        // ==========================================
        if (elements.actionMenuBtn && elements.inputActionMenu) {
            elements.actionMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = elements.inputActionMenu.classList.toggle('open');
                elements.actionMenuBtn.classList.toggle('active', isOpen);
                playSound('click');
            });

            document.addEventListener('click', (e) => {
                if (elements.inputActionMenu.classList.contains('open')) {
                    if (!elements.inputActionMenu.contains(e.target) && e.target !== elements.actionMenuBtn) {
                        elements.inputActionMenu.classList.remove('open');
                        elements.actionMenuBtn.classList.remove('active');
                    }
                }
            });
        }

        // Upload Files Option (Local Storage)
        if (elements.menuActionUpload) {
            elements.menuActionUpload.addEventListener('click', () => {
                if (elements.inputActionMenu) elements.inputActionMenu.classList.remove('open');
                if (elements.actionMenuBtn) elements.actionMenuBtn.classList.remove('active');
                if (elements.fileAttachmentInput) elements.fileAttachmentInput.click();
            });
        }

        // Add from Google Drive Option (Cloud File Picker)
        if (elements.menuActionDrive) {
            elements.menuActionDrive.addEventListener('click', () => {
                if (elements.inputActionMenu) elements.inputActionMenu.classList.remove('open');
                if (elements.actionMenuBtn) elements.actionMenuBtn.classList.remove('active');
                openGoogleDriveModal();
            });
        }

        if (elements.menuActionPpt) {
            elements.menuActionPpt.addEventListener('click', () => {
                if (elements.inputActionMenu) elements.inputActionMenu.classList.remove('open');
                if (elements.actionMenuBtn) elements.actionMenuBtn.classList.remove('active');
                switchWorkspaceView('presentation');
                setTimeout(() => {
                    if (elements.studioTopicInput) elements.studioTopicInput.focus();
                }, 120);
            });
        }

        if (elements.menuActionImage) {
            elements.menuActionImage.addEventListener('click', () => {
                if (elements.inputActionMenu) elements.inputActionMenu.classList.remove('open');
                if (elements.actionMenuBtn) elements.actionMenuBtn.classList.remove('active');
                switchWorkspaceView('image');
                setTimeout(() => {
                    if (elements.imageStudioPromptInput) elements.imageStudioPromptInput.focus();
                }, 120);
            });
        }

        if (elements.menuActionAttach) {
            elements.menuActionAttach.addEventListener('click', () => {
                if (elements.inputActionMenu) elements.inputActionMenu.classList.remove('open');
                if (elements.actionMenuBtn) elements.actionMenuBtn.classList.remove('active');
                if (elements.fileAttachmentInput) elements.fileAttachmentInput.click();
            });
        }

        // Google Drive Modal Controls & Listeners
        if (elements.closeGoogleDriveModalBtn) {
            elements.closeGoogleDriveModalBtn.addEventListener('click', closeGoogleDriveModal);
        }
        if (elements.cancelGoogleDriveBtn) {
            elements.cancelGoogleDriveBtn.addEventListener('click', closeGoogleDriveModal);
        }
        if (elements.confirmGoogleDriveBtn) {
            elements.confirmGoogleDriveBtn.addEventListener('click', confirmGoogleDriveAttachment);
        }

        if (elements.gdriveLinkInput) {
            elements.gdriveLinkInput.addEventListener('input', updateGoogleDriveDetection);
            elements.gdriveLinkInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmGoogleDriveAttachment();
                }
            });
        }
        if (elements.gdriveFileNameInput) {
            elements.gdriveFileNameInput.addEventListener('input', updateGoogleDriveDetection);
        }

        if (elements.gdrivePasteBtn && elements.gdriveLinkInput) {
            elements.gdrivePasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        elements.gdriveLinkInput.value = text.trim();
                        updateGoogleDriveDetection();
                        showToast('Pasted link from clipboard', 'clipboard');
                    }
                } catch(err) {
                    elements.gdriveLinkInput.focus();
                    showToast('Please press Ctrl+V to paste', 'info');
                }
            });
        }

        // Google Drive Modal Tab Navigation (Link vs Cloud Picker)
        if (elements.gdriveTabLinkBtn && elements.gdriveTabPickerBtn) {
            elements.gdriveTabLinkBtn.addEventListener('click', () => {
                elements.gdriveTabLinkBtn.classList.add('active');
                elements.gdriveTabPickerBtn.classList.remove('active');
                if (elements.gdriveLinkPane) elements.gdriveLinkPane.classList.add('active');
                if (elements.gdrivePickerPane) elements.gdrivePickerPane.classList.remove('active');
            });

            elements.gdriveTabPickerBtn.addEventListener('click', () => {
                elements.gdriveTabPickerBtn.classList.add('active');
                elements.gdriveTabLinkBtn.classList.remove('active');
                if (elements.gdrivePickerPane) elements.gdrivePickerPane.classList.add('active');
                if (elements.gdriveLinkPane) elements.gdriveLinkPane.classList.remove('active');
            });
        }

        if (elements.launchGdrivePickerBtn) {
            elements.launchGdrivePickerBtn.addEventListener('click', initGoogleDrivePicker);
        }

        if (elements.saveGdriveCredsBtn) {
            elements.saveGdriveCredsBtn.addEventListener('click', () => {
                const key = elements.gdriveApiKeyInput ? elements.gdriveApiKeyInput.value.trim() : '';
                const clientId = elements.gdriveClientIdInput ? elements.gdriveClientIdInput.value.trim() : '';
                if (key) localStorage.setItem('shivi_gdrive_api_key', key);
                if (clientId) localStorage.setItem('shivi_gdrive_client_id', clientId);
                showToast('Google API credentials saved locally', 'check');
            });
        }

        if (elements.googleDriveModal) {
            elements.googleDriveModal.addEventListener('click', (e) => {
                if (e.target === elements.googleDriveModal) {
                    closeGoogleDriveModal();
                }
            });
        }

        // ==========================================
        // PRESENTATION STUDIO IN-WORKSPACE LISTENERS
        // ==========================================
        if (elements.studioGenerateBtn) {
            elements.studioGenerateBtn.addEventListener('click', () => {
                const topic = elements.studioTopicInput ? elements.studioTopicInput.value.trim() : '';
                if (!topic) {
                    showToast('Please enter a presentation topic', 'alert-circle');
                    if (elements.studioTopicInput) elements.studioTopicInput.focus();
                    return;
                }
                const countVal = elements.studioCountSelect ? elements.studioCountSelect.value : 'auto';
                const count = countVal === 'auto' ? null : parseInt(countVal, 10);
                const theme = elements.studioThemeSelect ? elements.studioThemeSelect.value : 'dark_modern';
                generatePresentation(topic, count, theme);
            });
        }

        if (elements.studioTopicInput) {
            elements.studioTopicInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (elements.studioGenerateBtn) elements.studioGenerateBtn.click();
                }
            });
        }

        // Placeholder quick topic chips
        document.querySelectorAll('.topic-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const topic = chip.getAttribute('data-topic');
                if (topic) {
                    if (elements.studioTopicInput) elements.studioTopicInput.value = topic;
                    generatePresentation(topic);
                }
            });
        });

        // Presentation Studio Fullscreen Triggers & Floating Control Bar
        if (elements.playerFullscreenBtn) {
            elements.playerFullscreenBtn.addEventListener('click', togglePresentationFullscreen);
        }
        if (elements.studioFullscreenBtn) {
            elements.studioFullscreenBtn.addEventListener('click', togglePresentationFullscreen);
        }
        if (elements.pptExitFullscreenBtn) {
            elements.pptExitFullscreenBtn.addEventListener('click', exitPresentationFullscreen);
        }

        // Fullscreen Auto-Hide Mouse Movements
        const stageWrapper = elements.pptStageWrapper || document.getElementById('pptStageWrapper');
        if (stageWrapper) {
            stageWrapper.addEventListener('mousemove', () => {
                if (document.fullscreenElement || stageWrapper.classList.contains('theater-mode') || stageWrapper.classList.contains('is-fullscreen')) {
                    showFullscreenControls();
                }
            });
        }
        window.addEventListener('mousemove', () => {
            if (document.fullscreenElement) {
                showFullscreenControls();
            }
        });

        // Presentation Studio Manual Export (.pptx file)
        if (elements.studioExportBtn) {
            elements.studioExportBtn.addEventListener('click', () => {
                if (state.canvas.artifact && state.canvas.artifact.type === 'ppt' && state.canvas.artifact.data) {
                    exportPptxFile(state.canvas.artifact.data);
                } else {
                    showToast('No active presentation to export', 'alert-circle');
                }
            });
        }

        // Document Fullscreen Change Event (Sync Icons & State)
        const onFullscreenStateChange = () => {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
            const stageWrapperEl = elements.pptStageWrapper || document.getElementById('pptStageWrapper');
            if (stageWrapperEl) {
                stageWrapperEl.classList.toggle('is-fullscreen', isFs);
                if (!isFs) stageWrapperEl.classList.remove('theater-mode');
            }
            const bar = elements.pptFullscreenControlBar || document.getElementById('pptFullscreenControlBar');
            if (isFs) {
                showFullscreenControls();
            } else if (bar) {
                bar.classList.remove('visible');
                bar.style.opacity = '0';
                bar.style.pointerEvents = 'none';
            }
            const iconName = isFs ? 'minimize-2' : 'maximize-2';
            if (elements.playerFullscreenIcon) elements.playerFullscreenIcon.setAttribute('data-lucide', iconName);
            if (elements.studioFullscreenIcon) elements.studioFullscreenIcon.setAttribute('data-lucide', iconName);
            if (window.lucide) lucide.createIcons();
        };

        document.addEventListener('fullscreenchange', onFullscreenStateChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenStateChange);

        // ==========================================
        // IMAGE STUDIO IN-WORKSPACE LISTENERS
        // ==========================================
        if (elements.imageStudioGenerateBtn) {
            elements.imageStudioGenerateBtn.addEventListener('click', () => {
                const prompt = elements.imageStudioPromptInput ? elements.imageStudioPromptInput.value.trim() : '';
                if (!prompt) {
                    showToast('Please enter an image prompt', 'alert-circle');
                    if (elements.imageStudioPromptInput) elements.imageStudioPromptInput.focus();
                    return;
                }
                const style = elements.imageStudioStyleSelect ? elements.imageStudioStyleSelect.value : 'photorealistic';
                generateAiImage(prompt, { style });
            });
        }

        if (elements.imageStudioPromptInput) {
            elements.imageStudioPromptInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (elements.imageStudioGenerateBtn) elements.imageStudioGenerateBtn.click();
                }
            });
        }

        // ==========================================
        // GLOBAL KEYBOARD NAVIGATION
        // ==========================================
        window.addEventListener('keydown', (e) => {
            const stageWrapperEl = elements.pptStageWrapper || document.getElementById('pptStageWrapper');
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || (stageWrapperEl && (stageWrapperEl.classList.contains('theater-mode') || stageWrapperEl.classList.contains('is-fullscreen'))));

            if (e.key === 'Escape') {
                if (isFs) {
                    e.preventDefault();
                    exitPresentationFullscreen();
                    return;
                }
                if (elements.pptStudioModal && elements.pptStudioModal.style.display !== 'none') {
                    closePptModal();
                } else if (state.canvas.isFullscreen) {
                    toggleCanvasFullscreen();
                } else if (state.canvas.isOpen) {
                    closeCanvas();
                }
            } else if ((isFs || state.activeWorkspaceView === 'presentation' || state.canvas.isOpen) && state.canvas.artifact && state.canvas.artifact.type === 'ppt') {
                const activeTag = (document.activeElement && document.activeElement.tagName) || '';
                const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

                if (!isInputActive) {
                    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                        if (e.key === ' ') e.preventDefault();
                        pptNextSlide();
                    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                        pptPrevSlide();
                    } else if (e.key === 'Home') {
                        pptFirstSlide();
                    } else if (e.key === 'End') {
                        pptLastSlide();
                    }
                }
            }
        });

        // ==========================================
        // AUTHENTICATION & PROFILE POPOVER LISTENERS
        // ==========================================
        if (elements.authTabLogin) {
            elements.authTabLogin.addEventListener('click', () => Auth.switchTab('login'));
        }
        if (elements.authTabDirect) {
            elements.authTabDirect.addEventListener('click', () => Auth.switchTab('direct'));
        }
        if (elements.authTabSignup) {
            elements.authTabSignup.addEventListener('click', () => Auth.switchTab('signup'));
        }
        if (elements.btnForgotPass) {
            elements.btnForgotPass.addEventListener('click', () => Auth.switchTab('forgot'));
        }
        if (elements.btnBackToLogin) {
            elements.btnBackToLogin.addEventListener('click', () => Auth.switchTab('login'));
        }

        // 1. CONTINUE AS GUEST / INSTANT DEMO (Zero-Friction Access)
        if (elements.btnGuestAuth) {
            elements.btnGuestAuth.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                Auth.handleGuestLogin();
            });
        }
        if (elements.btnGuestAuthTab) {
            elements.btnGuestAuthTab.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                Auth.handleGuestLogin();
            });
        }
        if (elements.btnGuestChooser) {
            elements.btnGuestChooser.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                Auth.handleGuestLogin();
            });
        }
        if (elements.closeAuthModalBtn) {
            elements.closeAuthModalBtn.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                Auth.handleGuestLogin();
            });
        }

        // 3. SIMPLE EMAIL / DIRECT ACCESS FALLBACK
        if (elements.btnDirectEnter) {
            elements.btnDirectEnter.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                const name = elements.directNameInput ? elements.directNameInput.value.trim() : '';
                const email = elements.directEmailInput ? elements.directEmailInput.value.trim() : '';
                Auth.handleDirectLogin(name, email);
            });
        }
        if (elements.authDirectForm) {
            elements.authDirectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = elements.directFormName ? elements.directFormName.value.trim() : '';
                const email = elements.directFormEmail ? elements.directFormEmail.value.trim() : '';
                Auth.handleDirectLogin(name, email);
            });
        }

        // Toggle Login Password Visibility
        if (elements.toggleLoginPassBtn && elements.loginPassword) {
            elements.toggleLoginPassBtn.addEventListener('click', () => {
                const isPass = elements.loginPassword.type === 'password';
                elements.loginPassword.type = isPass ? 'text' : 'password';
                if (elements.toggleLoginPassIcon) {
                    elements.toggleLoginPassIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
                    if (window.lucide) lucide.createIcons();
                }
            });
        }

        // Toggle Signup Password Visibility
        if (elements.toggleSignupPassBtn && elements.signupPassword) {
            elements.toggleSignupPassBtn.addEventListener('click', () => {
                const isPass = elements.signupPassword.type === 'password';
                elements.signupPassword.type = isPass ? 'text' : 'password';
                if (elements.toggleSignupPassIcon) {
                    elements.toggleSignupPassIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
                    if (window.lucide) lucide.createIcons();
                }
            });
        }

        // Real-Time Password Strength Meter
        if (elements.signupPassword) {
            elements.signupPassword.addEventListener('input', () => {
                Auth.updateStrengthUI(elements.signupPassword.value);
            });
        }

        // 1-Click Demo Account Quick Fill Button
        if (elements.btnDemoFill) {
            elements.btnDemoFill.addEventListener('click', () => {
                if (elements.loginEmail) elements.loginEmail.value = 'demo@shiviai.com';
                if (elements.loginPassword) elements.loginPassword.value = 'Shivi@2026!';
                Auth.login('demo@shiviai.com', 'Shivi@2026!', true);
            });
        }

        // Social Auth Buttons (Google & GitHub with prompt=select_account)
        if (elements.btnGoogleAuth) {
            elements.btnGoogleAuth.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                Auth.openAccountChooser('google');
            });
        }
        if (elements.btnGithubAuth) {
            elements.btnGithubAuth.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                Auth.openAccountChooser('github');
            });
        }

        // Account Chooser Modal Listeners
        if (elements.closeChooserModalBtn) {
            elements.closeChooserModalBtn.addEventListener('click', () => {
                Auth.closeAccountChooser();
            });
        }
        if (elements.btnCancelChooser) {
            elements.btnCancelChooser.addEventListener('click', () => {
                Auth.closeAccountChooser();
            });
        }
        if (elements.chooserCustomForm) {
            elements.chooserCustomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = elements.chooserFullName ? elements.chooserFullName.value.trim() : '';
                const identifier = elements.chooserAccountIdentifier ? elements.chooserAccountIdentifier.value.trim() : '';
                const provider = state.activeOAuthProvider || 'google';

                if (!name || !identifier) {
                    showToast('Please fill in both name and account identifier.', 'info');
                    return;
                }

                let email = identifier;
                let avatar = name.slice(0, 2).toUpperCase();

                if (provider === 'github') {
                    if (!identifier.includes('@')) {
                        email = `${identifier.toLowerCase()}@github.com`;
                        avatar = `https://github.com/${identifier}.png`;
                    }
                } else {
                    if (!identifier.includes('@')) {
                        email = `${identifier.toLowerCase()}@gmail.com`;
                    }
                }

                Auth.oauthLogin({
                    name: name,
                    email: email,
                    provider: provider,
                    avatar: avatar
                });
            });
        }

        // Login Form Submit
        if (elements.authLoginForm) {
            elements.authLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = elements.loginEmail ? elements.loginEmail.value.trim() : '';
                const password = elements.loginPassword ? elements.loginPassword.value : '';
                const rememberMe = elements.loginRememberMe ? elements.loginRememberMe.checked : true;

                if (!email || !password) {
                    Auth.showAlert('Please provide both your email address and password.', 'error');
                    return;
                }
                if (!email.includes('@') || !email.includes('.')) {
                    Auth.showAlert('Please enter a valid email address.', 'error');
                    return;
                }

                Auth.login(email, password, rememberMe);
            });
        }

        // Signup Form Submit
        if (elements.authSignupForm) {
            elements.authSignupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = elements.signupName ? elements.signupName.value.trim() : '';
                const email = elements.signupEmail ? elements.signupEmail.value.trim() : '';
                const password = elements.signupPassword ? elements.signupPassword.value : '';
                const confirmPassword = elements.signupConfirmPassword ? elements.signupConfirmPassword.value : '';
                const terms = elements.signupTermsAgree ? elements.signupTermsAgree.checked : false;

                if (!name || !email || !password) {
                    Auth.showAlert('Please fill in all required fields.', 'error');
                    return;
                }
                if (!email.includes('@') || !email.includes('.')) {
                    Auth.showAlert('Please enter a valid email address.', 'error');
                    return;
                }
                if (password.length < 8) {
                    Auth.showAlert('Password must contain at least 8 characters.', 'error');
                    return;
                }
                if (password !== confirmPassword) {
                    Auth.showAlert('Passwords do not match. Please re-enter.', 'error');
                    return;
                }
                if (!terms) {
                    Auth.showAlert('Please accept the ShiviAI Terms & Privacy Policy to proceed.', 'error');
                    return;
                }

                Auth.signup(name, email, password);
            });
        }

        // Forgot Password Form Submit
        if (elements.authForgotForm) {
            elements.authForgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = elements.forgotEmail ? elements.forgotEmail.value.trim() : '';
                if (!email || !email.includes('@')) {
                    Auth.showAlert('Please provide a valid email address.', 'error');
                    return;
                }
                Auth.forgotPassword(email);
            });
        }

        // User Profile Dropdown Pill & Popover Menu
        if (elements.userProfilePillBtn && elements.userProfileWrapper) {
            const toggleProfileMenu = (e) => {
                if (e) {
                    if (typeof e.preventDefault === 'function') e.preventDefault();
                    if (typeof e.stopPropagation === 'function') e.stopPropagation();
                }
                elements.userProfileWrapper.classList.toggle('open');
                playSound('click');
            };

            elements.userProfilePillBtn.addEventListener('click', toggleProfileMenu);
            elements.userProfilePillBtn.addEventListener('touchstart', (e) => {
                toggleProfileMenu(e);
            }, { passive: false });
        }

        document.addEventListener('click', (e) => {
            if (elements.userProfileWrapper && elements.userProfileWrapper.classList.contains('open')) {
                if (!elements.userProfileWrapper.contains(e.target)) {
                    elements.userProfileWrapper.classList.remove('open');
                }
            }
        });

        document.addEventListener('touchstart', (e) => {
            if (elements.userProfileWrapper && elements.userProfileWrapper.classList.contains('open')) {
                if (!elements.userProfileWrapper.contains(e.target)) {
                    elements.userProfileWrapper.classList.remove('open');
                }
            }
        }, { passive: true });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.userProfileWrapper && elements.userProfileWrapper.classList.contains('open')) {
                elements.userProfileWrapper.classList.remove('open');
            }
        });

        if (elements.popoverItemSettings) {
            elements.popoverItemSettings.addEventListener('click', () => {
                if (elements.userProfileWrapper) elements.userProfileWrapper.classList.remove('open');
                openSettings();
            });
        }

        if (elements.popoverItemBrain) {
            elements.popoverItemBrain.addEventListener('click', () => {
                if (elements.userProfileWrapper) elements.userProfileWrapper.classList.remove('open');
                openBrainModal();
            });
        }

        // Universal Logout / Sign In Handler
        function handleLogout(e) {
            if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
            }
            Auth.logout(e);
        }

        function handleLogoutOrLogin(e) {
            if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
            }
            const target = (e && (e.currentTarget || e.target)) || {};
            const isExplicitLogout = target.id === 'popoverItemLogout' ||
                target.id === 'sidebarLogoutBtn' ||
                target.id === 'settingsLogoutBtn' ||
                (target.classList && target.classList.contains('logout-action'));

            if (state.auth.isAuthenticated || isExplicitLogout) {
                handleLogout(e);
            } else {
                Auth.switchTab('login');
                if (elements.authModalOverlay) {
                    elements.authModalOverlay.classList.add('active');
                }
                if (elements.userProfileWrapper) {
                    elements.userProfileWrapper.classList.remove('open');
                }
                if (elements.settingsModal) {
                    elements.settingsModal.classList.remove('active');
                }
            }
        }

        // Global Window Exposure for seamless programmatic & dropdown access
        window.handleLogout = handleLogout;
        window.logout = handleLogout;
        window.handleLogoutOrLogin = handleLogoutOrLogin;

        const logoutTriggers = document.querySelectorAll('.logout-action, #popoverItemLogout, #sidebarLogoutBtn, #settingsLogoutBtn');
        logoutTriggers.forEach(btn => {
            btn.addEventListener('click', handleLogoutOrLogin);
        });

        // Event delegation for resilient click handling across the DOM
        document.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('#popoverItemLogout, .logout-action');
            if (logoutBtn) {
                handleLogout(e);
                return;
            }
            const themeBtn = e.target.closest('#themeMenuBtn, #sidebarThemeBtn');
            if (themeBtn) {
                openThemeModal();
            }
        });

        // Close auth modal when clicking background overlay (ONLY IF AUTHENTICATED)
        if (elements.authModalOverlay) {
            elements.authModalOverlay.addEventListener('click', (e) => {
                if (e.target === elements.authModalOverlay) {
                    if (state.auth && state.auth.isAuthenticated) {
                        elements.authModalOverlay.classList.remove('active');
                    }
                }
            });
        }
        if (elements.accountChooserModal) {
            elements.accountChooserModal.addEventListener('click', (e) => {
                if (e.target === elements.accountChooserModal) {
                    Auth.closeAccountChooser();
                }
            });
        }
    }

    // ==========================================
    // INITIALIZATION ENTRY POINT
    // ==========================================
    async function init() {
        try {
            // Mount event listeners first so UI is immediately responsive
            initEventListeners();
            handleInputChange();

            // Sync with Real-Time Voice Service
            if (window.voiceService) {
                window.voiceService.subscribe((vState) => {
                    updateSpeakingIndicatorUI(vState.isSpeaking, vState.currentlySpeakingMsgId);
                    updateVoiceIcon();
                });
            }

            // Restore user authentication session & saved application state
            await Auth.checkSession();
            if (state.auth && state.auth.isAuthenticated && state.auth.user) {
                await loadSavedState(state.auth.user);
            } else {
                state.sessions = [];
                state.currentSessionId = null;
                if (elements.messagesList) elements.messagesList.innerHTML = '';
                if (elements.historyList) elements.historyList.innerHTML = '';
                if (elements.welcomeHero) elements.welcomeHero.style.display = 'flex';
                await loadSavedState(null);
            }
        } catch (err) {
            console.error('ShiviAI initialization caught an error:', err);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
