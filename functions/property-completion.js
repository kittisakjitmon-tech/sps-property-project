/* global require, exports */
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { CompletionError, createService } = require('./property-completion-core.cjs')

function callable(action) {
  return functions.runWith({ timeoutSeconds: 60, memory: '256MB', maxInstances: 5 }).https.onCall(async (data, context) => {
    try {
      const service = createService({
        db: admin.firestore(),
        serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      })
      return await service[action](data, context)
    } catch (error) {
      if (error instanceof CompletionError) throw new functions.https.HttpsError(error.code, error.message)
      functions.logger.warn('Property completion request failed', { code: error?.name || 'unknown' })
      throw new functions.https.HttpsError('unavailable', 'ติดต่อระบบบ้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  })
}

exports.propertyCompletionAdmin = callable('admin')
exports.propertyCompletionPublic = callable('public')
