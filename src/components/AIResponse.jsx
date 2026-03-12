import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiMaximize2, FiList, FiCoffee } from 'react-icons/fi';

export default function AIResponse({ response, onQuickAction }) {
  const [displayedText, setDisplayedText] = useState('');

  // Typing animation effect
  useEffect(() => {
    if (!response) {
      setDisplayedText('');
      return;
    }

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      setDisplayedText(response.slice(0, currentIndex + 1));
      currentIndex++;
      if (currentIndex >= response.length) {
        clearInterval(typingInterval);
      }
    }, 15); // Adjust typing speed here (ms per character)

    return () => clearInterval(typingInterval);
  }, [response]);

  if (!response) return null;

  return (
    <div className="ai-response-overlay">
      <div className="ai-response-glasscard v4-vision-card">
        <div className="ai-glow-accent" />
        <div className="markdown-light typewriter-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayedText}
          </ReactMarkdown>
        </div>

        {/* Quick Action Pills */}
        {displayedText.length === response.length && (
          <div className="quick-actions-row">
             <button onClick={() => onQuickAction("Explain more in depth")} className="action-pill">
                <FiMaximize2 size={14} /> Explain 
             </button>
             <button onClick={() => onQuickAction("Give me a step-by-step guide")} className="action-pill">
                <FiList size={14} /> Step-by-step
             </button>
             <button onClick={() => onQuickAction("Suggest some recipes based on this")} className="action-pill">
                <FiCoffee size={14} /> Recipes
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
