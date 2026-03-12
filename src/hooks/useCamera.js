import { useState, useRef, useCallback } from 'react';

export function useCamera() {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraOn, setCameraOn] = useState(true);
    const [facingMode, setFacingMode] = useState('environment');

    const startCamera = useCallback(async () => {
        stopCamera();
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false,
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setCameraOn(true);
        } catch (e) {
            console.error('Camera start failed:', e);
            setCameraOn(false);
        }
    }, [facingMode]);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            setStream(null);
            setCameraOn(false);
        }
    }, [stream]);

    const toggleCamera = () => {
        if (cameraOn) stopCamera();
        else startCamera();
    };

    const flipCamera = () => {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    };

    const [isStreaming, setIsStreaming] = useState(false);
    const streamIntervalRef = useRef(null);

    const captureFrame = useCallback(() => {
        if (!videoRef.current) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    const startContinuous = useCallback((callback, intervalMs = 3000) => {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        setIsStreaming(true);
        streamIntervalRef.current = setInterval(() => {
            const frame = captureFrame();
            if (frame) callback(frame);
        }, intervalMs);
    }, [captureFrame]);

    const stopContinuous = useCallback(() => {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        setIsStreaming(false);
    }, []);

    return {
        videoRef,
        stream,
        cameraOn,
        facingMode,
        isStreaming,
        startCamera,
        stopCamera,
        toggleCamera,
        flipCamera,
        captureFrame,
        startContinuous,
        stopContinuous,
    };
}
