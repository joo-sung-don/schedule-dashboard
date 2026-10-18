import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '../api/types'
import { layoutBars } from './timeline'

const day = (d: number, h = 0) => new Date(2026, 9, d, h)
const ev = (title: string, start: Date, end: Date): ScheduleEvent => ({
  id: title, calendarId: 'c', title, description: '', start, end, allDay: start.getHours() === 0, recurring: false,
})

describe('layoutBars', () => {
  const rangeStart = day(1)

  it('날짜 열과 길이를 계산한다', () => {
    const { bars, laneCount } = layoutBars([ev('a', day(3), day(6))], rangeStart, 31)
    expect(bars[0]).toMatchObject({ startCol: 2, span: 3, lane: 0, continuesBefore: false, continuesAfter: false })
    expect(laneCount).toBe(1)
  })

  it('겹치는 일정은 다른 줄에, 겹치지 않으면 같은 줄에 배치한다', () => {
    const { bars, laneCount } = layoutBars(
      [ev('a', day(1), day(5)), ev('b', day(3), day(4)), ev('c', day(5), day(6))],
      rangeStart,
      31,
    )
    const lane = Object.fromEntries(bars.map((b) => [b.event.title, b.lane]))
    expect(lane).toEqual({ a: 0, b: 1, c: 0 })
    expect(laneCount).toBe(2)
  })

  it('minOccupy 만큼 라벨 자리를 확보해 짧은 일정끼리 겹치지 않게 한다', () => {
    const events = [ev('a', day(3), day(4)), ev('b', day(5), day(6))]
    expect(layoutBars(events, rangeStart, 31).laneCount).toBe(1)
    expect(layoutBars(events, rangeStart, 31, 4).bars.map((b) => b.lane)).toEqual([0, 1])
  })

  it('범위를 벗어난 부분은 잘라내고 표시한다', () => {
    const { bars } = layoutBars([ev('a', new Date(2026, 8, 28), day(3)), ev('b', day(30), day(40))], rangeStart, 31)
    expect(bars[0]).toMatchObject({ startCol: 0, span: 2, continuesBefore: true })
    expect(bars[1]).toMatchObject({ startCol: 29, span: 2, continuesAfter: true })
  })

  it('범위 밖 일정과 빈 목록을 처리한다', () => {
    expect(layoutBars([ev('a', day(1, 10), day(1, 11))], day(2), 10).bars).toHaveLength(0)
    expect(layoutBars([], rangeStart, 31)).toEqual({ bars: [], laneCount: 1 })
  })
})
