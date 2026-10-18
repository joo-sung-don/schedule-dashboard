import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api/ApiContext'
import type { EventInput, Project, ScheduleEvent } from '../api/types'
import type { DateRange } from '../lib/dates'

/** 보이는 프로젝트들의 기간 내 일정을 병렬로 불러와 합친다 */
export function useEvents(projects: Project[], range: DateRange | null) {
  const api = useApi()
  return useQueries({
    queries: projects.map((p) => ({
      queryKey: ['events', p.id, range?.from.toISOString(), range?.to.toISOString()],
      queryFn: () => api.listEvents(p.id, range!.from, range!.to),
      enabled: range !== null,
      placeholderData: (prev: ScheduleEvent[] | undefined) => prev,
    })),
    combine: (results) => ({
      events: results.flatMap((r) => r.data ?? []),
      isFetching: results.some((r) => r.isFetching),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  })
}

export interface SaveRequest {
  /** 수정이면 기존 일정, 생성이면 undefined */
  original?: ScheduleEvent
  calendarId: string
  input: EventInput
}

export function useEventMutations() {
  const api = useApi()
  const queryClient = useQueryClient()
  const onSettled = () => queryClient.invalidateQueries({ queryKey: ['events'] })

  const save = useMutation({
    mutationFn: async ({ original, calendarId, input }: SaveRequest) => {
      if (!original) return api.createEvent(calendarId, input)
      let eventCalendarId = original.calendarId
      if (calendarId !== original.calendarId) {
        await api.moveEvent(original.calendarId, original.id, calendarId)
        eventCalendarId = calendarId
      }
      return api.updateEvent(eventCalendarId, original.id, input)
    },
    onSettled,
  })

  const reschedule = useMutation({
    mutationFn: ({ event, start, end, allDay }: { event: ScheduleEvent; start: Date; end: Date; allDay: boolean }) =>
      api.updateEvent(event.calendarId, event.id, { start, end, allDay }),
    onSettled,
  })

  const remove = useMutation({
    mutationFn: (event: ScheduleEvent) => api.deleteEvent(event.calendarId, event.id),
    onSettled,
  })

  return { save, reschedule, remove }
}
