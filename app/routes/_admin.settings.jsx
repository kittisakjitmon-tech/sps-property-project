import { lazy, Suspense } from 'react'
const Settings = lazy(() => import('../admin/Settings'))
export default function SettingsRoute() { return <Suspense fallback={null}><Settings /></Suspense> }
