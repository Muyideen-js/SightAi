import { useState, useRef, useEffect, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice(onSpeechFinished, isSpeaking) {
    const recognitionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [conversationActive, setConversationActive] = useState(false);
    const finalTranscriptRef = useRef('');
    const conversationActiveRef = useRef(false);
    const isSpeakingRef = useRef(false);

    // Keep refs in sync with state/props so closures always see latest values
    useEffect(() => { conversationActiveRef.current = conversationActive; }, [conversationActive]);
    useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

    // Kill speech synthesis on page unload or component unmount
    useEffect(() => {
        const kill = () => window.speechSynthesis?.cancel();
        window.addEventListener('beforeunload', kill);
        return () => {
            window.removeEventListener('beforeunload', kill);
            kill();
        };
    }, []);

    // Auto-restart mic when AI finishes speaking (isSpeaking flips false)
    useEffect(() => {
        if (conversationActive && !isSpeaking && !isRecording) {
            const timer = setTimeout(() => {
                try {
                    if (recognitionRef.current) {
                        setTranscript('');
                        finalTranscriptRef.current = '';
                        setIsRecording(true);
                        recognitionRef.current.start();
                    }
                } catch (e) { }
            }, 300); // small delay to let browser settle
            return () => clearTimeout(timer);
        }
    }, [conversationActive, isSpeaking, isRecording]);

    // Setup SpeechRecognition instance once
    useEffect(() => {
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.continuous = false; // let it auto-stop on silence
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (e) => {
            let text = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                text += e.results[i][0].transcript;
            }
            finalTranscriptRef.current = text;
            setTranscript(text);
        };

        rec.onerror = (e) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                console.warn('SpeechRecognition error:', e.error);
                setIsRecording(false);
            }
        };

        rec.onend = () => {
            setIsRecording(false);
            const spokenText = finalTranscriptRef.current.trim();

            if (spokenText && onSpeechFinished) {
                // User said something -> fire the callback
                onSpeechFinished(spokenText);
                finalTranscriptRef.current = '';
                setTranscript('');
            } else if (conversationActiveRef.current && !isSpeakingRef.current) {
                // Silence hiccup, conversation is on, loop mic back
                try {
                    finalTranscriptRef.current = '';
                    setTranscript('');
                    setIsRecording(true);
                    rec.start();
                } catch (e) { }
            }
        };

        recognitionRef.current = rec;
        return () => { try { rec.stop(); } catch (e) { } };
    }, [onSpeechFinished]);

    const startListening = useCallback(() => {
        window.speechSynthesis?.cancel(); // interrupt AI if speaking
        setTranscript('');
        finalTranscriptRef.current = '';
        setIsRecording(true);
        try { recognitionRef.current?.start(); } catch (e) { }
    }, []);

    const stopListening = useCallback(() => {
        setIsRecording(false);
        try { recognitionRef.current?.stop(); } catch (e) { }
    }, []);

    const toggleConversation = useCallback(() => {
        setConversationActive(prev => {
            const next = !prev;
            if (next) {
                // Turning ON conversation mode
                window.speechSynthesis?.cancel();
                setTranscript('');
                finalTranscriptRef.current = '';
                setIsRecording(true);
                try { recognitionRef.current?.start(); } catch (e) { }
            } else {
                // Turning OFF conversation mode
                setIsRecording(false);
                window.speechSynthesis?.cancel();
                try { recognitionRef.current?.stop(); } catch (e) { }
            }
            return next;
        });
    }, []);

    // speak() now accepts an onDone callback for precise timing
    const speak = useCallback((text, onDone) => {
        if (!('speechSynthesis' in window) || !text) return;
        window.speechSynthesis.cancel();

        const cleanText = text.replace(/[*_#`]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const goodVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.lang === 'en-US');
        if (goodVoice) utterance.voice = goodVoice;

        utterance.onend = () => { if (onDone) onDone(); };
        utterance.onerror = () => { if (onDone) onDone(); };

        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
    }, []);

    return {
        isRecording,
        transcript,
        conversationActive,
        toggleConversation,
        speak,
        stopSpeaking,
    };
}
