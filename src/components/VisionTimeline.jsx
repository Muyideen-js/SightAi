import React from 'react';
import { FiClock, FiX } from 'react-icons/fi';

export default function VisionTimeline({ isOpen, onClose, visionMemory, objectMemory, currentScene }) {
  if (!isOpen) return null;

  return (
    <div className="timeline-overlay">
      <div className="timeline-panel">
        <div className="timeline-header">
          <h3><FiClock /> AI Memory Timeline</h3>
          <button className="tb-btn" onClick={onClose}><FiX size={18} /></button>
        </div>
        
        <div className="timeline-content">
          <div className="memory-section">
            <h4>Current Context</h4>
            <div className="scene-card">
              Scene: <strong>{currentScene || 'Unknown Environment'}</strong>
            </div>
          </div>

          <div className="memory-section">
            <h4>Tracked Objects (Persistent)</h4>
            <div className="tags-container">
              {Object.keys(objectMemory).map(obj => (
                <span key={obj} className="tag object-tag">
                  {obj} <span className="tag-count">x{objectMemory[obj].count}</span>
                </span>
              ))}
              {Object.keys(objectMemory).length === 0 && <span className="tag-empty">No objects tracked yet.</span>}
            </div>
          </div>

          <div className="memory-section">
            <h4>Recent Frames</h4>
            <div className="frames-list">
              {visionMemory.slice().reverse().map((frame, i) => (
                <div key={i} className="frame-card">
                  <div className="frame-header">
                    <span className="frame-time">{new Date(frame.timestamp).toLocaleTimeString()}</span>
                    {frame.scene_description && <span className="frame-scene">{frame.scene_description}</span>}
                  </div>
                  <div className="tags-container">
                    {(frame.objects || []).map(o => <span key={`obj-${o}`} className="tag">{o}</span>)}
                    {(frame.food_items || []).map(o => <span key={`food-${o}`} className="tag food">{o}</span>)}
                    {(frame.tools || []).map(o => <span key={`tool-${o}`} className="tag tool">{o}</span>)}
                  </div>
                </div>
              ))}
              {visionMemory.length === 0 && <span className="tag-empty">No frames in memory. Enable vision streaming!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
