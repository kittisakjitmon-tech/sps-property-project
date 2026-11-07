import { getFunctions, httpsCallable } from 'firebase/functions'
import { adminApp, publicApp } from '../../lib/firebase'

const adminCall = httpsCallable(getFunctions(adminApp), 'propertyCompletionAdmin')
const publicCall = httpsCallable(getFunctions(publicApp), 'propertyCompletionPublic')

export async function createCompletionLink(form, propertyId, baseVersion) {
  const result = await adminCall({ action: 'create', form, propertyId: propertyId || null, baseVersion })
  return result.data
}

export async function revokeCompletionLink(token) {
  await adminCall({ action: 'revoke', token })
}

export async function readCompletion(token) {
  return (await publicCall({ action: 'read', token })).data
}

export async function submitCompletion(token, values) {
  return (await publicCall({ action: 'submit', token, values })).data
}
