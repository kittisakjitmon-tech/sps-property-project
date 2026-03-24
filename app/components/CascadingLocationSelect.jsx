import { useState, useEffect } from 'react'
import { getProvinces, getDistricts, getSubdistricts } from '../data/thailandAddresses'

/**
 * Cascading Location Select Component
 * 3-level dropdown: Province -> District -> Subdistrict
 */
export default function CascadingLocationSelect({
  value = { province: '', district: '', subDistrict: '' },
  onChange,
  className = '',
}) {
  const [province, setProvince] = useState(value.province || '')
  const [district, setDistrict] = useState(value.district || '')
  const [subDistrict, setSubDistrict] = useState(value.subDistrict || '')
  
  const provinces = getProvinces()
  const districts = getDistricts(province)
  const subdistricts = getSubdistricts(province, district)

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (province !== value.province) {
      setDistrict('')
      setSubDistrict('')
    }
    if (district !== value.district) {
      setSubDistrict('')
    }
  }, [province, district, value.province, value.district])

  // Sync with external value changes
  useEffect(() => {
    setProvince(value.province || '')
    setDistrict(value.district || '')
    setSubDistrict(value.subDistrict || '')
  }, [value])

  const handleProvinceChange = (e) => {
    const newProvince = e.target.value
    setProvince(newProvince)
    setDistrict('')
    setSubDistrict('')
    onChange?.({ province: newProvince, district: '', subDistrict: '' })
  }

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value
    setDistrict(newDistrict)
    setSubDistrict('')
    onChange?.({ province, district: newDistrict, subDistrict: '' })
  }

  const handleSubDistrictChange = (e) => {
    const newSubDistrict = e.target.value
    setSubDistrict(newSubDistrict)
    onChange?.({ province, district, subDistrict: newSubDistrict })
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Province */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          จังหวัด <span className="text-red-500">*</span>
        </label>
        <select
          value={province}
          onChange={handleProvinceChange}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          required
        >
          <option value="">-- เลือกจังหวัด --</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* District */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          อำเภอ/เขต <span className="text-red-500">*</span>
        </label>
        <select
          value={district}
          onChange={handleDistrictChange}
          disabled={!province}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
          required
        >
          <option value="">-- เลือกอำเภอ/เขต --</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Subdistrict */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          ตำบล/แขวง
        </label>
        <select
          value={subDistrict}
          onChange={handleSubDistrictChange}
          disabled={!district}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="">-- เลือกตำบล/แขวง --</option>
          {subdistricts.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
