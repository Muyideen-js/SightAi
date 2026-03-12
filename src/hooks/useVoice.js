import { useState, useRef, useEffect, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice() {
    const recognitionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [conversationActive, setConversationActive] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Refs that hold latest values for use inside closures
    const finalTranscriptRef = useRef('');
    const conversationActiveRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const onSpeechDoneRef = useRef(null); // callback set by consumer
    const silenceTimerRef = useRef(null);

    // Sync refs
    useEffect(() => { conversationActiveRef.current = conversationActive; }, [conversationActive]);
    useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

    // Kill speech on page unload/unmount
    useEffect(() => {
        const kill = () => window.speechSynthesis?.cancel();
        window.addEventListener('beforeunload', kill);
        return () => { window.removeEventListener('beforeunload', kill); kill(); };
    }, []);

    // Create SpeechRecognition ONCE and never tear it down
    useEffect(() => {
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        let lastSpeechTime = 0;

        rec.onresult = (e) => {
            let text = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                text += e.results[i][0].transcript;
            }
            finalTranscriptRef.current = text;
            setTranscript(text);
            lastSpeechTime = Date.now();

            // Reset silence timer on every new word
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // Start a silence timer: if no new words for 1.5s, consider speech done
            silenceTimerRef.current = setTimeout(() => {
                const spokenText = finalTranscriptRef.current.trim();
                if (spokenText && onSpeechDoneRef.current) {
                    onSpeechDoneRef.current(spokenText);
                    finalTranscriptRef.current = '';
                    setTranscript('');

                    // Stop recognition while AI processes, it will restart after speaking
                    try { rec.stop(); } catch (e) { }
                    setIsRecording(false);
                }
            }, 1500);
        };

        rec.onerror = (e) => {
            if (e.error === 'no-speech' || e.error === 'aborted') return;
            console.warn('SpeechRecognition error:', e.error);
            setIsRecording(false);
        };

        rec.onend = () => {
            setIsRecording(false);
            // If conversation is still active and AI is not speaking, restart mic
            if (conversationActiveRef.current && !isSpeakingRef.current) {
                setTimeout(() => {
                    if (conversationActiveRef.current && !isSpeakingRef.current) {
                        try {
                            rec.start();
                            setIsRecording(true);
                        } catch (e) { }
                    }
                }, 400);
            }
        };

        recognitionRef.current = rec;
        return () => { try { rec.stop(); } catch (e) { } };
    }, []); // Empty deps = created ONCE, never torn down

    // Auto-restart mic when AI finishes speaking
    useEffect(() => {
        if (conversationActive && !isSpeaking && !isRecording) {
            const timer = setTimeout(() => {
                try {
                    if (recognitionRef.current && conversationActiveRef.current && !isSpeakingRef.current) {
                        finalTranscriptRef.current = '';
                        setTranscript('');
                        recognitionRef.current.start();
                        setIsRecording(true);
                    }
                } catch (e) { }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [conversationActive, isSpeaking, isRecording]);

    // Allows the consumer (AIPage) to set the callback without causing re-renders
    const setOnSpeechDone = useCallback((fn) => {
        onSpeechDoneRef.current = fn;
    }, []);

    const toggleConversation = useCallback(() => {
        setConversationActive(prev => {
            const next = !prev;
            if (next) {
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
                finalTranscriptRef.current = '';
                setTranscript('');
                try {
                    recognitionRef.current?.start();
                    setIsRecording(true);
                } catch (e) { }
            } else {
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                try { recognitionRef.current?.stop(); } catch (e) { }
                setIsRecording(false);
            }
            return next;
        });
    }, []);

    const speak = useCallback((text, onDone) => {
        if (!('speechSynthesis' in window) || !text) return;
        window.speechSynthesis.cancel();

        setIsSpeaking(true);
        const cleanText = text.replace(/[*_#`]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const goodVoice = voices.find(v =>
            v.name.includes('Google') || v.name.includes('Samantha') || v.lang === 'en-US'
        );
        if (goodVoice) utterance.voice = goodVoice;

        utterance.onend = () => {
            setIsSpeaking(false);
            if (onDone) onDone();
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            if (onDone) onDone();
        };

        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        isRecording,
        transcript,
        conversationActive,
        isSpeaking,
        toggleConversation,
        setOnSpeechDone,
        speak,
        stopSpeaking,
    };
}
