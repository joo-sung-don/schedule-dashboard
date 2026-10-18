import { addDays, addHours, setHours, startOfDay } from 'date-fns'
import type { CalendarApi } from './calendar'
import type { EventInput, Project, ScheduleEvent } from './types'

// Google 연동 없이 화면을 확인하기 위한 메모리 내 데이터 (새로고침 시 초기화)
const projects: Project[] = [
  { id: 'web', name: '웹사이트 리뉴얼', color: '#4f6bed', textColor: '#ffffff', writable: true, primary: true },
  { id: 'app', name: '모바일 앱 v2', color: '#0f9d77', textColor: '#ffffff', writable: true, primary: false },
  { id: 'mkt', name: '하반기 마케팅', color: '#e2742a', textColor: '#ffffff', writable: true, primary: false },
  { id: 'hol', name: '공휴일 (읽기 전용)', color: '#8a8f98', textColor: '#ffffff', writable: false, primary: false },
]

let seq = 0
let events: ScheduleEvent[] = []

function seed() {
  const today = startOfDay(new Date())
  const day = (n: number) => addDays(today, n)
  const at = (n: number, h: number) => setHours(day(n), h)
  const allDay = (calendarId: string, title: string, from: number, days: number): ScheduleEvent => ({
    id: `d${++seq}`, calendarId, title, description: '', start: day(from), end: day(from + days), allDay: true, recurring: false,
  })
  const timed = (calendarId: string, title: string, n: number, h: number, hours = 1): ScheduleEvent => ({
    id: `d${++seq}`, calendarId, title, description: '', start: at(n, h), end: addHours(at(n, h), hours), allDay: false, recurring: false,
  })
  events = [
    allDay('web', '디자인 시안 작업', -6, 8),
    allDay('web', '퍼블리싱', 2, 10),
    allDay('web', 'QA 및 오픈', 13, 5),
    timed('web', '디자인 리뷰', 0, 10),
    timed('web', '주간 진행 공유', 3, 14),
    allDay('app', 'API 연동', -3, 9),
    allDay('app', '스토어 심사 제출 마감', 9, 1),
    timed('app', '스프린트 플래닝', 0, 14, 2),
    timed('app', '사용성 테스트', 1, 15, 2),
    allDay('mkt', '캠페인 기획', -10, 12),
    allDay('mkt', '광고 소재 제작', 4, 7),
    timed('mkt', '대행사 미팅', 0, 16),
    timed('mkt', '보도자료 검토', 2, 11),
    allDay('hol', '사내 휴무일', 6, 1),
  ]
}
seed()

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150))

function find(calendarId: string, eventId: string) {
  const e = events.find((x) => x.calendarId === calendarId && x.id === eventId)
  if (!e) throw new Error('일정을 찾을 수 없습니다.')
  return e
}

function assertWritable(calendarId: string) {
  if (!projects.find((p) => p.id === calendarId)?.writable) throw new Error('읽기 전용 캘린더입니다.')
}

export const demoCalendarApi: CalendarApi = {
  listProjects: () => delay(projects.map((p) => ({ ...p }))),

  listEvents: (calendarId, timeMin, timeMax) =>
    delay(events.filter((e) => e.calendarId === calendarId && e.start < timeMax && e.end > timeMin).map((e) => ({ ...e }))),

  async createEvent(calendarId, input: EventInput) {
    assertWritable(calendarId)
    const e: ScheduleEvent = { id: `d${++seq}`, calendarId, recurring: false, ...input }
    events.push(e)
    return delay({ ...e })
  },

  async updateEvent(calendarId, eventId, patch) {
    assertWritable(calendarId)
    const e = find(calendarId, eventId)
    Object.assign(e, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)))
    return delay({ ...e })
  },

  async moveEvent(calendarId, eventId, destinationId) {
    assertWritable(calendarId)
    assertWritable(destinationId)
    const e = find(calendarId, eventId)
    e.calendarId = destinationId
    return delay({ ...e })
  },

  async deleteEvent(calendarId, eventId) {
    assertWritable(calendarId)
    find(calendarId, eventId)
    events = events.filter((x) => !(x.calendarId === calendarId && x.id === eventId))
    await delay(undefined)
  },
}
