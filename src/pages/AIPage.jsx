import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi';
import { useCamera } from '../hooks/useCamera';
import { useVoice } from '../hooks/useVoice';
import { VisionSession } from '../services/gemini';
import CameraView from '../components/CameraView';
import ControlPanel from '../components/ControlPanel';
import AIResponse from '../components/AIResponse';

let session; // persist across renders for this page lifetime

export default function AIPage() {
  const navigate = useNavigate();
  
  const {
    videoRef, stream, cameraOn, flipCamera, captureFrame,
    startCamera, stopCamera, startContinuous, stopContinuous, isStreaming
  } = useCamera();

  const {
    isRecording, transcript, startListening, stopListening, speak, stopSpeaking
  } = useVoice();

  const [response, setResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false); // Toggle for auto mode

  // Initialize Session
  useEffect(() => {
    session = new VisionSession();
    startCamera();
    return () => {
      stopCamera();
      stopListening();
      if (session) session.clearMemory();
    };
  }, []);

  // Continuous Auto-Mode logic
  useEffect(() => {
    if (continuousMode) {
      startContinuous((frameBase64) => {
        if (!isAnalyzing && !isRecording) {
           processQuery(frameBase64, "Analyze this frame and tell me if anything changed.");
        }
      }, 5000); // 5 sec interval for memory
    } else {
      stopContinuous();
    }
  }, [continuousMode, isAnalyzing, isRecording]);

  const handleMic = () => {
    if (isRecording) {
      stopListening();
      // On stop, process immediately
      setTimeout(() => {
        const frame = captureFrame();
        processQuery(frame, transcript);
      }, 300);
    } else {
      setResponse('');
      stopSpeaking();
      startListening();
    }
  };

  const processQuery = async (frameBase64, textQuery) => {
    if (!frameBase64) return;
    setIsAnalyzing(true);
    try {
      const query = textQuery?.trim() || "What do you see in this image? Explain clearly.";
      const reply = await session.ask(frameBase64, query);
      setResponse(reply);
      speak(reply);
    } catch (e) {
      console.error(e);
      setResponse("I couldn't process that frame. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusType = isRecording ? 'listening' : isAnalyzing ? 'analyzing' : 'ready';

  return (
    <div className="ai-page">
      {/* Top Navigation Bar */}
      <div className="ai-topbar">
        <button className="tb-btn" onClick={() => navigate('/')}>
          <FiArrowLeft size={18} />
        </button>
        
        <div className="tb-center">
          <div className="css-lens" style={{ transform: 'scale(0.5)' }} />
          <span className="tb-logo">SightAI</span>
          <span className={`tb-status ${statusType}`}>
            <span className="tb-dot" />
            {statusType}
          </span>
        </div>

        <button 
          className={`tb-btn ${continuousMode ? 'active' : ''}`} 
          onClick={() => setContinuousMode(!continuousMode)}
          aria-label="Toggle Auto-Stream"
          style={{ color: continuousMode ? 'var(--primary)' : 'inherit' }}
        >
          <FiMoreHorizontal size={18} />
        </button>
      </div>

      <AIResponse response={response} />

      <CameraView 
        videoRef={videoRef}
        stream={stream}
        cameraOn={cameraOn}
        isAnalyzing={isAnalyzing}
      />

      <ControlPanel 
        isRecording={isRecording}
        transcript={transcript}
        handleMic={handleMic}
        flipCamera={flipCamera}
        speakResponse={() => speak(response)}
        responseActive={!!response}
      />
    </div>
  );
}
