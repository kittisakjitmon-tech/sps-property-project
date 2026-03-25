import { lazy, Suspense } from 'react'
const PendingProperties = lazy(() => import('../admin/PendingProperties'))
export default function PendingPropertiesRoute() { return <Suspense fallback={null}><PendingProperties /></Suspense> }
