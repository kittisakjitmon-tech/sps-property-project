import { lazy, Suspense } from 'react'
const ActivityLogsPage = lazy(() => import('../admin/ActivityLogsPage'))
export default function ActivitiesRoute() { return <Suspense fallback={null}><ActivityLogsPage /></Suspense> }
