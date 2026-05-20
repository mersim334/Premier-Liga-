import { NavLink, Outlet } from 'react-router-dom'

import { useLigaData } from '../context/LigaDataContext'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link'

export function MainLayout() {
  const {
    loading,
    error,
    seasons,
    selectedSeasonId,
    detailLoading,
    onSeasonChange,
  } = useLigaData()

  return (
    <div className="app">
      <header className="site-topbar">
        <div className="brand-line">
          <h1>Premier liga — demo</h1>
          <p className="brand-meta">
            Fiktivni klubovi i igrači · podaci samo za vježbu aplikacije
          </p>
        </div>
      </header>

      <nav className="main-nav" aria-label="Glavna navigacija">
        <NavLink to="/" end className={navCls}>
          Pregled
        </NavLink>
        <NavLink to="/raspored" className={navCls}>
          Raspored
        </NavLink>
        <NavLink to="/rezultati" className={navCls}>
          Rezultati
        </NavLink>
        <NavLink to="/tablica" className={navCls}>
          Tablica
        </NavLink>
      </nav>

      {!loading && error && (
        <div className="error error-banner" role="alert">
          {error}{' '}
          <span className="muted">
            (probaj pokrenuti <code>uvicorn app.main:app</code> iz{' '}
            <code>backend</code>?)
          </span>
        </div>
      )}

      {!loading && !error && seasons.length > 0 && (
        <div className="toolbar-bar">
          <div className="season-picker">
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
                  {s.is_current ? ' (akt.)' : ''}
                </option>
              ))}
            </select>
          </div>
          {detailLoading && (
            <span className="inline-hint">Osvježavanje…</span>
          )}
        </div>
      )}

      {!loading && !error && seasons.length === 0 && (
        <section className="toolbar-bar muted">
          Nije učitan kalendar sezona.
        </section>
      )}

      <main className="main-outlet">
        <Outlet />
      </main>
    </div>
  )
}
