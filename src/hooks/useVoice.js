import { useState, useRef, useEffect, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice() {
    const recognitionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');

    useEffect(() => {
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (e) => {
            let text = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                text += e.results[i][0].transcript;
            }
            // Overwrite the interim transcript to reflect live results
            setTranscript(text);
        };

        rec.onerror = (e) => {
            if (e.error !== 'no-speech') {
                setIsRecording(false);
            }
        };

        rec.onend = () => {
            // Auto-restart if we think we should still be active
            if (recognitionRef.current?._active) {
                try {
                    rec.start();
                } catch (e) {
                    // Sometimes it fails to start immediately
                }
            } else {
                setIsRecording(false);
            }
        };

        recognitionRef.current = rec;
        return () => {
            try {
                rec.stop();
            } catch (e) { }
        };
    }, []);

    const startListening = useCallback(() => {
        setTranscript('');
        setIsRecording(true);
        if (recognitionRef.current) {
            recognitionRef.current._active = true;
            try {
                recognitionRef.current.start();
            } catch (e) { }
        }
    }, []);

    const stopListening = useCallback(() => {
        setIsRecording(false);
        if (recognitionRef.current) {
            recognitionRef.current._active = false;
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }
    }, []);

    const toggleListening = () => {
        if (isRecording) stopListening();
        else startListening();
    };

    const speak = useCallback((text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        // Strip rough markdown characters before voice synthesis
        const cleanText = text.replace(/[*_#`]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05; // Slightly faster for natural feel
        utterance.pitch = 1;

        // Attempt to pick a good natural voice if available
        const voices = window.speechSynthesis.getVoices();
        const goodVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.lang === 'en-US');
        if (goodVoice) utterance.voice = goodVoice;

        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    return {
        isRecording,
        transcript,
        setTranscript,
        startListening,
        stopListening,
        toggleListening,
        speak,
        stopSpeaking,
    };
}
