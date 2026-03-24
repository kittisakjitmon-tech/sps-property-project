import { lazy, Suspense } from 'react'
const Dashboard = lazy(() => import('../admin/Dashboard'))
export default function DashboardRoute() { return <Suspense fallback={null}><Dashboard /></Suspense> }
