import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  teamId: number
  className?: string
  children: ReactNode
}

/** Link na stranicu kluba — koristi se u tabelama (naziv kao klik). */
export function TeamClubLink({ teamId, className, children }: Props) {
  return (
    <Link
      to={`/timovi/${teamId}`}
      className={className ? `inline-entity-link ${className}` : 'inline-entity-link'}
    >
      {children}
    </Link>
  )
}
