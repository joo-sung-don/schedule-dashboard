import { differenceInCalendarDays, startOfDay } from 'date-fns'
import type { ScheduleEvent } from '../api/types'
import { lastDayOf } from './dates'

export interface TimelineBar {
  event: ScheduleEvent
  /** 0 부터 시작하는 날짜 열 */
  startCol: number
  span: number
  lane: number
  /** 범위 밖으로 이어지는지 (막대 끝 모양 표시용) */
  continuesBefore: boolean
  continuesAfter: boolean
}

/**
 * 한 프로젝트 행 안에서 일정을 날짜 열에 배치한다.
 * 겹치는 일정은 아래 줄(lane)로 내려 쌓는다.
 * minOccupy: 짧은 일정도 라벨이 보이도록 최소 이 열 수만큼 자리를 차지한 것으로 본다.
 */
export function layoutBars(events: ScheduleEvent[], rangeStart: Date, days: number, minOccupy = 1) {
  const origin = startOfDay(rangeStart)
  const placed = events
    .map((event) => {
      const first = differenceInCalendarDays(startOfDay(event.start), origin)
      const last = differenceInCalendarDays(lastDayOf(event), origin)
      return { event, first, last }
    })
    .filter(({ first, last }) => last >= 0 && first < days)
    .map(({ event, first, last }) => {
      const startCol = Math.max(first, 0)
      const endCol = Math.min(last, days - 1)
      return { event, startCol, span: endCol - startCol + 1, continuesBefore: first < 0, continuesAfter: last >= days }
    })
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span || a.event.start.getTime() - b.event.start.getTime())

  const laneEnds: number[] = []
  const bars: TimelineBar[] = placed.map((bar) => {
    let lane = laneEnds.findIndex((end) => end < bar.startCol)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = bar.startCol + Math.max(bar.span, minOccupy) - 1
    return { ...bar, lane }
  })
  return { bars, laneCount: Math.max(laneEnds.length, 1) }
}
