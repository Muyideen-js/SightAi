import React from 'react';
import { FiMic, FiMicOff, FiRefreshCw, FiVolume2, FiVolumeX } from 'react-icons/fi';

export default function ControlPanel({ 
  isRecording, 
  transcript, 
  handleMic, 
  flipCamera, 
  speakResponse, 
  responseActive 
}) {
  return (
    <div className="control-panel">
      {/* Live Transcript Display */}
      {(isRecording || transcript) && (
        <div className={`transcript-bubble ${transcript ? 'visible' : ''}`}>
          {transcript || 'Listening...'}
        </div>
      )}

      {/* Floating Pill Controls */}
      <div className="controls-pill">
        <button 
          className={`pill-btn ${responseActive ? 'active' : ''}`} 
          onClick={speakResponse}
          aria-label="Replay Audio"
        >
          {responseActive ? <FiVolume2 size={20} /> : <FiVolumeX size={20} />}
        </button>
        
        <button 
          className={`primary-mic-btn ${isRecording ? 'recording' : ''}`} 
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
