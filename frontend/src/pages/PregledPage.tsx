import {
  MatchEventsSection,
  MatchesSection,
  PlayersSection,
  TeamsSection,
} from '../components/LigaSections'
import { useLigaData } from '../context/LigaDataContext'

export function PregledPage() {
  const { loading, error, teams } = useLigaData()

  if (!loading && !error && teams.length === 0) {
    return (
      <p className="muted">Nema timova — provjeri seed / bazu na backendu.</p>
    )
  }

  return (
    <>
      <TeamsSection />
      <MatchesSection />
      <PlayersSection />
      <MatchEventsSection />
    </>
  )
}
