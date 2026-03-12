import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMoreHorizontal, FiList } from 'react-icons/fi';
import { useCamera } from '../hooks/useCamera';
import { useVoice } from '../hooks/useVoice';
import { VisionSession } from '../services/gemini';
import CameraView from '../components/CameraView';
import ControlPanel from '../components/ControlPanel';
import AIResponse from '../components/AIResponse';
import VisionTimeline from '../components/VisionTimeline';
import { useVisionMemory } from '../hooks/useVisionMemory';

let session;

export default function AIPage() {
  const navigate = useNavigate();

  const {
    videoRef, stream, cameraOn, flipCamera, captureFrame,
    startCamera, stopCamera, startContinuous, stopContinuous, isStreaming
  } = useCamera();

  // State
  const [response, setResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const hasSuggestedRef = useRef(false);

  // Process a voice query: capture frame + send to Gemini + speak reply
  const processQuery = useCallback(async (frameBase64, textQuery) => {
    if (!frameBase64 || !session) return;
    setIsAnalyzing(true);
    try {
      const query = textQuery?.trim() || "What do you see in this image? Explain clearly.";
      const memoryContext = getMemoryContextRef.current();
      const reply = await session.askWithMemory(frameBase64, query, memoryContext);
      setResponse(reply);
      setIsSpeaking(true);
      speakRef.current(reply, () => setIsSpeaking(false));
    } catch (e) {
      console.error(e);
      setResponse("I couldn't process that. Try again.");
      setIsSpeaking(false);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Callback for when user stops talking
  const handleSpeechEnd = useCallback((finalText) => {
    const frame = captureFrame();
    if (frame) processQuery(frame, finalText);
  }, [captureFrame, processQuery]);

  // Voice hook
  const {
    isRecording, transcript, conversationActive, toggleConversation, speak, stopSpeaking
  } = useVoice(handleSpeechEnd, isSpeaking);

  // Store speak in a ref so processQuery always uses the latest version
  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  // Vision Memory
  const {
    visionMemory, objectMemory, currentScene, addFrameData, getMemoryContextString
  } = useVisionMemory();

  // Store getMemoryContextString in a ref for processQuery
  const getMemoryContextRef = useRef(getMemoryContextString);
  useEffect(() => { getMemoryContextRef.current = getMemoryContextString; }, [getMemoryContextString]);

  // Init
  useEffect(() => {
    session = new VisionSession();
    startCamera();
    return () => {
      stopCamera();
      window.speechSynthesis?.cancel();
      if (session) session.clearMemory();
    };
  }, []);

  // Background continuous vision mode (separate from voice)
  useEffect(() => {
    if (continuousMode) {
      startContinuous(async (frameBase64) => {
        if (!isAnalyzing && !isRecording && session) {
          try {
            const jsonResult = await session.analyzeFrameSilent(frameBase64);
            if (jsonResult) {
              addFrameData(jsonResult, "Auto-captured frame");
              if (jsonResult.food_items?.length >= 2 && !hasSuggestedRef.current) {
                hasSuggestedRef.current = true;
                const ingredients = jsonResult.food_items.slice(0, 3).join(', ');
                const msg = `I see ingredients like ${ingredients}. Ask me for a recipe if you'd like to cook!`;
                if (!response) {
                  setResponse(msg);
                  setIsSpeaking(true);
                  speak(msg, () => setIsSpeaking(false));
                }
              }
            }
          } catch (e) { console.error("Background analysis error", e); }
        }
      }, 4000);
    } else {
      stopContinuous();
    }
  }, [continuousMode, isAnalyzing, isRecording, addFrameData, response, speak]);

  // Mic button toggles conversation mode ON/OFF
  const handleMicToggle = () => {
    if (conversationActive) setResponse('');
    toggleConversation();
  };

  // Quick action from response card
  const handleQuickAction = (query) => {
    const frame = captureFrame();
    if (frame) processQuery(frame, query);
  };

  // Swipe gestures
  const handleTouchStart = (e) => { e.target._touchStartY = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (!e.target._touchStartY) return;
    const diff = e.target._touchStartY - e.changedTouches[0].clientY;
    if (diff > 60) setShowTimeline(true);
    if (diff < -60) { setShowTimeline(false); if (response) setResponse(''); }
  };

  // Voice state machine
  const statusType =
    isAnalyzing ? 'analyzing'
    : isSpeaking ? 'speaking'
    : (conversationActive || isRecording) ? 'listening'
    : 'ready';

  return (
    <div className="ai-page" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`tb-btn ${showTimeline ? 'active' : ''}`}
            onClick={() => setShowTimeline(!showTimeline)}
            title="AI Memory Timeline"
          >
            <FiList size={18} />
          </button>
          <button
            className={`tb-btn ${continuousMode ? 'active' : ''}`}
            onClick={() => setContinuousMode(!continuousMode)}
            title="Continuous Vision Mode"
            style={{ color: continuousMode ? 'var(--primary)' : 'inherit' }}
          >
            <FiMoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <VisionTimeline
        isOpen={showTimeline}
        onClose={() => setShowTimeline(false)}
        visionMemory={visionMemory}
        objectMemory={objectMemory}
        currentScene={currentScene}
      />

      <AIResponse response={response} onQuickAction={handleQuickAction} />

      <CameraView
        videoRef={videoRef}
        stream={stream}
        cameraOn={cameraOn}
        isAnalyzing={isAnalyzing}
        latestMemory={visionMemory[visionMemory.length - 1]}
      />

      <ControlPanel
        isRecording={isRecording}
        transcript={transcript}
        handleMic={handleMicToggle}
        conversationActive={conversationActive}
        flipCamera={flipCamera}
        speakResponse={() => speak(response)}
        responseActive={!!response}
        statusType={statusType}
      />
    </div>
  );
}
