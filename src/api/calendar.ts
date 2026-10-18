import { getAccessToken, invalidateToken } from '../auth/googleAuth'
import {
  toGoogleEventBody,
  toProject,
  toScheduleEvent,
  type EventInput,
  type GCalendarListEntry,
  type GEvent,
  type Project,
  type ScheduleEvent,
} from './types'

/** Google 구현과 데모 구현이 공유하는 인터페이스 */
export interface CalendarApi {
  listProjects(): Promise<Project[]>
  listEvents(calendarId: string, timeMin: Date, timeMax: Date): Promise<ScheduleEvent[]>
  createEvent(calendarId: string, input: EventInput): Promise<ScheduleEvent>
  updateEvent(calendarId: string, eventId: string, patch: Partial<EventInput>): Promise<ScheduleEvent>
  moveEvent(calendarId: string, eventId: string, destinationId: string): Promise<ScheduleEvent>
  deleteEvent(calendarId: string, eventId: string): Promise<void>
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const BASE = 'https://www.googleapis.com/calendar/v3'

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = await getAccessToken()
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (res.status === 401 && retry) {
    invalidateToken()
    return request<T>(path, init, false)
  }
  if (!res.ok) {
    let message = `Google Calendar 요청 실패 (${res.status})`
    try {
      const data = await res.json()
      if (data?.error?.message) message = data.error.message
    } catch {
      // 본문이 JSON 이 아니면 기본 메시지 사용
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const cal = (id: string) => `/calendars/${encodeURIComponent(id)}`

async function paginate<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const items: T[] = []
  let pageToken: string | undefined
  do {
    const qs = new URLSearchParams({ ...params, ...(pageToken ? { pageToken } : {}) })
    const page = await request<{ items?: T[]; nextPageToken?: string }>(`${path}?${qs}`)
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return items
}

export const googleCalendarApi: CalendarApi = {
  async listProjects() {
    const entries = await paginate<GCalendarListEntry>('/users/me/calendarList', { minAccessRole: 'reader' })
    return entries.map(toProject)
  },

  async listEvents(calendarId, timeMin, timeMax) {
    const events = await paginate<GEvent>(`${cal(calendarId)}/events`, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    })
    return events.filter((e) => e.status !== 'cancelled').map((e) => toScheduleEvent(e, calendarId))
  },

  async createEvent(calendarId, input) {
    const e = await request<GEvent>(`${cal(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(toGoogleEventBody(input)),
    })
    return toScheduleEvent(e, calendarId)
  },

  async updateEvent(calendarId, eventId, patch) {
    const e = await request<GEvent>(`${cal(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      body: JSON.stringify(toGoogleEventBody(patch)),
    })
    return toScheduleEvent(e, calendarId)
  },

  async moveEvent(calendarId, eventId, destinationId) {
    const qs = new URLSearchParams({ destination: destinationId })
    const e = await request<GEvent>(`${cal(calendarId)}/events/${encodeURIComponent(eventId)}/move?${qs}`, {
      method: 'POST',
    })
    return toScheduleEvent(e, destinationId)
  },

  async deleteEvent(calendarId, eventId) {
    await request<void>(`${cal(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
  },
}
