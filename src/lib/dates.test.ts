import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '../api/types'
import { durationDays, groupByDay, isOngoing, lastDayOf } from './dates'

const ev = (start: Date, end: Date, allDay: boolean, title = 'e'): ScheduleEvent => ({
  id: title, calendarId: 'c', title, description: '', start, end, allDay, recurring: false,
})

describe('lastDayOf / durationDays', () => {
  it('자정에 끝나는 일정은 전날이 마지막 날이다', () => {
    const e = ev(new Date(2026, 9, 20), new Date(2026, 9, 23), true)
    expect(lastDayOf(e)).toEqual(new Date(2026, 9, 22))
    expect(durationDays(e)).toBe(3)
  })

  it('같은 날 끝나는 시간 일정은 하루짜리다', () => {
    const e = ev(new Date(2026, 9, 20, 10), new Date(2026, 9, 20, 11), false)
    expect(lastDayOf(e)).toEqual(new Date(2026, 9, 20))
    expect(durationDays(e)).toBe(1)
  })
})

describe('groupByDay', () => {
  it('여러 날 걸친 일정을 각 날짜에 넣고 종일 일정을 먼저 정렬한다', () => {
    const multi = ev(new Date(2026, 9, 19), new Date(2026, 9, 21), true, 'multi')
    const meeting = ev(new Date(2026, 9, 20, 9), new Date(2026, 9, 20, 10), false, 'meeting')
    const later = ev(new Date(2026, 9, 22, 9), new Date(2026, 9, 22, 10), false, 'later')
    const days = groupByDay([meeting, later, multi], new Date(2026, 9, 20, 15), 3)

    expect(days.map((d) => d.events.map((e) => e.title))).toEqual([['multi', 'meeting'], [], ['later']])
  })
})

describe('isOngoing', () => {
  it('현재 시각이 시간 일정 안에 있으면 진행 중', () => {
    const e = ev(new Date(2026, 9, 20, 9), new Date(2026, 9, 20, 10), false)
    expect(isOngoing(e, new Date(2026, 9, 20, 9, 30))).toBe(true)
    expect(isOngoing(e, new Date(2026, 9, 20, 10))).toBe(false)
  })
})
