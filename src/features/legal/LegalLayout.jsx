export const COMPANY_NAME = 'SPS Property Solution'
export const CONTACT_EMAIL = 'propertysommai@gmail.com'
export const EFFECTIVE_DATE = '29 ตุลาคม 2569'

export function LegalSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-blue-900">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-slate-700">{children}</div>
    </section>
  )
}

export default function LegalLayout({ title, children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <p className="text-sm font-medium text-blue-700">{COMPANY_NAME}</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="text-sm text-slate-500">มีผลตั้งแต่วันที่ {EFFECTIVE_DATE}</p>
        </header>
        {children}
        <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          ติดต่อเรา: <a className="text-blue-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </footer>
      </article>
    </main>
  )
}
