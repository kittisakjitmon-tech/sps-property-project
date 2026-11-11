import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFacebookSource } from './facebookSource.js'

const PAGE = '61595039907598'
const insights = `https://www.facebook.com/content/insights/?content_id=${btoa(`S:_I${PAGE}:122110897827501330:1221108978275133`)}`

test('a post-insights link becomes PAGEID_POSTID', () => {
  assert.deepEqual(parseFacebookSource(insights, { pageId: PAGE }), {
    kind: 'post', value: `${PAGE}_122110897827501330`, linkPageId: PAGE, postId: '122110897827501330',
  })
})

test('the page in the link wins over the selected page and is reported', () => {
  const result = parseFacebookSource(insights, { pageId: '999' })
  assert.equal(result.value, `${PAGE}_122110897827501330`)
  assert.equal(result.linkPageId, PAGE)
})

test('bare numbers follow the chosen kind', () => {
  assert.deepEqual(parseFacebookSource('120200000000001', { pageId: PAGE }), { kind: 'ad', value: '120200000000001' })
  assert.equal(parseFacebookSource('555', { pageId: PAGE, kindHint: 'post' }).value, `${PAGE}_555`)
  assert.ok(parseFacebookSource('555', { kindHint: 'post' }).error)
  assert.equal(parseFacebookSource('123_456').value, '123_456')
})

test('numeric permalinks and /posts/ links work', () => {
  assert.equal(parseFacebookSource(`https://www.facebook.com/permalink.php?story_fbid=777&id=${PAGE}`).value, `${PAGE}_777`)
  assert.equal(parseFacebookSource(`https://facebook.com/${PAGE}/posts/888`).value, `${PAGE}_888`)
  assert.equal(parseFacebookSource('https://facebook.com/somepage/posts/888', { pageId: PAGE }).value, `${PAGE}_888`)
})

test('pfbid and share links explain what to do instead', () => {
  assert.match(parseFacebookSource(`https://www.facebook.com/permalink.php?story_fbid=pfbid0Uj&id=${PAGE}`).error, /pfbid/)
  assert.match(parseFacebookSource('https://www.facebook.com/share/p/19u9eHXv4d/').error, /ลิงก์แชร์/)
  assert.ok(parseFacebookSource('https://www.facebook.com/content/insights/?content_id=UzpfSTYx').error)
})

test('Ads Manager and m.me links', () => {
  assert.deepEqual(parseFacebookSource('https://adsmanager.facebook.com/adsmanager/manage/ads?act=1&selected_ad_ids=120211'), { kind: 'ad', value: '120211' })
  assert.deepEqual(parseFacebookSource(`https://m.me/${PAGE}?ref=property_SPS-TH-1`), { kind: 'ref', value: 'property_SPS-TH-1' })
  assert.ok(parseFacebookSource('https://example.com/x').error)
  assert.equal(parseFacebookSource('  '), null)
})
