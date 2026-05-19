import { PlayersSection } from '../components/LigaSections'
import { useLigaData } from '../context/LigaDataContext'

export function IgraciPage() {
  const { selectedSeasonId, players, loading } = useLigaData()

  if (!loading && selectedSeasonId != null && players.length === 0) {
    return <p className="muted">Nema igrača za ovu sezonu.</p>
  }

  return <PlayersSection />
}
