import { useNavigate } from 'react-router-dom';
import { FiCamera, FiMic, FiZap, FiArrowRight } from 'react-icons/fi';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-bg">
        <div className="orb orb-1" />
      </div>

      <div className="landing-content">
        <h1>
          <div className="css-lens" />
          SightAI
        </h1>
        <p className="tagline">Vision meets voice</p>
        <p className="desc">
          Point your camera at anything, ask a question, and get instant, intelligent spoken answers.
        </p>

        <div className="features">
          <div className="feature-chip">
            <FiCamera size={14} /> See
          </div>
          <div className="feature-chip">
            <FiMic size={14} /> Ask
          </div>
          <div className="feature-chip">
            <FiZap size={14} /> Know
          </div>
        </div>

        <button className="cta-btn" onClick={() => navigate('/ai')}>
          Start Seeing <FiArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
