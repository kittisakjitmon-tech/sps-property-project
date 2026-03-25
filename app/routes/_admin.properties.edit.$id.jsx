import { lazy, Suspense } from 'react'
const PropertyForm = lazy(() => import('../admin/PropertyForm'))
export default function EditPropertyRoute() { return <Suspense fallback={null}><PropertyForm /></Suspense> }
