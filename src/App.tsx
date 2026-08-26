import { HashRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nContext'
import PatientsPage from './pages/PatientsPage'
import AccountPage from './pages/AccountPage'
import DashboardPage from './pages/DashboardPage'
import NewSessionPage from './pages/NewSessionPage'
import QuestionnairePage from './pages/QuestionnairePage'
import SensorPairingPage from './pages/SensorPairingPage'
import ExerciseCapturePage from './pages/ExerciseCapturePage'
import SitToStandPage from './pages/SitToStandPage'
import WalkTestPage from './pages/WalkTestPage'
import ResultsPage from './pages/ResultsPage'

function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<PatientsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients/:patientId/new-session" element={<NewSessionPage />} />
          <Route path="/session/:sessionId/questionnaire" element={<QuestionnairePage />} />
          <Route path="/session/:sessionId/sensor-pairing" element={<SensorPairingPage />} />
          <Route path="/session/:sessionId/exercise" element={<ExerciseCapturePage />} />
          <Route path="/session/:sessionId/sit-to-stand" element={<SitToStandPage />} />
          <Route path="/session/:sessionId/walk-test" element={<WalkTestPage />} />
          <Route path="/session/:sessionId/results" element={<ResultsPage />} />
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}

export default App
