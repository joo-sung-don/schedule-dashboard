import { format, parseISO } from 'date-fns'

// Google Calendar API v3 응답 형태 (사용하는 필드만)
export interface GCalendarListEntry {
  id: string
  summary: string
  summaryOverride?: string
  backgroundColor?: string
  foregroundColor?: string
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader'
  primary?: boolean
}

export interface GEventTime {
  date?: string
  dateTime?: string
  timeZone?: string
}

export interface GEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  start: GEventTime
  end: GEventTime
  htmlLink?: string
  recurringEventId?: string
}

// 앱 내부 모델: 프로젝트 = 캘린더 하나
export interface Project {
  id: string
  name: string
  color: string
  textColor: string
  writable: boolean
  primary: boolean
}

export interface ScheduleEvent {
  id: string
  calendarId: string
  title: string
  description: string
  start: Date
  /** 종료 시각(배타적). 종일 일정이면 마지막 날의 다음 날 00:00 */
  end: Date
  allDay: boolean
  htmlLink?: string
  recurring: boolean
}

export interface EventInput {
  title: string
  description: string
  start: Date
  /** 배타적 종료 (ScheduleEvent.end 와 동일 규칙) */
  end: Date
  allDay: boolean
}

const DEFAULT_COLOR = '#4f6bed'

export function toProject(entry: GCalendarListEntry): Project {
  return {
    id: entry.id,
    name: entry.summaryOverride ?? entry.summary,
    color: entry.backgroundColor ?? DEFAULT_COLOR,
    textColor: entry.foregroundColor ?? '#ffffff',
    writable: entry.accessRole === 'owner' || entry.accessRole === 'writer',
    primary: entry.primary ?? false,
  }
}

function parseTime(t: GEventTime): Date {
  // 날짜만 있는 값(yyyy-MM-dd)은 parseISO가 로컬 자정으로 해석한다
  return parseISO(t.dateTime ?? t.date ?? '')
}

export function toScheduleEvent(e: GEvent, calendarId: string): ScheduleEvent {
  return {
    id: e.id,
    calendarId,
    title: e.summary?.trim() || '(제목 없음)',
    description: e.description ?? '',
    start: parseTime(e.start),
    end: parseTime(e.end),
    allDay: !e.start.dateTime,
    htmlLink: e.htmlLink,
    recurring: Boolean(e.recurringEventId),
  }
}

// patch 로 종일 ↔ 시간 일정을 전환할 때 반대쪽 필드를 null 로 지워야 한다
function toGoogleTime(d: Date, allDay: boolean) {
  return allDay
    ? { date: format(d, 'yyyy-MM-dd'), dateTime: null }
    : { dateTime: d.toISOString(), date: null }
}

/** events.insert / events.patch 요청 본문 */
export function toGoogleEventBody(input: Partial<EventInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (input.title !== undefined) body.summary = input.title
  if (input.description !== undefined) body.description = input.description
  if (input.start && input.end && input.allDay !== undefined) {
    body.start = toGoogleTime(input.start, input.allDay)
    body.end = toGoogleTime(input.end, input.allDay)
  }
  return body
}
