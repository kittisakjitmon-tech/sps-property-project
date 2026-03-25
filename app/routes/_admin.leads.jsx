import { lazy, Suspense } from 'react'
const LeadsInbox = lazy(() => import('../admin/LeadsInbox'))
export default function LeadsRoute() { return <Suspense fallback={null}><LeadsInbox /></Suspense> }
