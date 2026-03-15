import React from 'react';
import { FiCameraOff } from 'react-icons/fi';

export default function CameraView({ videoRef, stream, cameraOn, isAnalyzing, latestMemory }) {
  return (
    <div className="camera-view-container">
      {cameraOn && stream ? (
        <video 
          ref={(el) => {
            if (videoRef) videoRef.current = el;
            if (el && stream && el.srcObject !== stream) {
              el.srcObject = stream;
              el.onloadedmetadata = () => {
                el.play().catch(e => console.error("Mobile play error:", e));
              };
            }
          }}
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

      {/* Cinematic Vignette Overlay */}
      <div className="camera-vignette" />

      {/* Live Object Highlighting Overlays */}
      {latestMemory && (
        <div className="live-tags-overlay">
          {(latestMemory.objects || []).slice(0, 3).map((obj, i) => (
             <div key={`obj-${i}-${obj}`} className="live-tag obj" style={{ top: `${20 + (i*15)}%`, left: `${10 + (i*10)}%` }}>{obj}</div>
          ))}
          {(latestMemory.food_items || []).slice(0, 3).map((food, i) => (
             <div key={`food-${i}-${food}`} className="live-tag food" style={{ top: `${35 + (i*20)}%`, right: `${15 + (i*8)}%` }}>{food}</div>
          ))}
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
