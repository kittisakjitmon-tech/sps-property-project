import { lazy, Suspense } from 'react'
const HeroSlidesAdmin = lazy(() => import('../admin/HeroSlidesAdmin'))
export default function HeroSlidesRoute() { return <Suspense fallback={null}><HeroSlidesAdmin /></Suspense> }
