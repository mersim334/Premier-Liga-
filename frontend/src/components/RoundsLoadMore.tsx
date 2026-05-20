type Props = {
  canShowMore: boolean
  onShowMore: () => void
  nextChunkLabel: string | null
  canShowLess: boolean
  onShowLess: () => void
  prevChunkLabel: string | null
}

/** Dugmad za proširenje / sužavanje liste po blokovima kola. */
export function RoundsLoadMore({
  canShowMore,
  onShowMore,
  nextChunkLabel,
  canShowLess,
  onShowLess,
  prevChunkLabel,
}: Props) {
  if (!canShowMore && !canShowLess) return null

  return (
    <div className="rounds-load-more">
      {canShowLess ? (
        <button
          type="button"
          className="rounds-load-more-btn rounds-load-more-btn--less"
          onClick={onShowLess}
        >
          <span className="rounds-load-more-chevron" aria-hidden>
            ▴
          </span>
          Prikaži manje
          {prevChunkLabel ? (
            <span className="rounds-load-more-detail">
              {' '}
              · sakrij {prevChunkLabel}
            </span>
          ) : null}
        </button>
      ) : null}
      {canShowMore ? (
        <button
          type="button"
          className="rounds-load-more-btn"
          onClick={onShowMore}
        >
          <span className="rounds-load-more-chevron" aria-hidden>
            ▾
          </span>
          Prikaži još
          {nextChunkLabel ? (
            <span className="rounds-load-more-detail">
              {' '}
              · {nextChunkLabel}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  )
}
