import { addDays, addMonths, differenceInCalendarDays, format, isWeekend, startOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useMemo, useState, type CSSProperties } from 'react'
import type { Project, ScheduleEvent } from '../api/types'
import { useEvents } from '../hooks/useEvents'
import { durationDays, lastDayOf } from '../lib/dates'
import { layoutBars } from '../lib/timeline'
import type { DialogRequest } from './EventDialog'

const SPANS = [
  { months: 1, label: '1개월', dayWidth: 36, labelCols: 4 },
  { months: 3, label: '3개월', dayWidth: 16, labelCols: 9 },
] as const

function periodLabel(e: ScheduleEvent) {
  return e.allDay
    ? `${format(e.start, 'M/d')} – ${format(lastDayOf(e), 'M/d')}`
    : `${format(e.start, 'M/d HH:mm')} – ${format(e.end, 'M/d HH:mm')}`
}

interface Props {
  projects: Project[]
  onOpenDialog: (req: DialogRequest) => void
}

export function TimelineView({ projects, onOpenDialog }: Props) {
  const [today] = useState(() => new Date())
  const [anchor, setAnchor] = useState(() => startOfMonth(today))
  const [spanIndex, setSpanIndex] = useState(0)
  // 타임라인은 프로젝트 단계를 보는 화면이라 짧은 회의는 기본으로 숨긴다
  const [showTimed, setShowTimed] = useState(false)
  const span = SPANS[spanIndex]

  const range = useMemo(() => ({ from: anchor, to: addMonths(anchor, span.months) }), [anchor, span.months])
  const days = differenceInCalendarDays(range.to, range.from)
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(range.from, i)), [range.from, days])
  const todayCol = differenceInCalendarDays(today, range.from)

  const { events, isFetching } = useEvents(projects, range)
  const rows = useMemo(() => {
    const byProject = new Map<string, ScheduleEvent[]>()
    for (const e of events) {
      if (!showTimed && !e.allDay && durationDays(e) === 1) continue
      byProject.set(e.calendarId, [...(byProject.get(e.calendarId) ?? []), e])
    }
    return projects.map((p) => ({
      project: p,
      ...layoutBars(byProject.get(p.id) ?? [], range.from, days, span.labelCols),
    }))
  }, [events, projects, range.from, days, showTimed, span.labelCols])

  const gridStyle = { '--days': days, '--day-w': `${span.dayWidth}px` } as CSSProperties
  const title =
    span.months === 1
      ? format(range.from, 'yyyy년 M월', { locale: ko })
      : `${format(range.from, 'yyyy년 M월', { locale: ko })} – ${format(addDays(range.to, -1), 'M월', { locale: ko })}`

  return (
    <div className="timeline-view">
      <div className="toolbar">
        <div className="btn-group">
          <button type="button" onClick={() => setAnchor((a) => addMonths(a, -1))} aria-label="이전 달">‹</button>
          <button type="button" onClick={() => setAnchor((a) => addMonths(a, 1))} aria-label="다음 달">›</button>
          <button type="button" onClick={() => setAnchor(startOfMonth(today))}>오늘</button>
        </div>
        <h2>
          {title}
          {isFetching && <span className="muted"> · 불러오는 중</span>}
        </h2>
        <label className="toggle">
          <input type="checkbox" checked={showTimed} onChange={(e) => setShowTimed(e.target.checked)} />
          하루 안의 시간 일정 표시
        </label>
        <div className="btn-group" role="group" aria-label="표시 기간">
          {SPANS.map((s, i) => (
            <button key={s.label} type="button" aria-pressed={i === spanIndex} onClick={() => setSpanIndex(i)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-scroll">
        <div className="timeline-grid" style={gridStyle}>
          <div className="tl-corner">프로젝트</div>
          <div className="tl-days">
            {dates.map((d, i) => (
              <div key={i} className={`tl-day${isWeekend(d) ? ' is-weekend' : ''}${i === todayCol ? ' is-today' : ''}`}>
                {(d.getDate() === 1 || i === 0) && <span className="tl-month">{format(d, 'M월')}</span>}
                <span className="tl-date">{d.getDate()}</span>
                {span.dayWidth >= 30 && <span className="tl-weekday">{format(d, 'EEEEE', { locale: ko })}</span>}
              </div>
            ))}
          </div>

          {rows.map(({ project, bars, laneCount }) => (
            <div key={project.id} className="tl-row">
              <div className="tl-label">
                <span className="swatch" style={{ background: project.color }} aria-hidden />
                {project.name}
              </div>
              <div className="tl-lanes" style={{ '--lanes': laneCount } as CSSProperties}>
                {dates.map((d, i) => (
                  <div
                    key={i}
                    className={`tl-cell${isWeekend(d) ? ' is-weekend' : ''}`}
                    style={{ gridColumn: i + 1 }}
                    onDoubleClick={() =>
                      project.writable &&
                      onOpenDialog({ kind: 'create', start: d, end: addDays(d, 1), allDay: true, calendarId: project.id })
                    }
                  />
                ))}
                {todayCol >= 0 && todayCol < days && <div className="tl-today" style={{ gridColumn: todayCol + 1 }} />}
                {bars.map((bar) => {
                  // 하루짜리는 마커 + 라벨(마일스톤)로, 여러 날은 막대로 그린다
                  const milestone = bar.span === 1 && !bar.continuesBefore && !bar.continuesAfter
                  return (
                    <button
                      key={bar.event.id}
                      type="button"
                      className={`tl-bar${milestone ? ' is-milestone' : ''}${bar.continuesBefore ? ' cont-before' : ''}${bar.continuesAfter ? ' cont-after' : ''}`}
                      style={{
                        gridColumn: `${bar.startCol + 1} / span ${bar.span}`,
                        gridRow: bar.lane + 1,
                        background: project.color,
                        color: project.textColor,
                      }}
                      title={`${bar.event.title}\n${periodLabel(bar.event)}`}
                      onClick={() => onOpenDialog({ kind: 'edit', event: bar.event })}
                    >
                      {milestone && (
                        <span className={`marker${bar.event.allDay ? '' : ' is-timed'}`} style={{ background: project.color }} />
                      )}
                      {bar.event.title}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="empty tl-empty">표시할 프로젝트를 왼쪽에서 선택하세요.</p>}
        </div>
      </div>
      <p className="hint">막대를 클릭하면 수정, 빈 칸을 더블클릭하면 그 날짜에 종일 일정을 추가합니다.</p>
    </div>
  )
}
