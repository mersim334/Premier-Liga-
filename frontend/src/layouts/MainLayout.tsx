import { NavLink, Outlet } from 'react-router-dom'

import { API_BASE_URL } from '../config'
import { useLigaData } from '../context/LigaDataContext'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link'

export function MainLayout() {
  const {
    loading,
    error,
    health,
    seasons,
    selectedSeasonId,
    detailLoading,
    onSeasonChange,
  } = useLigaData()

  return (
    <div className="app">
      <header className="main-header">
        <div className="header-title">
          <h1>BiH Premier Liga</h1>
          <p className="tagline">
            Frontend prema postojećem API-ju · bez izmjena backenda
          </p>
        </div>
        <nav className="main-nav" aria-label="Glavna navigacija">
          <NavLink to="/" end className={navCls}>
            Pregled
          </NavLink>
          <NavLink to="/timovi" className={navCls}>
            Timovi
          </NavLink>
          <NavLink to="/utakmice" className={navCls}>
            Utakmice
          </NavLink>
          <NavLink to="/igraci" className={navCls}>
            Igrači
          </NavLink>
          <NavLink to="/dogadjaji" className={navCls}>
            Događaji
          </NavLink>
        </nav>
      </header>

      <section className="api-hint" aria-label="Backend URL">
        <span>Backend URL:</span>
        <code>{API_BASE_URL}</code>
      </section>

      <section className="status-block" aria-live="polite">
        {loading && <p className="muted">Učitavanje…</p>}
        {!loading && error && (
          <p className="error" role="alert">
            {error}{' '}
            <span className="muted">
              (Je li pokrenut backend: <code>uvicorn app.main:app</code>?)
            </span>
          </p>
        )}
        {!loading && !error && health && (
          <p>
            Odgovor <code>/health</code>: <strong>{health}</strong>
          </p>
        )}
      </section>

      {!loading && !error && seasons.length > 0 && (
        <section className="season-picker" aria-label="Odabir sezone">
          <label htmlFor="season-select">Sezona</label>
          <select
            id="season-select"
            value={selectedSeasonId ?? ''}
            onChange={onSeasonChange}
            disabled={detailLoading}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_current ? ' (aktuelna)' : ''}
              </option>
            ))}
          </select>
          {detailLoading && (
            <span className="muted inline-hint">Osvježavanje…</span>
          )}
        </section>
      )}

      <main className="main-outlet">
        <Outlet />
      </main>
    </div>
  )
}
