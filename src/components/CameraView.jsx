import React from 'react';
import { FiCameraOff } from 'react-icons/fi';

export default function CameraView({ videoRef, stream, cameraOn, isAnalyzing, latestMemory, activePointerBox }) {
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
      {latestMemory && !activePointerBox && (
        <div className="live-tags-overlay">
          {(latestMemory.objects || []).slice(0, 3).map((obj, i) => (
             <div key={`obj-${i}-${obj}`} className="live-tag obj" style={{ top: `${20 + (i*15)}%`, left: `${10 + (i*10)}%` }}>{obj}</div>
          ))}
          {(latestMemory.food_items || []).slice(0, 3).map((food, i) => (
             <div key={`food-${i}-${food}`} className="live-tag food" style={{ top: `${35 + (i*20)}%`, right: `${15 + (i*8)}%` }}>{food}</div>
          ))}
        </div>
      )}

      {/* AI Active Pointer Overlay */}
      {activePointerBox && (
        <div 
          className="ai-pointer-box"
          style={{
            position: 'absolute',
            top: `${activePointerBox.ymin}%`,
            left: `${activePointerBox.xmin}%`,
            width: `${activePointerBox.xmax - activePointerBox.xmin}%`,
            height: `${activePointerBox.ymax - activePointerBox.ymin}%`,
            border: '3px solid var(--primary)',
            boxShadow: '0 0 15px var(--primary-glow), inset 0 0 15px var(--primary-glow)',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 30,
            transition: 'all 0.3s ease-out',
            animation: 'pulseBox 2s infinite'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--primary)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            AI Target
          </div>
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
