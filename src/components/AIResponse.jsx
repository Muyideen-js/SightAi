import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIResponse({ response }) {
  if (!response) return null;

  return (
    <div className="ai-response-overlay">
      <div className="ai-response-glasscard">
        <div className="ai-glow-accent" />
        <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-light">
          {response}
        </ReactMarkdown>
      </div>
    </div>
  );
}
