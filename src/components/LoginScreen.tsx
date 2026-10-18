import { useState } from 'react'
import { clientId, requestToken } from '../auth/googleAuth'

interface Props {
  onGoogle: () => void
  onDemo: () => void
}

export function LoginScreen({ onGoogle, onDemo }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const signIn = async () => {
    setPending(true)
    setError(null)
    try {
      await requestToken('consent')
      onGoogle()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login">
      <div className="login-card">
        <h1>프로젝트 스케줄 대시보드</h1>
        <p>Google Calendar의 프로젝트별 캘린더를 한 화면에서 보고 관리합니다.</p>
        <button type="button" className="primary" onClick={signIn} disabled={!clientId || pending}>
          {pending ? '로그인 중…' : 'Google로 로그인'}
        </button>
        <button type="button" onClick={onDemo}>데모 데이터로 둘러보기</button>
        {!clientId && (
          <p className="note">
            <code>.env.local</code>에 <code>VITE_GOOGLE_CLIENT_ID</code>를 설정해야 Google 로그인을 쓸 수 있습니다. README의 설정 안내를 참고하세요.
          </p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </main>
  )
}
