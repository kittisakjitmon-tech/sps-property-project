const admin = require('firebase-admin')
const functions = require('firebase-functions')
const { SOURCE_COLLECTION, sourceKey, resolveReferral, postNumber, shouldApplyReferral } = require('./facebook-referral.cjs')

const JOBS = 'messenger_property_backfills'
const PAGE_SIZE = 100
const SOURCE_FIELDS = { ad: 'adId', post: 'postId', ref: 'ref' }

// A post may arrive with either of the page's two IDs in front, so compare the post number.
function sameSource(kind, actual, expected) {
  if (kind === 'post') return !!postNumber(actual) && postNumber(actual) === postNumber(expected)
  return actual === expected
}

// These are context updates only. Backfilling must never send messages or resume a paused bot.
// The mapped ad house wins over houses typed in by staff (see shouldApplyReferral).
async function backfillConversation(db, ref, mappingId, revision) {
  return db.runTransaction(async transaction => {
    const mapping = (await transaction.get(db.collection(SOURCE_COLLECTION).doc(mappingId))).data()
    if (!mapping || mapping.revision !== revision) return 'cancelled'
    const snapshot = await transaction.get(ref)
    const current = snapshot.data()
    const source = current?.facebookReferral
    if (!current || current.pageId !== mapping.pageId || !source
      || !sameSource(mapping.kind, source[SOURCE_FIELDS[mapping.kind]], mapping.value)
      || !shouldApplyReferral(current, source)) return 'skipped'
    // Re-resolve all priorities in the same transaction: an ad-specific mapping wins over
    // a post mapping, even when that higher-priority mapping changes during the backfill.
    const resolved = await resolveReferral(db, mapping.pageId, source, { transaction })
    if (resolved.status !== 'matched' || resolved.propertyCode !== mapping.propertyCode) return 'skipped'
    if (current.propertySourceRevision === revision) return 'unchanged'
    const FieldValue = admin.firestore.FieldValue
    transaction.set(ref, {
      facebookReferral: resolved,
      currentPropertyCode: resolved.propertyCode,
      currentPropertyId: resolved.propertyId,
      currentPropertyTitle: resolved.propertyTitle,
      currentPropertySetBy: 'facebook-referral',
      currentPropertySetAt: FieldValue.serverTimestamp(),
      propertySourceRevision: revision,
      needsProperty: FieldValue.delete(),
      ...(current.currentPropertyCode !== resolved.propertyCode
        ? { attachedShownAt: FieldValue.delete(), othersRequestedAt: FieldValue.delete() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    return 'updated'
  })
}

async function runBackfill(jobRef) {
  const db = admin.firestore()
  const FieldValue = admin.firestore.FieldValue
  const lease = await db.runTransaction(async transaction => {
    const job = (await transaction.get(jobRef)).data()
    if (!job || job.status === 'completed' || job.status === 'cancelled') return null
    // Throw for an active lease so a redelivery is retried if the original worker crashes.
    if (job.leaseUntil > Date.now()) throw new Error('Backfill worker is already running')
    if (!SOURCE_FIELDS[job.kind] || !job.mappingId || !job.revision) throw new Error('Invalid backfill job')
    const mapping = (await transaction.get(db.collection(SOURCE_COLLECTION).doc(job.mappingId))).data()
    if (!mapping || mapping.revision !== job.revision) {
      transaction.set(jobRef, { status: 'cancelled' }, { merge: true })
      return null
    }
    transaction.set(jobRef, { status: 'running', leaseUntil: Date.now() + 150_000 }, { merge: true })
    return job
  })
  if (!lease) return null
  try {
    let query = db.collection('messenger_conversations')
      .where(`facebookReferral.${SOURCE_FIELDS[lease.kind]}`, 'in', [lease.value, ...(lease.aliases || [])])
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE)
    if (lease.cursor) query = query.startAfter(lease.cursor)
    const batch = await query.get()
    const counts = { updated: lease.updated || 0, skipped: lease.skipped || 0, scanned: lease.scanned || 0 }
    // Limit simultaneous transactions so a large ad cannot exhaust the database/client pool.
    for (let offset = 0; offset < batch.docs.length; offset += 10) {
      const results = await Promise.all(batch.docs.slice(offset, offset + 10).map(snapshot =>
        backfillConversation(db, snapshot.ref, lease.mappingId, lease.revision)))
      for (const result of results) {
        counts.scanned++
        if (result === 'updated' || result === 'unchanged') counts.updated++
        else counts.skipped++
      }
    }
    const more = batch.docs.length === PAGE_SIZE
    const cursor = batch.docs.at(-1)?.id || null
    await db.runTransaction(async transaction => {
      const mappingRef = db.collection(SOURCE_COLLECTION).doc(lease.mappingId)
      const mapping = (await transaction.get(mappingRef)).data()
      if (!mapping || mapping.revision !== lease.revision) {
        transaction.set(jobRef, { status: 'cancelled', leaseUntil: 0 }, { merge: true })
        return
      }
      if (more) {
        const nextRef = db.collection(JOBS).doc(sourceKey(lease.mappingId, lease.revision, cursor))
        transaction.set(nextRef, {
          mappingId: lease.mappingId, revision: lease.revision, kind: lease.kind,
          value: lease.value, aliases: lease.aliases || [], cursor, ...counts, status: 'queued', createdAt: FieldValue.serverTimestamp(),
        })
      }
      transaction.set(jobRef, { status: 'completed', ...counts, leaseUntil: 0, completedAt: FieldValue.serverTimestamp() }, { merge: true })
      transaction.set(mappingRef, {
        backfill: { status: more ? 'running' : 'completed', ...counts, updatedAt: FieldValue.serverTimestamp() },
      }, { merge: true })
    })
    return counts
  } catch (error) {
    await jobRef.set({ leaseUntil: 0 }, { merge: true })
    throw error
  }
}

const facebookPropertySourceBackfill = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB', maxInstances: 2, failurePolicy: true })
  .firestore.document(`${JOBS}/{jobId}`)
  .onCreate(snapshot => runBackfill(snapshot.ref))

module.exports = { facebookPropertySourceBackfill, runBackfill, backfillConversation, JOBS }
