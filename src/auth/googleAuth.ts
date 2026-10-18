const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/calendar'
const STORAGE_KEY = 'gcal-token'
// 만료 직전 토큰으로 요청이 실패하지 않도록 여유를 둔다
const EXPIRY_MARGIN_MS = 60_000

export const clientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID

interface StoredToken {
  value: string
  expiresAt: number
}

let token: StoredToken | null = loadToken()
let tokenClient: google.accounts.oauth2.TokenClient | null = null
let scriptPromise: Promise<void> | null = null
let inFlight: Promise<string> | null = null
let settle: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null

function loadToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredToken) : null
  } catch {
    return null
  }
}

function saveToken(t: StoredToken | null) {
  token = t
  try {
    if (t) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소를 쓸 수 없어도 메모리 토큰으로 동작한다
  }
}

function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = GIS_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      scriptPromise = null
      reject(new Error('Google 로그인 스크립트를 불러오지 못했습니다.'))
    }
    document.head.appendChild(el)
  })
  return scriptPromise
}

async function getTokenClient() {
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID 가 설정되지 않았습니다. README 를 참고하세요.')
  await loadScript()
  tokenClient ??= google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) {
        settle?.reject(new Error(resp.error_description || resp.error))
      } else {
        saveToken({ value: resp.access_token, expiresAt: Date.now() + Number(resp.expires_in) * 1000 })
        settle?.resolve(resp.access_token)
      }
      settle = null
    },
    error_callback: (err) => {
      settle?.reject(new Error(err.message || '로그인이 취소되었습니다.'))
      settle = null
    },
  })
  return tokenClient
}

export function hasValidToken() {
  return token !== null && token.expiresAt - EXPIRY_MARGIN_MS > Date.now()
}

/**
 * 토큰 요청. prompt '' 는 이미 동의한 사용자라면 조용히 재발급한다.
 * 동시에 여러 번 호출돼도 팝업은 한 번만 뜬다.
 */
export function requestToken(prompt: '' | 'consent' | 'select_account' = ''): Promise<string> {
  inFlight ??= getTokenClient()
    .then(
      (client) =>
        new Promise<string>((resolve, reject) => {
          settle = { resolve, reject }
          client.requestAccessToken({ prompt })
        }),
    )
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

export async function getAccessToken(): Promise<string> {
  if (hasValidToken()) return token!.value
  return requestToken('')
}

export function invalidateToken() {
  saveToken(null)
}

export function signOut() {
  if (token && typeof google !== 'undefined') google.accounts.oauth2.revoke(token.value, () => {})
  saveToken(null)
}
