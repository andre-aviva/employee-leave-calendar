import { useEffect, useState } from 'react'

export function App() {
  const [health, setHealth] = useState('checking…')
  const [leaveTypes, setLeaveTypes] = useState('checking…')

  useEffect(() => {
    fetch('/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { status: string }) => setHealth(`healthy (${body.status})`))
      .catch((e) => setHealth(`unreachable (${e})`))

    // /api/leave-types requires auth; a 401 still proves the /api proxy reaches the backend.
    fetch('/api/leave-types')
      .then((r) =>
        setLeaveTypes(
          r.status === 401 ? 'reachable (401 — sign-in required)' : `reachable (${r.status})`,
        ),
      )
      .catch((e) => setLeaveTypes(`unreachable (${e})`))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', lineHeight: 1.6 }}>
      <h1>Employee Leave Calendar</h1>
      <p data-test="App_HealthStatus">API health: {health}</p>
      <p data-test="App_LeaveTypesStatus">Leave-types endpoint: {leaveTypes}</p>
      <p>
        Minimal wiring check. The full UI is built by the frontend team — see{' '}
        <code>src/frontend/README.md</code>.
      </p>
    </main>
  )
}
