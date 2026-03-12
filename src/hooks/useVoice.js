import { useState, useRef, useEffect, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice(onSpeechFinished) {
    const recognitionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const finalTranscriptRef = useRef('');

    // Global cleanup for speech synthesis (prevents overlap on hot reloads or hard refreshes)
    useEffect(() => {
        const handleUnmountOrUnload = () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };

        window.addEventListener('beforeunload', handleUnmountOrUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnmountOrUnload);
            handleUnmountOrUnload(); // cancel on unmount too
        };
    }, []);

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
            finalTranscriptRef.current = text;
            setTranscript(text);
        };

        rec.onerror = (e) => {
            if (e.error !== 'no-speech') {
                setIsRecording(false);
            }
        };

        rec.onend = () => {
            // Speech recognition has ended (either user stopped talking or manual stop)
            setIsRecording(false);

            // Auto Trigger the AI action if we have recorded something!
            if (finalTranscriptRef.current.trim() && onSpeechFinished) {
                const textToSend = finalTranscriptRef.current.trim();
                onSpeechFinished(textToSend);
                finalTranscriptRef.current = '';
                setTranscript('');
            }

            // Note: intentionally not forcing auto-restart loop here to allow the conversational model to think.
        };

        recognitionRef.current = rec;
        return () => {
            try {
                rec.stop();
            } catch (e) { }
        };
    }, [onSpeechFinished]);

    const startListening = useCallback(() => {
        // Cancel AI currently speaking if user interrupts
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        setTranscript('');
        finalTranscriptRef.current = '';
        setIsRecording(true);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) { }
        }
    }, []);

    const stopListening = useCallback(() => {
        setIsRecording(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop(); // This will artificially trigger onend
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
