import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LigaDataProvider } from './context/LigaDataContext'
import { MainLayout } from './layouts/MainLayout'
import { DogadjajiPage } from './pages/DogadjajiPage'
import { IgraciPage } from './pages/IgraciPage'
import { PregledPage } from './pages/PregledPage'
import { TimoviPage } from './pages/TimoviPage'
import { UtakmicePage } from './pages/UtakmicePage'

import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <LigaDataProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<PregledPage />} />
            <Route path="timovi" element={<TimoviPage />} />
            <Route path="utakmice" element={<UtakmicePage />} />
            <Route path="igraci" element={<IgraciPage />} />
            <Route path="dogadjaji" element={<DogadjajiPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LigaDataProvider>
    </BrowserRouter>
  )
}
