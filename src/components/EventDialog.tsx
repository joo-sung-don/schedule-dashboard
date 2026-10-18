import { addDays, addHours, format, parseISO, setHours, startOfDay } from 'date-fns'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { EventInput, Project, ScheduleEvent } from '../api/types'
import { useEventMutations } from '../hooks/useEvents'
import { lastDayOf } from '../lib/dates'

export type DialogRequest =
  | { kind: 'create'; start: Date; end: Date; allDay: boolean; calendarId?: string }
  | { kind: 'edit'; event: ScheduleEvent }

interface Props {
  request: DialogRequest
  projects: Project[]
  projectById: Map<string, Project>
  onClose: () => void
}

interface FormState {
  title: string
  description: string
  calendarId: string
  allDay: boolean
  /** 종일이면 yyyy-MM-dd, 아니면 yyyy-MM-ddTHH:mm. 종일의 end 는 마지막 날(포함) */
  start: string
  end: string
}

const DATE = 'yyyy-MM-dd'
const DATETIME = "yyyy-MM-dd'T'HH:mm"

function toFormTimes(start: Date, end: Date, allDay: boolean) {
  return allDay
    ? { start: format(start, DATE), end: format(lastDayOf({ start, end }), DATE) }
    : { start: format(start, DATETIME), end: format(end, DATETIME) }
}

function initialState(req: DialogRequest, writable: Project[]): FormState {
  if (req.kind === 'edit') {
    const e = req.event
    return { title: e.title, description: e.description, calendarId: e.calendarId, allDay: e.allDay, ...toFormTimes(e.start, e.end, e.allDay) }
  }
  const calendarId = req.calendarId ?? (writable.find((p) => p.primary) ?? writable[0])?.id ?? ''
  return { title: '', description: '', calendarId, allDay: req.allDay, ...toFormTimes(req.start, req.end, req.allDay) }
}

function toInput(f: FormState): EventInput | string {
  const start = parseISO(f.start)
  const endRaw = parseISO(f.end)
  if (!f.title.trim()) return '제목을 입력하세요.'
  if (isNaN(start.getTime()) || isNaN(endRaw.getTime())) return '날짜를 확인하세요.'
  const end = f.allDay ? addDays(endRaw, 1) : endRaw
  if (end <= start) return '종료가 시작보다 늦어야 합니다.'
  return { title: f.title.trim(), description: f.description, start, end, allDay: f.allDay }
}

export function EventDialog({ request, projects, projectById, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const writable = projects.filter((p) => p.writable)
  const [form, setForm] = useState(() => initialState(request, writable))
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { save, remove } = useEventMutations()

  const original = request.kind === 'edit' ? request.event : undefined
  const project = projectById.get(form.calendarId)
  const readOnly = original ? !projectById.get(original.calendarId)?.writable : false
  const busy = save.isPending || remove.isPending

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const toggleAllDay = (allDay: boolean) => {
    setForm((f) => {
      const start = parseISO(f.start)
      const end = parseISO(f.end)
      if (allDay) return { ...f, allDay, start: format(start, DATE), end: format(end, DATE) }
      // 종일 → 시간: 시작일 09:00 부터 1시간
      const s = setHours(startOfDay(start), 9)
      return { ...f, allDay, start: format(s, DATETIME), end: format(addHours(s, 1), DATETIME) }
    })
  }

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    const input = toInput(form)
    if (typeof input === 'string') return setError(input)
    setError(null)
    save.mutate({ original, calendarId: form.calendarId, input }, { onSuccess: onClose, onError: (e) => setError(e.message) })
  }

  const handleDelete = () => {
    if (!original) return
    if (!confirmDelete) return setConfirmDelete(true)
    remove.mutate(original, { onSuccess: onClose, onError: (e) => setError(e.message) })
  }

  return (
    <dialog ref={ref} className="event-dialog" onClose={onClose} onCancel={onClose}>
      <form onSubmit={handleSubmit}>
        <header>
          <span className="swatch" style={{ background: project?.color }} aria-hidden />
          <h2>{original ? (readOnly ? '일정 보기' : '일정 수정') : '새 일정'}</h2>
          <button type="button" className="icon" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <fieldset disabled={readOnly || busy}>
          <label>
            제목
            <input autoFocus value={form.title} onChange={(e) => update('title', e.target.value)} required />
          </label>

          <label>
            프로젝트
            <select
              value={form.calendarId}
              onChange={(e) => update('calendarId', e.target.value)}
              disabled={original?.recurring}
            >
              {(readOnly ? projects : writable).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={form.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
            종일
          </label>

          <div className="row">
            <label>
              시작
              <input type={form.allDay ? 'date' : 'datetime-local'} value={form.start} onChange={(e) => update('start', e.target.value)} required />
            </label>
            <label>
              {form.allDay ? '종료일' : '종료'}
              <input type={form.allDay ? 'date' : 'datetime-local'} value={form.end} onChange={(e) => update('end', e.target.value)} required />
            </label>
          </div>

          <label>
            메모
            <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </label>
        </fieldset>

        {readOnly && <p className="note">읽기 전용 캘린더의 일정입니다.</p>}
        {original?.recurring && !readOnly && <p className="note">반복 일정입니다. 이 회차만 수정되며 프로젝트는 바꿀 수 없습니다.</p>}
        {error && <p className="error" role="alert">{error}</p>}

        <footer>
          {original?.htmlLink && (
            <a href={original.htmlLink} target="_blank" rel="noreferrer">Google Calendar에서 열기</a>
          )}
          <span className="spacer" />
          {original && !readOnly && (
            <button type="button" className="danger" onClick={handleDelete} disabled={busy}>
              {confirmDelete ? '정말 삭제' : '삭제'}
            </button>
          )}
          {!readOnly && (
            <button type="submit" className="primary" disabled={busy || writable.length === 0}>
              {save.isPending ? '저장 중…' : '저장'}
            </button>
          )}
        </footer>
      </form>
    </dialog>
  )
}
