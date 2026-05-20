import { StandingsSection } from '../components/LigaSections'
import { useLigaData } from '../context/LigaDataContext'

export function TablicaPage() {
  const { selectedSeasonId } = useLigaData()

  if (selectedSeasonId == null) {
    return <p className="muted">Odaberi sezonu za tablicu.</p>
  }

  return <StandingsSection />
}
