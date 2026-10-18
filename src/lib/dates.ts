import { addDays, differenceInCalendarDays, startOfDay, subDays } from 'date-fns'
import type { ScheduleEvent } from '../api/types'

export interface DateRange {
  from: Date
  /** 배타적 */
  to: Date
}

/** 일정이 차지하는 마지막 날 (배타적 종료가 자정이면 그 전날) */
export function lastDayOf(event: Pick<ScheduleEvent, 'start' | 'end'>): Date {
  const endDay = startOfDay(event.end)
  if (event.end.getTime() === endDay.getTime() && event.end > event.start) return subDays(endDay, 1)
  return endDay
}

export function overlaps(event: Pick<ScheduleEvent, 'start' | 'end'>, range: DateRange): boolean {
  // 길이 0 인 일정도 시작 시점이 범위 안이면 포함
  return event.start < range.to && (event.end > range.from || event.start >= range.from)
}

export function durationDays(event: Pick<ScheduleEvent, 'start' | 'end'>): number {
  return differenceInCalendarDays(lastDayOf(event), startOfDay(event.start)) + 1
}

export function sortEvents(a: ScheduleEvent, b: ScheduleEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
  return a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title)
}

export interface AgendaDay {
  date: Date
  events: ScheduleEvent[]
}

/** 오늘부터 days 일 동안 날짜별로 겹치는 일정을 묶는다 */
export function groupByDay(events: ScheduleEvent[], today: Date, days: number): AgendaDay[] {
  const first = startOfDay(today)
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(first, i)
    const range = { from: date, to: addDays(date, 1) }
    return { date, events: events.filter((e) => overlaps(e, range)).sort(sortEvents) }
  })
}

export function isOngoing(event: ScheduleEvent, now: Date): boolean {
  return !event.allDay && event.start <= now && now < event.end
}
