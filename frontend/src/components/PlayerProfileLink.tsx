import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  playerId: number
  className?: string
  children: ReactNode
}

/** Link na profil igrača — koristi se u tabelama. */
export function PlayerProfileLink({ playerId, className, children }: Props) {
  return (
    <Link
      to={`/igraci/${playerId}`}
      className={
        className ? `inline-entity-link ${className}` : 'inline-entity-link'
      }
    >
      {children}
    </Link>
  )
}
