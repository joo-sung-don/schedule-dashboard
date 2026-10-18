import { QueryCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'
import { ApiContext } from './api/ApiContext'
import { googleCalendarApi } from './api/calendar'
import { demoCalendarApi } from './api/demo'
import { hasValidToken, requestToken, signOut } from './auth/googleAuth'
import { AgendaView } from './components/AgendaView'
import { EventDialog, type DialogRequest } from './components/EventDialog'
import { LoginScreen } from './components/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { TimelineView } from './components/TimelineView'
import { useProjects } from './hooks/useProjects'

// FullCalendar 는 용량이 커서 캘린더 탭을 열 때 불러온다
const CalendarView = lazy(() => import('./components/CalendarView').then((m) => ({ default: m.CalendarView })))

type Mode = 'signedOut' | 'google' | 'demo'
type View = 'agenda' | 'calendar' | 'timeline'

const VIEWS: { id: View; label: string }[] = [
  { id: 'agenda', label: '오늘·다가오는 일정' },
  { id: 'calendar', label: '캘린더' },
  { id: 'timeline', label: '타임라인' },
]

// 쿼리 실패를 상단 배너로 알리기 위한 전역 리스너
let reportError: (message: string) => void = () => {}

function initialMode(): Mode {
  if (new URLSearchParams(location.search).has('demo')) return 'demo'
  return hasValidToken() ? 'google' : 'signedOut'
}

function loadView(): View {
  try {
    const v = localStorage.getItem('view')
    if (VIEWS.some((x) => x.id === v)) return v as View
  } catch {
    // 기본값 사용
  }
  return 'agenda'
}

export default function App() {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: (e) => reportError(e.message) }),
        defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: true } },
      }),
  )

  if (mode === 'signedOut') {
    return <LoginScreen onGoogle={() => setMode('google')} onDemo={() => setMode('demo')} />
  }

  const handleSignOut = () => {
    if (mode === 'google') signOut()
    queryClient.clear()
    setMode('signedOut')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={mode === 'google' ? googleCalendarApi : demoCalendarApi}>
        <Dashboard demo={mode === 'demo'} onSignOut={handleSignOut} />
      </ApiContext.Provider>
    </QueryClientProvider>
  )
}

function Dashboard({ demo, onSignOut }: { demo: boolean; onSignOut: () => void }) {
  const projectsState = useProjects()
  const { projects, visibleProjects, projectById } = projectsState
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>(loadView)
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    reportError = setBanner
    return () => {
      reportError = () => {}
    }
  }, [])

  const changeView = (v: View) => {
    setView(v)
    try {
      localStorage.setItem('view', v)
    } catch {
      // 저장 실패는 무시
    }
  }

  const reconnect = async () => {
    try {
      await requestToken('')
      setBanner(null)
      queryClient.invalidateQueries()
    } catch (e) {
      setBanner((e as Error).message)
    }
  }

  const newEvent = () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    setDialog({ kind: 'create', start, end: new Date(start.getTime() + 86_400_000), allDay: true })
  }

  const viewProps = { projects: visibleProjects, projectById, onOpenDialog: setDialog }

  return (
    <div className="app">
      <header className="topbar">
        <h1>스케줄 대시보드{demo && <span className="badge">데모</span>}</h1>
        <nav className="tabs" aria-label="보기 전환">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => changeView(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button type="button" className="primary" onClick={newEvent} disabled={!projects.some((p) => p.writable)}>
            + 새 일정
          </button>
          <button type="button" onClick={onSignOut}>{demo ? '나가기' : '로그아웃'}</button>
        </div>
      </header>

      {banner && (
        <div className="banner" role="alert">
          <span>{banner}</span>
          {!demo && <button type="button" onClick={reconnect}>다시 연결</button>}
          <button type="button" className="icon" onClick={() => setBanner(null)} aria-label="닫기">×</button>
        </div>
      )}

      <div className="body">
        <Sidebar {...projectsState} />
        <main className="content">
          {view === 'agenda' && <AgendaView {...viewProps} />}
          {view === 'calendar' && (
            <Suspense fallback={<p className="muted">캘린더 불러오는 중…</p>}>
              <CalendarView {...viewProps} onError={setBanner} />
            </Suspense>
          )}
          {view === 'timeline' && <TimelineView {...viewProps} />}
        </main>
      </div>

      {dialog && (
        <EventDialog request={dialog} projects={projects} projectById={projectById} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}
