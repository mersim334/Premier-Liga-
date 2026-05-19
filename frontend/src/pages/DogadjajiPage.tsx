import { MatchEventsSection } from '../components/LigaSections'
import { useLigaData } from '../context/LigaDataContext'

export function DogadjajiPage() {
  const { selectedSeasonId, matches, loading } = useLigaData()

  if (
    !loading &&
    selectedSeasonId != null &&
    matches.length === 0
  ) {
    return <p className="muted">Nema utakmica — nema događaja za prikaz.</p>
  }

  return <MatchEventsSection />
}
