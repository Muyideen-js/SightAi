import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AIPage from './pages/AIPage'
import './index.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/ai" element={<AIPage />} />
    </Routes>
  )
}

export default App
