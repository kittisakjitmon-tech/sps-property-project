/**
 * Thailand Address Database
 * Structure: { provinces: [{ name, districts: [{ name, subdistricts: [name] }] }] }
 * 
 * This file contains a structured database of Thai provinces, districts, and subdistricts
 * extracted from thaiLocations.js and organized for cascading dropdowns.
 */

import { thaiLocations } from './thaiLocations'

/**
 * Build structured address database from thaiLocations
 */
function buildAddressDatabase() {
  const db = {}
  
  thaiLocations.forEach((loc) => {
    const { province, district, subDistrict } = loc
    
    if (!db[province]) {
      db[province] = {}
    }
    
    if (!db[province][district]) {
      db[province][district] = new Set()
    }
    
    db[province][district].add(subDistrict)
  })
  
  // Convert to array structure
  const provinces = Object.keys(db).map((provinceName) => {
    const districts = Object.keys(db[provinceName]).map((districtName) => {
      const subdistricts = Array.from(db[provinceName][districtName]).sort()
      return {
        name: districtName,
        subdistricts,
      }
    })
    
    return {
      name: provinceName,
      districts: districts.sort((a, b) => a.name.localeCompare(b.name, 'th')),
    }
  })
  
  return provinces.sort((a, b) => a.name.localeCompare(b.name, 'th'))
}

export const thailandAddresses = buildAddressDatabase()

/**
 * Get all provinces
 */
export function getProvinces() {
  return thailandAddresses.map((p) => p.name)
}

/**
 * Get districts for a province
 */
export function getDistricts(province) {
  if (!province) return []
  const provinceData = thailandAddresses.find((p) => p.name === province)
  if (!provinceData) return []
  return provinceData.districts.map((d) => d.name)
}

/**
 * Get subdistricts for a province and district
 */
export function getSubdistricts(province, district) {
  if (!province || !district) return []
  const provinceData = thailandAddresses.find((p) => p.name === province)
  if (!provinceData) return []
  const districtData = provinceData.districts.find((d) => d.name === district)
  if (!districtData) return []
  return districtData.subdistricts
}

/**
 * Find location data from thaiLocations by province, district, subdistrict
 */
export function findLocation(province, district, subDistrict) {
  return thaiLocations.find(
    (loc) =>
      loc.province === province &&
      loc.district === district &&
      loc.subDistrict === subDistrict
  )
}
