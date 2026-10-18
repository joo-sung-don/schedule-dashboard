import type { ProjectsState } from '../hooks/useProjects'

export function Sidebar({ query, projects, isVisible, toggle }: ProjectsState) {
  return (
    <aside className="sidebar">
      <h2>프로젝트</h2>
      {query.isLoading && <p className="muted">불러오는 중…</p>}
      {query.error && <p className="error">캘린더 목록을 불러오지 못했습니다.</p>}
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <label className="project-toggle">
              <input type="checkbox" checked={isVisible(p)} onChange={() => toggle(p)} />
              <span className="swatch" style={{ background: p.color }} aria-hidden />
              <span className="project-name">{p.name}</span>
              {!p.writable && <span className="muted small">읽기</span>}
            </label>
          </li>
        ))}
      </ul>
    </aside>
  )
}
