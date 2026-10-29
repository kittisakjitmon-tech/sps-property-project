import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, FileText, ImagePlus, LoaderCircle, MessageSquare, Paperclip, Plus, Send, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { PROPERTY_TYPES } from '../../constants/propertyTypes'
import MoneyInput from '../../components/ui/MoneyInput'
import { missingFields, draftToForm } from './propertyDraft'
import { listingContentIssues } from '../../lib/propertyContentRules'
import { usePropertyAssistant } from './usePropertyAssistant'
import CoverPhotoEditor from './CoverPhotoEditor'
import './ai-property.css'

const prompts = ['เลือกภาพหน้าบ้านที่ดีที่สุดของแต่ละแบบเป็นหน้าปก พร้อมบอกเหตุผลและเตรียมข้อความประกาศ', 'วิเคราะห์และแยกแบบบ้าน พร้อมราคา พื้นที่ และของแถมจากไฟล์นี้', 'มีข้อมูลช่องไหนที่ยังขาดหรือขัดแย้งกันบ้าง', 'ตั้งชื่อประกาศโดยไม่ใช้ชื่อโครงการ และใส่ทำเลไว้ท้ายชื่อ']
const fieldLabels = { title: 'ชื่อประกาศ', type: 'ประเภท', price: 'ราคาหลังส่วนลด', priceMax: 'ราคาสูงสุด', bedrooms: 'ห้องนอน', bathrooms: 'ห้องน้ำ', landAreaSqw: 'พื้นที่ดิน', usableAreaSqm: 'พื้นที่ใช้สอย', locationDisplay: 'ทำเล', project: 'โครงการ', bankPrice: 'ราคาก่อนส่วนลด', discountAmount: 'ส่วนลด' }

function ResetDialog({ onClose, onReset }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="ai-reset-title" className="ai-dialog"><h2 id="ai-reset-title">เริ่มข้อมูลชุดใหม่?</h2><p>ร่างและไฟล์ในหน้านี้จะถูกล้าง ทรัพย์ที่บันทึกแล้วจะยังอยู่</p><div><button autoFocus className="ai-secondary" onClick={onClose}>กลับไปทำต่อ</button><button className="ai-primary" onClick={onReset}><Trash2 size={16} />เริ่มชุดใหม่</button></div></dialog>
}

function Field({ name, label, value, onChange, numeric = false }) {
  return <label className="ai-field" htmlFor={`ai-${name}`}><span>{label}</span><input id={`ai-${name}`} type={numeric ? 'number' : 'text'} min={numeric ? '0' : undefined} step={numeric ? 'any' : undefined} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : numeric ? Number(e.target.value) : e.target.value)} placeholder="ยังไม่มีข้อมูล" /></label>
}

function PropertyReview({ property, files, onEdit, onTransfer, busy }) {
  const missing = missingFields(property)
  const contentIssues = listingContentIssues({ ...property, description: draftToForm(property).description })
  function change(name, value) {
    onEdit({ [name]: value, ...(name === 'imageIds' && !value.includes(property.coverImageId) ? { coverImageId: '', coverReason: '' } : {}), evidence: { ...property.evidence, [name]: 'ผู้ใช้แก้ไขในหน้าตรวจข้อมูล' } })
  }
  const images = files.filter(f => f.type.startsWith('image/'))
  return <>
    <div className="ai-review-heading"><div><span className="ai-eyebrow">ตรวจข้อมูลก่อนเข้าฟอร์ม</span><h2>{property.title || 'ร่างทรัพย์ที่ยังไม่มีชื่อ'}</h2></div><span className="ai-badge">ร่าง · ยังไม่บันทึก</span></div>
    {missing.length > 0 && <p className="ai-note">ยังขาด {missing.join(' · ')} — เติมที่นี่หรือบอก AI เพิ่มได้</p>}
    {contentIssues.length > 0 && <div className="ai-note"><strong>กฎการเขียนประกาศ</strong><ul>{contentIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    <fieldset className="ai-review-fields" disabled={busy}>
      <div className="ai-span-2"><Field name="title" label="ชื่อประกาศ" value={property.title} onChange={v => change('title', v || '')} /></div>
      <label className="ai-field" htmlFor="ai-type"><span>ประเภททรัพย์</span><select id="ai-type" value={property.type || ''} onChange={e => change('type', e.target.value)}><option value="">เลือกประเภท</option>{PROPERTY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      <Field name="project" label="ชื่อโครงการ (แยกจากชื่อประกาศ)" value={property.project} onChange={v => change('project', v || '')} />
      <label className="ai-field" htmlFor="ai-price"><span>ราคาหลังส่วนลด / ราคาเริ่มต้น (บาท)</span><MoneyInput id="ai-price" value={property.price ?? ''} onValueChange={v => change('price', v === '' ? null : Number(v))} /></label>
      <label className="ai-field" htmlFor="ai-price-max"><span>ราคาหลังส่วนลดสูงสุด (ถ้ามี)</span><MoneyInput id="ai-price-max" value={property.priceMax ?? ''} onValueChange={v => change('priceMax', v === '' ? null : Number(v))} /></label>
      <label className="ai-field" htmlFor="ai-bank-price"><span>ราคาหน้าสัญญา / ราคาประเมิน (ก่อนส่วนลด)</span><MoneyInput id="ai-bank-price" value={property.bankPrice ?? ''} onValueChange={v => change('bankPrice', v === '' ? null : Number(v))} /></label>
      <label className="ai-field" htmlFor="ai-discount"><span>ส่วนลดที่ระบุในเอกสาร (บาท)</span><MoneyInput id="ai-discount" value={property.discountAmount ?? ''} onValueChange={v => change('discountAmount', v === '' ? null : Number(v))} /></label>
      <p className="ai-muted ai-span-2">ราคาที่ใช้ประกาศคือราคาหลังหักส่วนลดแล้ว ราคาก่อนส่วนลดเก็บในช่องราคาหน้าสัญญา ห้ามหักส่วนลดซ้ำหรือใช้ราคาคนละแปลง</p>
      <label className="ai-check ai-span-2"><input type="checkbox" checked={property.showPrice !== false} onChange={e => change('showPrice', e.target.checked)} />แสดงราคาเต็มบนหน้าเว็บ</label>
      <Field numeric name="bedrooms" label="ห้องนอน" value={property.bedrooms} onChange={v => change('bedrooms', v)} />
      <Field numeric name="bathrooms" label="ห้องน้ำ" value={property.bathrooms} onChange={v => change('bathrooms', v)} />
      <Field numeric name="land-area" label="พื้นที่ดิน (ตารางวา)" value={property.landAreaSqw} onChange={v => change('landAreaSqw', v)} />
      <Field numeric name="usable-area" label="พื้นที่ใช้สอย (ตารางเมตร)" value={property.usableAreaSqm} onChange={v => change('usableAreaSqm', v)} />
      <div className="ai-span-2"><Field name="location" label="ทำเลที่แสดงท้ายประกาศ" value={property.locationDisplay} onChange={v => change('locationDisplay', v || '')} /></div>
      <label className="ai-field" htmlFor="ai-deal"><span>ประเภทการดีล</span><select id="ai-deal" value={property.listingType || ''} onChange={e => change('listingType', e.target.value)}><option value="">รอยืนยัน</option><option value="sale">ขาย</option><option value="rent">เช่า</option></select></label>
      <label className="ai-field" htmlFor="ai-condition"><span>สภาพบ้าน</span><select id="ai-condition" value={property.propertyCondition || ''} onChange={e => change('propertyCondition', e.target.value)}><option value="">รอยืนยัน</option><option>มือ 1</option><option>มือ 2</option></select></label>
      <label className="ai-field ai-span-2" htmlFor="ai-description"><span>รายละเอียดทรัพย์</span><textarea id="ai-description" rows={5} value={property.description || ''} onChange={e => change('description', e.target.value)} placeholder="AI จะเตรียมรายละเอียดจากข้อมูลที่ให้" /></label>
      <div className="ai-span-2 ai-gifts"><h3>ของแถมและรายละเอียด <span>{property.gifts?.length || 0} รายการ</span></h3>{property.gifts?.length ? property.gifts.map((g, index) => <div key={index} className="ai-gift-row"><Check size={16} /><div><strong>{g.name}</strong><p>{g.detail || 'ยังไม่มีรายละเอียดเพิ่มเติม'}</p></div></div>) : <p className="ai-muted">ยังไม่มีข้อมูลของแถม บอก AI ให้เพิ่มหรือแก้รายการได้ในแชต</p>}</div>
      {property.promotions?.length > 0 && <div className="ai-span-2 ai-gifts"><h3>โปรโมชั่น</h3>{property.promotions.map((p, i) => <p key={i}>{p}</p>)}</div>}
      {images.length > 0 && <div className="ai-span-2"><h3 className="ai-section-label">รูปบ้านที่จะเพิ่มในประกาศ</h3><p className="ai-muted">เลือกเฉพาะรูปที่ตรงกับแบบบ้าน รูปจะตามไปในฟอร์ม</p><div className="ai-photo-grid">{images.map(f => <label key={f.id} className={`ai-photo-choice ${property.imageIds?.includes(f.id) ? 'is-selected' : ''}`}><img src={f.dataUrl} alt={f.name} width="160" height="112" /><span><input type="checkbox" checked={property.imageIds?.includes(f.id) || false} onChange={e => change('imageIds', e.target.checked ? [...(property.imageIds || []), f.id] : (property.imageIds || []).filter(id => id !== f.id))} />{f.name}</span></label>)}</div></div>}
    </fieldset>
    <CoverPhotoEditor property={property} files={files} onEdit={onEdit} busy={busy} />
    {(property.questions || []).length > 0 && <div className="ai-note"><strong>AI ขอให้ยืนยัน</strong><ul>{property.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
    <details className="ai-evidence"><summary>ดูแหล่งที่มาของข้อมูล</summary>{Object.entries(property.evidence || {}).length ? <dl>{Object.entries(property.evidence).map(([key, source]) => <div key={key}><dt>{fieldLabels[key] || key}</dt><dd>{source}</dd></div>)}</dl> : <p>ยังไม่มีแหล่งที่มา กรุณาตรวจเทียบกับไฟล์ก่อนบันทึก</p>}</details>
    <div className="ai-review-footer"><p>เปิดฟอร์มเพื่อตรวจทำเล สถานะ และข้อมูลที่ยังขาด ก่อนกดบันทึกทรัพย์</p><button type="button" className="ai-primary" disabled={busy || !property.title || !property.type || (property.priceMax != null && property.price != null && Number(property.priceMax) < Number(property.price))} onClick={onTransfer}>นำข้อมูลไปกรอกฟอร์ม <ArrowUpRight size={18} /></button>{property.priceMax != null && property.price != null && Number(property.priceMax) < Number(property.price) && <p role="alert">ราคาสูงสุดต้องไม่น้อยกว่าราคาเริ่มต้น</p>}</div>
  </>
}

function AssistantWorkspace({ uid }) {
  const assistant = usePropertyAssistant(uid)
  const { session, busy, activity, ready, error, status } = assistant
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const property = session.properties[Math.min(selected, Math.max(0, session.properties.length - 1))]
  const selectedIndex = session.properties.indexOf(property)
  const disabled = busy || !ready || transferring
  async function send(e) {
    e.preventDefault()
    if (await assistant.send(message.trim() || 'วิเคราะห์ไฟล์แนบและเตรียมข้อมูลทรัพย์ให้ตรวจ โดยแยกแต่ละแบบบ้าน')) setMessage('')
  }
  async function transfer() {
    setTransferring(true)
    try {
      const transferId = await assistant.transfer(selectedIndex)
      navigate(`/sps-internal-admin/properties/new?aiDraft=${transferId}`)
    } catch (e) { assistant.setError(e.message) } finally { setTransferring(false) }
  }
  return <div className="ai-property-page">
    <Link className="ai-back" to="/sps-internal-admin/properties"><ArrowLeft size={16} />จัดการทรัพย์</Link>
    <header className="ai-page-header"><div><div className="ai-eyebrow"><Sparkles size={16} />ผู้ช่วยเตรียมประกาศ</div><h1>ให้ AI ช่วยกรอกทรัพย์</h1><p>แนบข้อมูลบ้าน แล้วคุยให้ AI เตรียมรายละเอียดลงฟอร์ม</p></div><button className="ai-secondary" type="button" disabled={disabled} onClick={() => setConfirmReset(true)}><Plus size={18} />เริ่มข้อมูลชุดใหม่</button></header>
    <div className="ai-steps"><span><b>1</b> แนบรูป / PDF</span><span><b>2</b> คุยและตรวจข้อมูล</span><span><b>3</b> เปิดฟอร์มเพื่อบันทึก</span></div>
    <div className="ai-service-bar"><div><ShieldCheck size={19} /><span><strong>AI ผ่าน OpenRouter · เฉพาะรุ่นฟรี</strong><small>{status ? !status.configured ? 'ยังไม่ได้ตั้งค่า API Key ที่เซิร์ฟเวอร์' : status.reason : 'ตรวจราคาเป็นศูนย์ก่อนส่ง · สลับเฉพาะรุ่นฟรีที่รับรูปได้'}</small></span></div><button type="button" disabled={checking || !ready} onClick={async () => { setChecking(true); await assistant.checkStatus(); setChecking(false) }}>{checking ? 'กำลังตรวจ…' : 'ตรวจการเชื่อมต่อ'}</button></div>
    {error && <div role="alert" className="ai-error"><span>{error}</span><button type="button" aria-label="ปิดข้อความแจ้งเตือน" onClick={() => assistant.setError('')}><X size={18} /></button></div>}
    {!ready ? <p role="status">กำลังเปิดข้อมูลร่าง…</p> : <div className="ai-workspace">
      <section className="ai-panel ai-chat-panel" aria-label="คุยกับ AI และแนบไฟล์">
        <div className="ai-panel-title"><MessageSquare size={19} /><h2>คุยกับผู้ช่วย</h2><span>เก็บร่างในเครื่องนี้</span></div>
        <div className={`ai-upload ${dragging ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) assistant.addFiles([...e.dataTransfer.files]) }}>
          <ImagePlus size={30} /><strong>ลากรูปหรือ PDF มาวางที่นี่</strong><p>รูปบ้าน 15 รูป + PDF 2 ไฟล์ · ย่อรูปอัตโนมัติก่อนส่ง · PDF ไฟล์ละ 4 MB</p><button type="button" className="ai-secondary" disabled={disabled} onClick={() => inputRef.current?.click()}><Paperclip size={16} />เลือกไฟล์</button>
          <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" aria-label="แนบรูปหรือ PDF" disabled={disabled} onChange={e => { assistant.addFiles([...e.target.files]); e.target.value = '' }} />
        </div>
        {session.files.length > 0 && <div className="ai-attachments">{session.files.map(f => <div className="ai-attachment" key={f.id}>{f.type.startsWith('image/') ? <img src={f.dataUrl} alt="" width="44" height="44" /> : <FileText size={25} />}<span title={f.name}>{f.name}<small>{(f.size / 1024).toFixed(0)} KB{f.originalSize > f.size ? ` · ย่อแล้ว ${Math.round((1 - f.size / f.originalSize) * 100)}%` : ''}</small></span><button type="button" aria-label={`นำไฟล์ ${f.name} ออก`} disabled={disabled} onClick={() => assistant.removeFile(f.id)}><X size={16} /></button></div>)}</div>}
        <div className="ai-messages" role="log" aria-label="ประวัติสนทนา" aria-live="polite">
          {!session.messages.length && <div className="ai-welcome"><div className="ai-sparkle"><Sparkles size={24} /></div><h3>เริ่มจากข้อมูลที่คุณมี</h3><p>ส่งโบรชัวร์ รูปบ้าน หรือข้อความขาย แล้วบอกว่าต้องการให้กรอกอะไร เช่น “แยกทาวน์โฮม 2 แบบ ใช้พื้นที่ต่ำสุด และแจกแจงของแถม”</p><p className="ai-muted">ข้อมูลที่ไม่พบจะเว้นไว้ให้ยืนยัน</p></div>}
          {session.messages.map((m, i) => <article className={`ai-message ${m.role}`} key={i}><span>{m.role === 'user' ? 'คุณ' : 'ผู้ช่วย AI'}</span><p>{m.content}</p></article>)}
          {busy && <div className="ai-working" role="status"><LoaderCircle className="animate-spin" size={17} />{activity === 'compressing' ? 'กำลังย่อรูปก่อนแนบ…' : 'กำลังเตรียมข้อมูล…'}</div>}
        </div>
        {session.questions.length > 0 && <div className="ai-global-questions"><strong>ข้อมูลที่ต้องการเพิ่ม</strong><ul>{session.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
        <div className="ai-suggestions">{prompts.map(p => <button type="button" key={p} disabled={disabled} onClick={() => setMessage(p)}>{p}</button>)}</div>
        <form className="ai-composer" onSubmit={send}><label htmlFor="ai-message">บอก AI ว่าต้องการกรอกหรือแก้อะไร</label><textarea id="ai-message" maxLength={6000} rows={3} value={message} disabled={disabled} onChange={e => setMessage(e.target.value)} placeholder="เช่น ทุกแบบมี 3 ห้องนอน 2 ห้องน้ำ ทำเลหนองกะขะ ซอย 8" /><div><small>ไฟล์จะส่งให้ OpenRouter เมื่อกดส่ง · ร่างยังไม่เผยแพร่</small><button className="ai-primary" disabled={disabled || (!message.trim() && !session.files.length)} type="submit"><Send size={17} />{busy ? 'กำลังทำงาน…' : 'ส่งให้ AI'}</button></div></form>
      </section>
      <section className="ai-panel ai-review-panel" aria-label="ข้อมูลทรัพย์ที่ AI เตรียม">
        {session.properties.length > 0 && <div className="ai-property-tabs" role="tablist" aria-label="แบบบ้านที่เตรียม">{session.properties.map((p, i) => <button role="tab" id={`ai-property-tab-${i}`} aria-controls="ai-property-review" aria-selected={i === selectedIndex} key={`${p.key}-${i}`} disabled={disabled} type="button" onClick={() => setSelected(i)}>{i + 1}. {p.title || 'ร่างทรัพย์'}</button>)}</div>}
        {property ? <div className="ai-review-body" id="ai-property-review" role="tabpanel" aria-labelledby={`ai-property-tab-${selectedIndex}`}><PropertyReview property={property} files={session.files} onEdit={patch => assistant.editProperty(selectedIndex, patch)} onTransfer={transfer} busy={disabled} /></div> : <div className="ai-empty-review"><div className="ai-draft-illustration"><FileText size={52} /><Sparkles size={23} /></div><span className="ai-eyebrow">ข้อมูลพร้อมให้ตรวจ จะปรากฏตรงนี้</span><h2>จากไฟล์บ้าน สู่แบบฟอร์มที่พร้อมกรอก</h2><p>AI ช่วยแยกแบบบ้าน ราคา พื้นที่ และของแถม พร้อมบอกที่มาของข้อมูล คุณตรวจแก้ได้ทุกช่องก่อนนำไปใช้</p><div className="ai-empty-fields"><span>ชื่อประกาศ</span><i /><span>ราคา / ช่วงราคา</span><i /><span>ห้องนอน · ห้องน้ำ · พื้นที่</span><i /><span>ของแถมและโปรโมชั่น</span><i /></div><p className="ai-muted">ภาพตัวอย่างและเฟอร์นิเจอร์ในภาพจะไม่ถูกนับเป็นของแถมเอง</p></div>}
      </section>
    </div>}
    {confirmReset && <ResetDialog onClose={() => setConfirmReset(false)} onReset={async () => { try { await assistant.reset(); setSelected(0); setMessage(''); setConfirmReset(false) } catch (e) { assistant.setError(e.message); setConfirmReset(false) } }} />}
  </div>
}

export default function AIPropertyPage() {
  const { user, userRole } = useAdminAuth()
  if (!['super_admin', 'admin', 'agent'].includes(userRole)) return <p role="alert">บัญชีนี้ไม่มีสิทธิ์ใช้ผู้ช่วยกรอกทรัพย์</p>
  return <AssistantWorkspace key={user.uid} uid={user.uid} />
}
