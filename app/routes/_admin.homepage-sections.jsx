import { lazy, Suspense } from 'react'
const HomepageSectionsAdmin = lazy(() => import('../admin/HomepageSectionsAdmin'))
export default function HomepageSectionsRoute() { return <Suspense fallback={null}><HomepageSectionsAdmin /></Suspense> }
