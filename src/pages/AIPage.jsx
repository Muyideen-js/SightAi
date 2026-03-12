import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi';
import { useCamera } from '../hooks/useCamera';
import { useVoice } from '../hooks/useVoice';
import { VisionSession } from '../services/gemini';
import CameraView from '../components/CameraView';
import ControlPanel from '../components/ControlPanel';
import AIResponse from '../components/AIResponse';
import VisionTimeline from '../components/VisionTimeline';
import { useVisionMemory } from '../hooks/useVisionMemory';
import { FiList } from 'react-icons/fi';

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

  const {
    visionMemory, objectMemory, currentScene, addFrameData, getMemoryContextString
  } = useVisionMemory();

  const [response, setResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false); // Toggle for auto mode
  const [showTimeline, setShowTimeline] = useState(false);

  const hasSuggestedRef = React.useRef(false);

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
      startContinuous(async (frameBase64) => {
        if (!isAnalyzing && !isRecording && session) {
           try {
               const jsonResult = await session.analyzeFrameSilent(frameBase64);
               if (jsonResult) {
                   addFrameData(jsonResult, "Auto-captured frame");
                   
                   // Smart Cooking Assistant / Auto Explain
                   if (jsonResult.food_items && jsonResult.food_items.length >= 2 && !hasSuggestedRef.current) {
                       hasSuggestedRef.current = true;
                       const ingredients = jsonResult.food_items.slice(0,3).join(', ');
                       const msg = `I see ingredients like ${ingredients}. Ask me for a recipe if you'd like to cook!`;
                       if (!response) {
                           setResponse(msg);
                           speak(msg);
                       }
                   }
               }
           } catch(e) { console.error("JSON parse failed in background", e); }
        }
      }, 4000); // 4 sec interval
    } else {
      stopContinuous();
    }
  }, [continuousMode, isAnalyzing, isRecording, addFrameData, response, speak]);

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
      const memoryContext = getMemoryContextString();
      const reply = await session.askWithMemory(frameBase64, query, memoryContext);
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

        <div style={{display: 'flex', gap: '8px'}}>
          <button 
            className={`tb-btn ${showTimeline ? 'active' : ''}`} 
            onClick={() => setShowTimeline(!showTimeline)}
            aria-label="Toggle Memory Timeline"
            title="AI Memory Vision Timeline"
          >
            <FiList size={18} />
          </button>
          <button 
            className={`tb-btn ${continuousMode ? 'active' : ''}`} 
            onClick={() => setContinuousMode(!continuousMode)}
            aria-label="Toggle Auto-Stream"
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

      <AIResponse response={response} />

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
        handleMic={handleMic}
        flipCamera={flipCamera}
        speakResponse={() => speak(response)}
        responseActive={!!response}
      />
    </div>
  );
}
