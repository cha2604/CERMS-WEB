import { StrictMode, Component, Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

const App = lazy(() => import('./App.tsx'))

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_ADMIN_DOMAIN',
  'VITE_USER_DOMAIN',
]

function SetupNotice({ message }: { message: string }) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !import.meta.env[name])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5 font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-lg font-black text-slate-900">
          Setup required
        </h1>

        <p className="mt-2 text-sm font-semibold text-slate-600">{message}</p>

        {missing.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-amber-800">
              Missing environment variables
            </p>

            <ul className="mt-2 space-y-1">
              {missing.map((name) => (
                <li
                  key={name}
                  className="text-xs font-bold font-mono text-amber-900"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs font-semibold text-slate-500 leading-relaxed">
          Add these in Vercel under Project → Settings → Environment Variables
          (tick both Production and Preview), then redeploy. They are baked in at
          build time, so editing them without redeploying has no effect.
        </p>
      </div>
    </div>
  )
}

class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <SetupNotice message={this.state.error.message} />
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupErrorBoundary>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />
            </div>
          }
        >
          <App />
        </Suspense>
      </BrowserRouter>
    </StartupErrorBoundary>
  </StrictMode>,
)