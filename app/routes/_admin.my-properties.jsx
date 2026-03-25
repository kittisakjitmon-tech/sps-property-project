import { lazy, Suspense } from 'react'
const MyProperties = lazy(() => import('../admin/MyProperties'))
export default function MyPropertiesRoute() { return <Suspense fallback={null}><MyProperties /></Suspense> }
