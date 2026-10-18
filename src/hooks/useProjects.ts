import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useApi } from '../api/ApiContext'
import type { Project } from '../api/types'

const STORAGE_KEY = 'project-visibility'

// 사용자가 직접 켜고 끈 캘린더만 저장한다. 나머지는 기본값(쓰기 가능하면 표시)을 따른다.
function loadOverrides(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function useProjects() {
  const api = useApi()
  const query = useQuery({ queryKey: ['projects'], queryFn: () => api.listProjects() })
  const [overrides, setOverrides] = useState(loadOverrides)

  const projects = useMemo(() => query.data ?? [], [query.data])

  const isVisible = useCallback((p: Project) => overrides[p.id] ?? p.writable, [overrides])

  const toggle = useCallback((p: Project) => {
    setOverrides((prev) => {
      const next = { ...prev, [p.id]: !(prev[p.id] ?? p.writable) }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // 저장 실패 시 이번 세션에만 반영
      }
      return next
    })
  }, [])

  const visibleProjects = useMemo(() => projects.filter(isVisible), [projects, isVisible])
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  return { query, projects, visibleProjects, projectById, isVisible, toggle }
}

export type ProjectsState = ReturnType<typeof useProjects>
