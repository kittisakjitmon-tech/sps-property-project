import { lazy, Suspense } from 'react'
const PopularLocationsAdmin = lazy(() => import('../admin/PopularLocationsAdmin'))
export default function PopularLocationsRoute() { return <Suspense fallback={null}><PopularLocationsAdmin /></Suspense> }
