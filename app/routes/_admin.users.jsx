import { lazy, Suspense } from 'react'
const UserManagement = lazy(() => import('../admin/UserManagement'))
export default function UsersRoute() { return <Suspense fallback={null}><UserManagement /></Suspense> }
