import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LigaDataProvider } from './context/LigaDataContext'
import { MainLayout } from './layouts/MainLayout'
import { DogadjajiPage } from './pages/DogadjajiPage'
import { IgracDetaljPage } from './pages/IgracDetaljPage'
import { IgraciPage } from './pages/IgraciPage'
import { PravilaPage } from './pages/PravilaPage'
import { PregledPage } from './pages/PregledPage'
import { RasporedPage } from './pages/RasporedPage'
import { TablicaPage } from './pages/TablicaPage'
import { TimDetaljPage } from './pages/TimDetaljPage'
import { TimoviPage } from './pages/TimoviPage'
import { UtakmicePage } from './pages/UtakmicePage'
import { UporediPage } from './pages/UporediPage'

import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <LigaDataProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<PregledPage />} />
            <Route path="pravila" element={<PravilaPage />} />
            <Route path="tablica" element={<TablicaPage />} />
            <Route path="raspored" element={<RasporedPage />} />
            <Route path="timovi" element={<TimoviPage />} />
            <Route path="timovi/:teamId" element={<TimDetaljPage />} />
            <Route path="utakmice" element={<UtakmicePage />} />
            <Route path="uporedi" element={<UporediPage />} />
            <Route path="igraci" element={<IgraciPage />} />
            <Route path="igraci/:playerId" element={<IgracDetaljPage />} />
            <Route path="dogadjaji" element={<DogadjajiPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LigaDataProvider>
    </BrowserRouter>
  )
}
