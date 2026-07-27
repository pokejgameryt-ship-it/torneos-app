import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import CreateTournament from './pages/CreateTournament'
import Tournament from './pages/Tournament'
import PublicTournament from './pages/PublicTournament'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-dark">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateTournament />} />
            <Route path="/tournament/:id" element={<Tournament />} />
            <Route path="/view/:id" element={<PublicTournament />} />
            <Route path="/register/:id" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
