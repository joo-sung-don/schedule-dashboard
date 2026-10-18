import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import type { Project, ScheduleEvent } from '../api/types'
import { useEvents } from '../hooks/useEvents'
import { durationDays, groupByDay, isOngoing } from '../lib/dates'
import type { DialogRequest } from './EventDialog'

const DAYS = 7

interface Props {
  projects: Project[]
  projectById: Map<string, Project>
  onOpenDialog: (req: DialogRequest) => void
  now?: Date
}

export function AgendaView({ projects, projectById, onOpenDialog, now: nowProp }: Props) {
  // 렌더마다 범위가 바뀌어 쿼리 키가 흔들리지 않도록 마운트 시점에 고정
  const [now] = useState(() => nowProp ?? new Date())
  const range = useMemo(() => ({ from: startOfDay(now), to: addDays(startOfDay(now), DAYS) }), [now])
  const { events, isFetching } = useEvents(projects, range)
  const days = useMemo(() => groupByDay(events, now, DAYS), [events, now])

  const today = days[0]?.events ?? []
  const ongoing = today.filter((e) => isOngoing(e, now))
  const upcoming = new Set(days.flatMap((d) => d.events)).size

  const timeLabel = (e: ScheduleEvent, day: Date) => {
    if (e.allDay) {
      const total = durationDays(e)
      if (total <= 1) return '종일'
      const nth = differenceInCalendarDays(day, e.start) + 1
      return `종일 · ${nth}/${total}일차`
    }
    const startLabel = isSameDay(e.start, day) ? format(e.start, 'HH:mm') : '…'
    const endLabel = isSameDay(e.end, day) ? format(e.end, 'HH:mm') : '…'
    return `${startLabel} – ${endLabel}`
  }

  return (
    <div className="agenda-view">
      <section className="stats" aria-label="요약">
        <div className="stat">
          <span className="stat-value">{today.length}</span>
          <span className="stat-label">오늘 일정</span>
        </div>
        <div className="stat">
          <span className="stat-value">{ongoing.length}</span>
          <span className="stat-label">진행 중</span>
        </div>
        <div className="stat">
          <span className="stat-value">{upcoming}</span>
          <span className="stat-label">앞으로 {DAYS}일</span>
        </div>
        <div className="stat">
          <span className="stat-value">{projects.length}</span>
          <span className="stat-label">표시 중인 프로젝트</span>
        </div>
      </section>

      {days.map(({ date, events: dayEvents }, i) => (
        <section key={date.toISOString()} className={`agenda-day${i === 0 ? ' is-today' : ''}`}>
          <h2>
            {i === 0 ? '오늘' : i === 1 ? '내일' : format(date, 'EEEE', { locale: ko })}
            <span className="agenda-date">{format(date, 'M월 d일 (EEE)', { locale: ko })}</span>
          </h2>
          {dayEvents.length === 0 ? (
            <p className="empty">{isFetching ? '불러오는 중…' : '일정 없음'}</p>
          ) : (
            <ul>
              {dayEvents.map((e) => {
                const p = projectById.get(e.calendarId)
                return (
                  <li key={`${e.calendarId}::${e.id}`}>
                    <button
                      type="button"
                      className={`agenda-item${i === 0 && isOngoing(e, now) ? ' is-ongoing' : ''}`}
                      onClick={() => onOpenDialog({ kind: 'edit', event: e })}
                    >
                      <span className="agenda-time">{timeLabel(e, date)}</span>
                      <span className="agenda-swatch" style={{ background: p?.color }} aria-hidden />
                      <span className="agenda-title">{e.title}</span>
                      <span className="agenda-project">{p?.name}</span>
                      {i === 0 && isOngoing(e, now) && <span className="badge">진행 중</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
