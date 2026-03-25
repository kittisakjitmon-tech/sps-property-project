import { lazy, Suspense } from 'react'
const AdminLoanRequests = lazy(() => import('../admin/AdminLoanRequests'))
export default function LoanRequestsRoute() { return <Suspense fallback={null}><AdminLoanRequests /></Suspense> }
