import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FiMic, FiMicOff, FiCamera, FiCameraOff,
  FiRefreshCw, FiVolume2, FiArrowLeft
} from 'react-icons/fi'
import { analyzeImageWithAudio } from '../services/gemini'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

function AIPage() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const recognitionRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [cameraOn, setCameraOn] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [response, setResponse] = useState('')
  const [transcript, setTranscript] = useState('')
  const [facingMode, setFacingMode] = useState('environment')

  useEffect(() => {
    if (cameraOn) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [cameraOn, facingMode])

  useEffect(() => {
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setTranscript(text)
    }

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') setIsRecording(false)
    }

    rec.onend = () => {
      if (recognitionRef.current?._active) {
        try { rec.start() } catch(e) {}
      }
    }

    recognitionRef.current = rec
    return () => {
      try { rec.stop() } catch(e) {}
    }
  }, [])

  const startCamera = async () => {
    stopCamera()
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      })
      setStream(s)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      setCameraOn(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }

  const captureFrame = () => {
    if (!videoRef.current) return null
    const c = document.createElement('canvas')
    c.width = videoRef.current.videoWidth
    c.height = videoRef.current.videoHeight
    c.getContext('2d').drawImage(videoRef.current, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg')
  }

  const handleMic = () => {
    if (isRecording) {
      setIsRecording(false)
      if (recognitionRef.current) {
        recognitionRef.current._active = false
        try { recognitionRef.current.stop() } catch(e) {}
      }
      setTimeout(() => processQuery(), 300)
    } else {
      setResponse('')
      setTranscript('')
      setIsRecording(true)
      if (recognitionRef.current) {
        recognitionRef.current._active = true
        try { recognitionRef.current.start() } catch(e) {}
      }
    }
  }

  const processQuery = async () => {
    setIsAnalyzing(true)
    const frame = captureFrame()
    const query = transcript || 'What do you see? Describe and help.'

    try {
      const reply = await analyzeImageWithAudio(frame, query)
      setResponse(reply)
      speak(reply)
    } catch {
      const msg = "Couldn't process that. Try again."
      setResponse(msg)
      speak(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    
    // Strip markdown chars before speaking
    const cleanText = text.replace(/[*_#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1')
    const u = new SpeechSynthesisUtterance(cleanText)
    u.rate = 1
    u.pitch = 1
    window.speechSynthesis.speak(u)
  }

  const statusLabel = isAnalyzing ? 'Analyzing' : isRecording ? 'Listening' : response ? 'Done' : 'Ready'
  const statusCls = isAnalyzing ? 'analyzing' : isRecording ? 'listening' : response ? 'done' : 'idle'

  return (
    <div className="ai-page">
      <div className="ai-topbar">
        <button className="tb-btn" onClick={() => navigate('/')}>
          <FiArrowLeft size={16} />
        </button>
        <div className="tb-center">
          <div className="css-logo" style={{ transform: 'rotate(45deg) scale(0.6)' }} />
          <span className="tb-logo">SightAI</span>
          <span className={`tb-status ${statusCls}`}>
            <span className="tb-dot" />
            {statusLabel}
          </span>
        </div>
        <div className="tb-right">
          <button className={`tb-btn ${cameraOn ? '' : 'off'}`} onClick={() => setCameraOn(p => !p)}>
            {cameraOn ? <FiCamera size={15} /> : <FiCameraOff size={15} />}
          </button>
          <button className="tb-btn" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}>
            <FiRefreshCw size={15} />
          </button>
        </div>
      </div>

      {response && (
        <div className="ai-response-wrap">
          <div className="ai-response-card markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <div className="ai-camera">
        {cameraOn && stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="cam-feed" />
        ) : (
          <div className="cam-off">
            <FiCameraOff size={36} />
            <span>{cameraOn ? 'Starting...' : 'Camera off'}</span>
          </div>
        )}

        <div className={`scan-fx ${isAnalyzing ? 'active' : ''}`}>
          <div className="scan-beam" />
          <div className="scan-corner tl" />
          <div className="scan-corner tr" />
          <div className="scan-corner bl" />
          <div className="scan-corner br" />
        </div>
      </div>

      <div className="ai-dock">
        {(isRecording || transcript) && (
          <div className={`dock-transcript ${transcript ? 'has' : ''}`}>
            {transcript || 'Listening...'}
          </div>
        )}
        <div className="dock-row">
          <button className={`dock-btn ${response ? 'active' : ''}`} onClick={() => speak(response)}>
            <FiVolume2 size={16} />
          </button>
          <button className={`dock-mic ${isRecording ? 'rec' : ''}`} onClick={handleMic}>
            {isRecording ? <FiMicOff size={22} /> : <FiMic size={22} />}
          </button>
          <button className="dock-btn" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}>
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIPage
