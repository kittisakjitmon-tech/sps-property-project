import { lazy, Suspense } from 'react'
const AdminBlogs = lazy(() => import('../admin/AdminBlogs'))
export default function AdminBlogsRoute() { return <Suspense fallback={null}><AdminBlogs /></Suspense> }
