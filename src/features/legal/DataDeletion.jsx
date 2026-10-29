import LegalLayout, { CONTACT_EMAIL, LegalSection } from './LegalLayout'

export default function DataDeletion() {
  return (
    <LegalLayout title="คำแนะนำการลบข้อมูลผู้ใช้">
      <p className="text-[15px] leading-7 text-slate-700">
        หากคุณเคยติดต่อเราผ่าน Facebook Messenger หรือเว็บไซต์ และต้องการให้เราลบข้อมูลของคุณ ทำได้ตามขั้นตอนด้านล่าง
      </p>

      <LegalSection title="วิธีขอลบข้อมูล">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            ส่งอีเมลมาที่{' '}
            <a className="text-blue-700 underline" href={`mailto:${CONTACT_EMAIL}?subject=ขอลบข้อมูลส่วนบุคคล`}>{CONTACT_EMAIL}</a>{' '}
            หัวข้อ “ขอลบข้อมูลส่วนบุคคล” หรือพิมพ์ “ขอลบข้อมูล” ทาง Messenger ของเพจ
          </li>
          <li>ระบุชื่อบัญชี Facebook ที่ใช้ติดต่อเรา หรือเบอร์โทรศัพท์/อีเมลที่เคยให้ไว้ เพื่อให้เราค้นหาข้อมูลได้ถูกต้อง</li>
          <li>เราจะยืนยันตัวตนและลบข้อมูลภายใน 30 วัน แล้วแจ้งผลให้คุณทราบ</li>
        </ol>
      </LegalSection>

      <LegalSection title="ข้อมูลที่จะถูกลบ">
        <p>ประวัติการสนทนา Messenger ไฟล์แนบ และข้อมูลติดต่อที่เก็บไว้ในระบบของเรา</p>
        <p>
          ข้อความที่อยู่ในกล่องข้อความ Facebook ของคุณเองยังคงอยู่ในบัญชีของคุณ และคุณสามารถลบได้จากแอป Messenger โดยตรง
        </p>
      </LegalSection>

      <LegalSection title="ถอนสิทธิ์การเข้าถึงจาก Facebook">
        <p>
          คุณสามารถหยุดการส่งข้อความถึงเพจได้ทุกเมื่อ โดยเข้าไปที่การตั้งค่า Facebook &gt; การตั้งค่าและความเป็นส่วนตัว &gt; การตั้งค่า &gt;
          แอปและเว็บไซต์ แล้วลบแอปของเราออก
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
