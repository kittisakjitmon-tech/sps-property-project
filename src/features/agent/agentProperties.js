import { propertyStatus, searchProperty, filterByBudget, sortProperties } from '../../lib/propertyManagement.js'
import { withoutProject } from '../quotation/quotationData.js'

export function agentProperty(source) {
  const status = propertyStatus(source)
  // Only saleable/published stock states; never include drafts or awaiting approval.
  if (!['available', 'reserved', 'sold'].includes(status) || source.published === false || source.hidden === true || source.deleted === true) return null
  const location = typeof source.location === 'object' && source.location ? {
    province: source.location.province || '', district: source.location.district || '', subDistrict: source.location.subDistrict || '',
  } : {}
  const result = { id: source.id, displayId: source.displayId || source.propertyId || '', propertyId: source.propertyId || '',
    title: withoutProject(source.title, source.project), type: source.type || '',
    location, locationDisplay: withoutProject(source.locationDisplay || Object.values(location).filter(Boolean).reverse().join(', '), source.project),
    description: withoutProject(source.description, source.project),
    images: Array.isArray(source.images) ? source.images.filter(image => typeof image === 'string' && /^https?:\/\//.test(image)) : [],
    coverImageUrl: typeof source.coverImageUrl === 'string' && /^https?:\/\//.test(source.coverImageUrl) ? source.coverImageUrl : '',
    price: source.price ?? '', priceMax: source.priceMax ?? '', bankPrice: source.bankPrice ?? '', showPrice: source.showPrice !== false,
    bedrooms: source.bedrooms ?? null, bathrooms: source.bathrooms ?? null, area: source.area ?? '', usableAreaSqm: source.usableAreaSqm ?? '',
    listingType: source.listingType || (source.isRental ? 'rent' : 'sale'), isRental: Boolean(source.isRental),
    propertyCondition: source.propertyCondition || source.propertySubStatus || '', availability: status, status,
    createdAt: source.createdAt, updatedAt: source.updatedAt,
  }
  return result
}

export function filterAgentProperties(properties, filters, typeLabel) {
  const matches = properties.filter(property => searchProperty(property, filters.search, typeLabel(property.type)) &&
    (!filters.type || property.type === filters.type) && (!filters.status || propertyStatus(property) === filters.status) &&
    (!filters.deal || property.listingType === filters.deal) && (!filters.condition || property.propertyCondition === filters.condition))
  return sortProperties(filterByBudget(matches, filters.min, filters.max), filters.sort, typeLabel)
}
