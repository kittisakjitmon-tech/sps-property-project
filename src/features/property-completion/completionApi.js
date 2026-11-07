import { getFunctions, httpsCallable } from 'firebase/functions'
import { adminApp, publicApp } from '../../lib/firebase'
import { completionErrorMessage } from './completionForm'

const adminCall = httpsCallable(getFunctions(adminApp), 'propertyCompletionAdmin')
const publicCall = httpsCallable(getFunctions(publicApp), 'propertyCompletionPublic')

async function callCompletion(call, data) {
  try { return (await call(data)).data }
  catch (error) { throw new Error(completionErrorMessage(error)) }
}

export async function createCompletionLink(form, propertyId, baseVersion) {
  return callCompletion(adminCall, { action: 'create', form, propertyId: propertyId || null, baseVersion })
}

export async function revokeCompletionLink(token) {
  await callCompletion(adminCall, { action: 'revoke', token })
}

export async function readCompletion(token) {
  return callCompletion(publicCall, { action: 'read', token })
}

export async function submitCompletion(token, values, revision) {
  return callCompletion(publicCall, { action: revision ? 'update' : 'submit', token, values, ...(revision ? { revision } : {}) })
}
