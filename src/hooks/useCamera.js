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
    const prevImageDataRef = useRef(null);

    const captureFrame = useCallback(() => {
        if (!videoRef.current) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    // Get a tiny thumb map to calculate difference
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
        prevImageDataRef.current = null; // reset diff memory

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
                    // simple euclidian approximation
                    if (rDiff + gDiff + bDiff > 45) {
                        diffCount++;
                    }
                }
                const diffRatio = diffCount / totalPixels;
                // If less than 2% of the frame changed, don't trigger the API
                if (diffRatio < 0.02) {
                    isDifferent = false;
                }
            }

            if (isDifferent) {
                prevImageDataRef.current = currentData;
                const frame = captureFrame();
                if (frame) callback(frame);
            } else {
                console.log("Frame skipped -> Below difference threshold.");
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
        startContinuous,
        stopContinuous,
    };
}
