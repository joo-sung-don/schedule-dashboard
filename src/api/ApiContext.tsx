import { createContext, useContext } from 'react'
import type { CalendarApi } from './calendar'

export const ApiContext = createContext<CalendarApi | null>(null)

export function useApi(): CalendarApi {
  const api = useContext(ApiContext)
  if (!api) throw new Error('ApiContext 가 설정되지 않았습니다.')
  return api
}
