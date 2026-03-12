import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIResponse({ response }) {
  if (!response) return null;

  return (
    <div className="ai-response-overlay">
      <div className="ai-response-glasscard">
        <div className="ai-glow-accent" />
        <div className="markdown-light">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {response}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
