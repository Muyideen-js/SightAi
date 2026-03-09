import { useNavigate } from 'react-router-dom'
import { FiZap, FiCamera, FiMic, FiArrowRight } from 'react-icons/fi'

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <div className="landing-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="landing-content">
        <div className="logo-mark">
          <FiZap />
        </div>

        <h1>SightAI</h1>
        <p className="tagline">See. Ask. Know.</p>
        <p className="desc">
          Point your camera at anything and ask a question.
          Get instant AI-powered answers.
        </p>

        <div className="features">
          <div className="feature-chip">
            <FiCamera size={14} /> Camera
          </div>
          <div className="feature-chip">
            <FiMic size={14} /> Voice
          </div>
          <div className="feature-chip">
            <FiZap size={14} /> AI
          </div>
        </div>

        <button className="cta-btn" onClick={() => navigate('/ai')}>
          Start <FiArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

export default LandingPage
