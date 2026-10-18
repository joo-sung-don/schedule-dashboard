import { describe, expect, it } from 'vitest'
import { toGoogleEventBody, toProject, toScheduleEvent } from './types'

describe('toScheduleEvent', () => {
  it('종일 일정은 로컬 자정 기준 배타적 종료로 변환한다', () => {
    const e = toScheduleEvent(
      { id: 'a', summary: '퍼블리싱', start: { date: '2026-10-20' }, end: { date: '2026-10-23' } },
      'cal',
    )
    expect(e.allDay).toBe(true)
    expect(e.start).toEqual(new Date(2026, 9, 20))
    expect(e.end).toEqual(new Date(2026, 9, 23))
    expect(e.calendarId).toBe('cal')
  })

  it('시간 일정과 반복 여부, 빈 제목을 처리한다', () => {
    const e = toScheduleEvent(
      {
        id: 'b',
        summary: '  ',
        recurringEventId: 'r1',
        start: { dateTime: '2026-10-20T10:00:00+09:00' },
        end: { dateTime: '2026-10-20T11:30:00+09:00' },
      },
      'cal',
    )
    expect(e.allDay).toBe(false)
    expect(e.start.toISOString()).toBe('2026-10-20T01:00:00.000Z')
    expect(e.title).toBe('(제목 없음)')
    expect(e.recurring).toBe(true)
  })
})

describe('toGoogleEventBody', () => {
  it('종일 일정은 date 를 쓰고 dateTime 을 지운다', () => {
    const body = toGoogleEventBody({
      title: 'QA',
      description: '',
      start: new Date(2026, 9, 20),
      end: new Date(2026, 9, 21),
      allDay: true,
    })
    expect(body).toEqual({
      summary: 'QA',
      description: '',
      start: { date: '2026-10-20', dateTime: null },
      end: { date: '2026-10-21', dateTime: null },
    })
  })

  it('시간 일정은 dateTime 을 쓰고 date 를 지운다', () => {
    const start = new Date('2026-10-20T01:00:00Z')
    const body = toGoogleEventBody({ start, end: new Date('2026-10-20T02:00:00Z'), allDay: false })
    expect(body.start).toEqual({ dateTime: '2026-10-20T01:00:00.000Z', date: null })
    expect(body).not.toHaveProperty('summary')
  })

  it('시간 정보가 일부만 있으면 시간을 보내지 않는다', () => {
    expect(toGoogleEventBody({ title: 'x', start: new Date() })).toEqual({ summary: 'x' })
  })
})

describe('toProject', () => {
  it('접근 권한으로 쓰기 가능 여부를 정한다', () => {
    expect(toProject({ id: '1', summary: 'A', accessRole: 'writer' }).writable).toBe(true)
    expect(toProject({ id: '2', summary: 'B', accessRole: 'reader' }).writable).toBe(false)
    expect(toProject({ id: '3', summary: 'C', summaryOverride: 'C2', accessRole: 'owner' }).name).toBe('C2')
  })
})
