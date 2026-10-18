import type { EventInput as FcEventInput, EventChangeArg } from '@fullcalendar/core'
import koLocale from '@fullcalendar/core/locales/ko'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useMemo, useState } from 'react'
import type { Project, ScheduleEvent } from '../api/types'
import { useEventMutations, useEvents } from '../hooks/useEvents'
import type { DateRange } from '../lib/dates'
import type { DialogRequest } from './EventDialog'

interface Props {
  projects: Project[]
  projectById: Map<string, Project>
  onOpenDialog: (req: DialogRequest) => void
  onError: (message: string) => void
}

const fcId = (e: ScheduleEvent) => `${e.calendarId}::${e.id}`

export function CalendarView({ projects, projectById, onOpenDialog, onError }: Props) {
  const [range, setRange] = useState<DateRange | null>(null)
  const { events } = useEvents(projects, range)
  const { reschedule } = useEventMutations()

  const byId = useMemo(() => new Map(events.map((e) => [fcId(e), e])), [events])
  const fcEvents = useMemo<FcEventInput[]>(
    () =>
      events.map((e) => {
        const p = projectById.get(e.calendarId)
        return {
          id: fcId(e),
          title: e.title,
          start: e.start,
          end: e.end,
          allDay: e.allDay,
          backgroundColor: p?.color,
          borderColor: p?.color,
          textColor: p?.textColor,
          editable: p?.writable ?? false,
        }
      }),
    [events, projectById],
  )

  const handleChange = (arg: EventChangeArg) => {
    const event = byId.get(arg.event.id)
    const { start, end, allDay } = arg.event
    if (!event || !start) return arg.revert()
    // 종료가 없으면 FullCalendar 기본 길이(종일 1일 / 시간 1시간)를 적용
    const fallbackEnd = new Date(start.getTime() + (allDay ? 86_400_000 : 3_600_000))
    reschedule.mutate(
      { event, start, end: end ?? fallbackEnd, allDay },
      {
        onError: (err) => {
          arg.revert()
          onError(`일정 이동 실패: ${err.message}`)
        },
      },
    )
  }

  return (
    <div className="calendar-view">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={koLocale}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
        height="100%"
        nowIndicator
        selectable
        selectMirror
        dayMaxEvents
        events={fcEvents}
        datesSet={(arg) => setRange({ from: arg.start, to: arg.end })}
        select={(arg) => {
          arg.view.calendar.unselect()
          onOpenDialog({ kind: 'create', start: arg.start, end: arg.end, allDay: arg.allDay })
        }}
        eventClick={(arg) => {
          const event = byId.get(arg.event.id)
          if (event) onOpenDialog({ kind: 'edit', event })
        }}
        eventDrop={handleChange}
        eventResize={handleChange}
      />
    </div>
  )
}
