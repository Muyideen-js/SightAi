import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraOn, setCameraOn] = useState(true);
    const [facingMode, setFacingMode] = useState('environment');
    const latestFrameRef = useRef(null);

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
    const prevImageDataRef = useRef(null);
    const frameLoopRef = useRef(null);

    // Capture a full-quality frame on demand
    const captureFrame = useCallback(() => {
        if (!videoRef.current || videoRef.current.videoWidth === 0) return null;
        const canvas = document.createElement('canvas');
        const targetWidth = 720;
        const scale = targetWidth / videoRef.current.videoWidth;
        canvas.width = targetWidth;
        canvas.height = videoRef.current.videoHeight * scale;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6);
    }, []);

    // Continuously update latestFrameRef so it's always ready
    useEffect(() => {
        let active = true;
        const updateFrame = () => {
            if (!active) return;
            if (videoRef.current && videoRef.current.videoWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = 480; // lightweight for background updates
                const scale = 480 / videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight * scale;
                canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                latestFrameRef.current = canvas.toDataURL('image/jpeg', 0.6);
            }
            frameLoopRef.current = setTimeout(updateFrame, 2000); // update every 2s
        };
        updateFrame();
        return () => {
            active = false;
            if (frameLoopRef.current) clearTimeout(frameLoopRef.current);
        };
    }, [stream]); // restart when stream changes

    // Grab the latest cached frame instantly (no canvas draw delay)
    const getLatestFrame = useCallback(() => {
        return latestFrameRef.current || captureFrame();
    }, [captureFrame]);

    // Get a tiny thumb for diff comparison
    const getDiffMap = useCallback(() => {
        if (!videoRef.current) return null;
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = 64;
        diffCanvas.height = 64;
        const ctx = diffCanvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 64, 64);
        return ctx.getImageData(0, 0, 64, 64).data;
    }, []);

    const startContinuous = useCallback((callback, intervalMs = 3000) => {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        setIsStreaming(true);
        prevImageDataRef.current = null;

        streamIntervalRef.current = setInterval(() => {
            const currentData = getDiffMap();
            if (!currentData) return;

            let isDifferent = true;

            if (prevImageDataRef.current) {
                let diffCount = 0;
                const totalPixels = currentData.length / 4;
                for (let i = 0; i < currentData.length; i += 4) {
                    const rDiff = Math.abs(currentData[i] - prevImageDataRef.current[i]);
                    const gDiff = Math.abs(currentData[i + 1] - prevImageDataRef.current[i + 1]);
                    const bDiff = Math.abs(currentData[i + 2] - prevImageDataRef.current[i + 2]);
                    if (rDiff + gDiff + bDiff > 45) diffCount++;
                }
                if (diffCount / totalPixels < 0.02) isDifferent = false;
            }

            if (isDifferent) {
                prevImageDataRef.current = currentData;
                const frame = captureFrame();
                if (frame) callback(frame);
            }
        }, intervalMs);
    }, [captureFrame, getDiffMap]);

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
        getLatestFrame,
        startContinuous,
        stopContinuous,
    };
}
