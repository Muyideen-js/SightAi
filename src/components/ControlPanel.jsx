import React from 'react';
import { FiMic, FiMicOff, FiRefreshCw, FiVolume2, FiVolumeX } from 'react-icons/fi';

export default function ControlPanel({ 
  isRecording, 
  transcript,
  handleMic,
  flipCamera,
  speakResponse,
  responseActive,
  statusType,
  conversationActive
}) {
  // Map statusType to mic button CSS class
  const micStateClass = statusType === 'listening' ? 'listening' 
    : statusType === 'analyzing' ? 'thinking' 
    : statusType === 'speaking' ? 'speaking' 
    : conversationActive ? 'listening-paused' // if mic just blinked
    : '';

  return (
    <div className="control-panel">
      {(isRecording || transcript) && (
        <div className={`transcript-bubble ${transcript ? 'visible' : ''}`}>
          {transcript || 'Listening...'}
        </div>
      )}

      <div className="controls-pill">
        <button 
          className={`pill-btn ${responseActive ? 'active' : ''}`} 
          onClick={speakResponse}
          aria-label="Replay Audio"
        >
          {responseActive ? <FiVolume2 size={20} /> : <FiVolumeX size={20} />}
        </button>
        
        <button 
          className={`primary-mic-btn ${micStateClass}`} 
          onClick={handleMic}
          aria-label={isRecording ? "Stop Recording" : "Start Recording"}
        >
          {isRecording ? <FiMicOff size={24} /> : <FiMic size={24} />}
          {isRecording && <div className="mic-pulse-ring" />}
        </button>
        
        <button 
          className="pill-btn" 
          onClick={flipCamera}
          aria-label="Flip Camera"
        >
          <FiRefreshCw size={20} />
        </button>
      </div>
    </div>
  );
}
