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
    videoRef, stream, cameraOn, flipCamera, captureFrame, getLatestFrame,
    startCamera, stopCamera, startContinuous, stopContinuous, isStreaming
  } = useCamera();

  const {
    isRecording, transcript, conversationActive, isSpeaking,
    toggleConversation, setOnSpeechDone, speak, stopSpeaking
  } = useVoice();

  const {
    visionMemory, objectMemory, currentScene, addFrameData, getMemoryContextString
  } = useVisionMemory();

  const [response, setResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const hasSuggestedRef = useRef(false);

  // Process a voice query
  const processQuery = useCallback(async (frameBase64, textQuery) => {
    if (!frameBase64 || !session) return;
    setIsAnalyzing(true);
    try {
      const query = textQuery?.trim() || "What do you see? Be brief and limit to one sentence.";
      const memoryContext = getMemoryContextString();
      const reply = await session.askWithMemory(frameBase64, query, memoryContext);
      setResponse(reply);
      speak(reply);
    } catch (e) {
      console.error(e);
      setResponse("I couldn't process that. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [getMemoryContextString, speak]);

  // Wire voice callback: when user stops speaking, grab latest frame instantly
  useEffect(() => {
    setOnSpeechDone((finalText) => {
      // Grab the pre-cached frame instantly (no canvas draw delay)
      const frame = getLatestFrame();
      if (frame) {
        processQuery(frame, finalText);
      }
    });
  }, [setOnSpeechDone, getLatestFrame, processQuery]);

  // Init session and camera
  useEffect(() => {
    session = new VisionSession();
    startCamera();
    return () => {
      stopCamera();
      window.speechSynthesis?.cancel();
      if (session) session.clearMemory();
    };
  }, []);

  // Background continuous vision mode
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
                const msg = `I see ingredients like ${ingredients}. Ask me for a recipe!`;
                if (!response) {
                  setResponse(msg);
                  speak(msg);
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

  // Mic button toggles conversation mode
  const handleMicToggle = () => {
    if (conversationActive) setResponse('');
    toggleConversation();
  };

  // Quick action from response card
  const handleQuickAction = (query) => {
    const frame = getLatestFrame();
    if (frame) processQuery(frame, query);
  };

  // Swipe gestures
  const touchRef = useRef(null);
  const handleTouchStart = (e) => { touchRef.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchRef.current === null) return;
    const diff = touchRef.current - e.changedTouches[0].clientY;
    if (diff > 60) setShowTimeline(true);
    if (diff < -60) { setShowTimeline(false); if (response) setResponse(''); }
    touchRef.current = null;
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
