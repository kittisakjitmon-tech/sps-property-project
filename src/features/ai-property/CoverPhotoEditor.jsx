import { useEffect, useState } from 'react'
import { Sparkles, Star } from 'lucide-react'
import { coverTitle, renderCoverImage } from './coverImage'

export default function CoverPhotoEditor({ property, files, onEdit, busy }) {
  const selected = files.filter(f => f.type.startsWith('image/') && property.imageIds?.includes(f.id))
  const source = selected.find(f => f.id === property.coverImageId)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  // Rendering is derived from current copy and image; a cancelled render can never replace a newer one.
  useEffect(() => {
    let active = true
    if (!source || property.coverOverlay === false) return
    const timer = setTimeout(() => {
      renderCoverImage(property, source).then(result => { if (active) { setPreview({ dataUrl: result.dataUrl, signature: JSON.stringify([property, source.id]) }); setError('') } }).catch(e => { if (active) { setPreview(null); setError(e.message) } })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [property, source])
  function change(patch) {
    onEdit({ ...patch, evidence: { ...property.evidence, coverImageId: 'ผู้ใช้ตรวจหรือแก้ไขภาพหน้าปกในหน้าตรวจข้อมูล' } })
  }
  const currentPreview = preview?.signature === JSON.stringify([property, source?.id]) ? preview.dataUrl : null
  return <section className="ai-cover-editor" aria-label="จัดรูปหน้าปกประกาศ">
    <h3><Star size={17} />ภาพหน้าปกประกาศ</h3>
    <p className="ai-muted">AI เลือกภาพที่เห็นตัวบ้านชัด องค์ประกอบดี และตรงกับแบบบ้าน คุณเปลี่ยนได้ก่อนนำไปใช้</p>
    {!selected.length ? <p className="ai-note">เลือกรูปบ้านด้านบน หรือแนบรูปเพิ่มแล้วให้ AI ช่วยเลือก</p> : <>
      <label className="ai-field" htmlFor="ai-cover-source"><span>รูปที่จะใช้เป็นภาพแรก</span><select id="ai-cover-source" value={source?.id || ''} onChange={e => change({ coverImageId: e.target.value, coverReason: 'ผู้ใช้เลือกภาพนี้เป็นหน้าปก' })} disabled={busy}><option value="">เลือกรูปหน้าปก</option>{selected.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label>
      {property.coverReason && source && <p className="ai-cover-reason"><Sparkles size={15} />{property.coverReason}</p>}
      <label className="ai-check"><input type="checkbox" disabled={busy} checked={property.coverOverlay !== false} onChange={e => change({ coverOverlay: e.target.checked })} />เพิ่มข้อความประกาศบนภาพหน้าปก</label>
      {property.coverOverlay !== false && <label className="ai-field" htmlFor="ai-cover-text"><span>ข้อความบนภาพ (เว้นว่างเพื่อใช้ชื่อประกาศ)</span><textarea id="ai-cover-text" rows={2} maxLength={250} value={property.coverText || ''} placeholder={coverTitle({ ...property, coverText: '' }) || 'ชื่อประกาศและทำเล'} disabled={busy} onChange={e => change({ coverText: e.target.value })} /><small>ระบบตัดชื่อโครงการ ต่อท้ายทำเล และไม่ใส่ราคาเต็มบนภาพ</small></label>}
      {source && <div className="ai-cover-preview">{property.coverOverlay === false ? <img src={source.dataUrl} width="1600" height="1200" alt="รูปบ้านต้นฉบับที่จะเป็นภาพแรก" /> : currentPreview ? <img src={currentPreview} width="1600" height="1200" alt={`ตัวอย่างภาพหน้าปก ${coverTitle(property)}`} /> : <p role="status">{error || 'กำลังเตรียมภาพหน้าปก…'}</p>}<span>ภาพแรกของประกาศ</span></div>}
      {error && property.coverOverlay !== false && <p role="alert" className="ai-note">{error}</p>}
      <p className="ai-muted">แสดงภาพบ้านเต็มโดยไม่ครอป เพิ่มแถบข้อความใต้ภาพ และเก็บต้นฉบับในร่าง และใช้ภาพพร้อมข้อความแทนรูปแรกในประกาศ</p>
    </>}
  </section>
}
