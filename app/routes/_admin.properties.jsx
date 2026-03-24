import { lazy, Suspense } from 'react'
const PropertyListPage = lazy(() => import('../admin/PropertyListPage'))
export default function AdminPropertiesRoute() { return <Suspense fallback={null}><PropertyListPage /></Suspense> }
