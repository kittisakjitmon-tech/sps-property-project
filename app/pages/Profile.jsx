import PageLayout from '../components/PageLayout'

export default function Profile() {
  return (
    <PageLayout heroTitle="โปรไฟล์สมาชิก" heroSubtitle="" showHero={false}>
      <div className="min-h-[60vh] bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h1 className="text-2xl font-bold text-blue-900">โปรไฟล์สมาชิก</h1>
            <p className="mt-2 text-slate-600">
              ระบบโปรไฟล์พร้อมใช้งานแล้ว คุณสามารถเข้าใช้งานหน้านี้ได้ตามปกติ
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
