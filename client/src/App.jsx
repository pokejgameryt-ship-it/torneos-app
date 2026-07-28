import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import CreateTournament from './pages/CreateTournament'
import Tournament from './pages/Tournament'
import PublicTournament from './pages/PublicTournament'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import UserSettings from './pages/UserSettings'
import DMPage from './pages/DMPage'
import HelpPage from './pages/HelpPage'
import TournamentPlay from './pages/TournamentPlay'
import MatchRoomPage from './pages/MatchRoomPage'

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
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/settings" element={<UserSettings />} />
            <Route path="/dm" element={<DMPage />} />
            <Route path="/dm/:userId" element={<DMPage />} />
            <Route path="/tournament/:id/play" element={<TournamentPlay />} />
            <Route path="/match/:matchId" element={<MatchRoomPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
