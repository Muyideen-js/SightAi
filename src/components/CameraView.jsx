import React from 'react';
import { FiCameraOff } from 'react-icons/fi';

export default function CameraView({ videoRef, stream, cameraOn, isAnalyzing }) {
  return (
    <div className="camera-view-container">
      {cameraOn && stream ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="cam-feed" 
        />
      ) : (
        <div className="cam-placeholder">
          <FiCameraOff size={36} />
          <span>{cameraOn ? 'Waking camera...' : 'Camera Paused'}</span>
        </div>
      )}

      {/* Futuristic Scan Overlay */}
      <div className={`scan-overlay ${isAnalyzing ? 'active' : ''}`}>
        <div className="scan-beam" />
        <div className="corner-bracket top-left" />
        <div className="corner-bracket top-right" />
        <div className="corner-bracket bottom-left" />
        <div className="corner-bracket bottom-right" />
      </div>
    </div>
  );
}
