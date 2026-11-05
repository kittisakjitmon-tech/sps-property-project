import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Home,
  ImagePlus,
  Loader2,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Settings2,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'
import Avatar from './messenger/Avatar'
import ContactPanel from './messenger/ContactPanel'
import PageManager from './messenger/PageManager'
import PropertyBar from './messenger/PropertyBar'
import {
  useBotSettings,
  useConversations,
  useMessages,
  useMessengerApi,
  useMessengerPages,
  usePropertyOptions,
} from './messenger/useMessengerData'
import {
  customerName,
  formatDateTime,
  formatTime,
  imageFileToJpegBase64,
  isOutsideMessagingWindow,
} from './messenger/messengerUtils'

function PageBadge({ name }) {
  if (!name) return null
  return (
    <span className="inline-flex max-w-[140px] items-center truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
      {name}
    </span>
  )
}

function Attachment({ attachment, outgoing }) {
  if (attachment.type === 'image' && attachment.url) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <img
          src={attachment.url}
          alt="รูปภาพในแชท"
          width={256}
          height={256}
          loading="lazy"
          className="max-h-64 w-auto rounded-xl object-cover"
        />
      </a>
    )
  }
  if (attachment.type === 'video' && attachment.url) {
    return <video src={attachment.url} controls className="max-h-64 rounded-xl" />
  }
  if (attachment.type === 'audio' && attachment.url) {
    return <audio src={attachment.url} controls className="max-w-full" />
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 text-sm underline ${outgoing ? 'text-blue-100' : 'text-blue-700'}`}
    >
      <Paperclip className="h-4 w-4" aria-hidden="true" />
      เปิดไฟล์แนบ ({attachment.type})
    </a>
  )
}

export default function MessengerInbox() {
  const callApi = useMessengerApi()
  const { isSuperAdmin } = useAdminAuth()
  const { settings: botSettings, loading: botLoading } = useBotSettings()
  const [botBusy, setBotBusy] = useState(false)
  const { items: conversations, loading: listLoading, error: listError } = useConversations()
  const { items: pages } = useMessengerPages()
  const propertyOptions = usePropertyOptions()
  const [propertyBusy, setPropertyBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const { items: messages, loading: messagesLoading, error: messagesError } = useMessages(selectedId)
  const [search, setSearch] = useState('')
  const [pageFilter, setPageFilter] = useState('all')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [pageManagerOpen, setPageManagerOpen] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  const selectedConversation = conversations.find(item => item.id === selectedId)
  const selectedUnreadCount = selectedConversation?.unreadCount || 0
  const outsideWindow = isOutsideMessagingWindow(selectedConversation)
  const error = actionError || listError || messagesError

  const pageNames = useMemo(() => {
    const names = new Map(pages.map(page => [page.id, page.name]))
    conversations.forEach(item => {
      if (item.pageId && !names.has(item.pageId)) names.set(item.pageId, item.pageName || item.pageId)
    })
    return names
  }, [pages, conversations])

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase()
    return conversations.filter(item => {
      if (pageFilter !== 'all' && item.pageId !== pageFilter) return false
      if (!term) return true
      const haystack = [
        customerName(item),
        item.displayName,
        item.lastMessageText,
        item.pageName,
        item.contact?.phone,
        item.contact?.email,
        ...(item.detectedPhones || []),
        ...(item.detectedEmails || []),
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [conversations, search, pageFilter])

  const totalUnread = conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0)

  useEffect(() => {
    if (!selectedId || !selectedUnreadCount) return
    callApi({ action: 'read', conversationId: selectedId }).catch(readError => {
      console.error('Unable to mark Messenger conversation as read:', readError)
    })
  }, [selectedId, selectedUnreadCount, callApi])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectConversation(id) {
    setSelectedId(id)
    setMobileChatOpen(true)
    setActionError('')
  }

  async function runSend(body) {
    setSending(true)
    setActionError('')
    try {
      await callApi({ conversationId: selectedId, ...body })
      return true
    } catch (sendError) {
      setActionError(sendError.message || 'ส่งข้อความไม่สำเร็จ')
      return false
    } finally {
      setSending(false)
    }
  }

  async function rateAiMessage(messageId, rating) {
    setActionError('')
    try {
      await callApi({ action: 'rateAiMessage', conversationId: selectedId, messageId, rating })
    } catch (rateError) {
      setActionError(rateError.message || 'บันทึกคะแนนไม่สำเร็จ')
    }
  }

  async function runBotAction(body) {
    setBotBusy(true)
    setActionError('')
    try {
      await callApi(body)
    } catch (botError) {
      setActionError(botError.message || 'ตั้งค่าบอทไม่สำเร็จ')
    } finally {
      setBotBusy(false)
    }
  }

  function toggleBotEnabled() {
    const turningOn = !botSettings.enabled
    const message = turningOn
      ? 'เปิดให้ AI ตอบข้อความลูกค้าอัตโนมัติทุกแชทที่ไม่ได้หยุดไว้?'
      : 'ปิดการตอบอัตโนมัติของ AI ทั้งระบบ?'
    if (!window.confirm(message)) return
    runBotAction({ action: 'setBotEnabled', enabled: turningOn })
  }

  function toggleRequireProperty() {
    const turningOn = botSettings.requirePropertyForBot !== true
    const message = turningOn
      ? 'ให้ AI ตอบเฉพาะแชทที่เลือกทรัพย์หรือกรอกรายละเอียดบ้านไว้แล้ว (หรือลูกค้าส่งลิงก์/รหัสทรัพย์มาเอง)? แชทที่ยังไม่มีข้อมูลบ้าน AI จะไม่ตอบ'
      : 'ให้ AI ตอบได้ทุกแชทโดยไม่ต้องเลือกทรัพย์ก่อน?'
    if (!window.confirm(message)) return
    runBotAction({ action: 'setRequireProperty', required: turningOn })
  }

  async function changeConversationProperty(propertyCode) {
    if (!selectedId) return
    setPropertyBusy(true)
    setActionError('')
    try {
      await callApi({ action: 'setConversationProperty', conversationId: selectedId, propertyCode })
    } catch (propertyError) {
      setActionError(propertyError.message || 'ตั้งค่าทรัพย์ไม่สำเร็จ')
    } finally {
      setPropertyBusy(false)
    }
  }

  async function changeConversationNote(note) {
    if (!selectedId) return false
    setPropertyBusy(true)
    setActionError('')
    try {
      await callApi({ action: 'setConversationNote', conversationId: selectedId, note })
      return true
    } catch (noteError) {
      setActionError(noteError.message || 'บันทึกรายละเอียดไม่สำเร็จ')
      return false
    } finally {
      setPropertyBusy(false)
    }
  }

  function toggleConversationBot() {
    if (!selectedId) return
    runBotAction({
      action: 'setBotPaused',
      conversationId: selectedId,
      paused: selectedConversation?.botPaused !== true,
    })
  }

  async function handleSend(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!selectedId || !text || sending) return
    if (await runSend({ action: 'reply', text })) setDraft('')
  }

  async function handleImageSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedId || sending) return
    try {
      const { base64, mimeType } = await imageFileToJpegBase64(file)
      await runSend({ action: 'replyImage', imageBase64: base64, mimeType })
    } catch (imageError) {
      setActionError(imageError.message || 'ส่งรูปภาพไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">ข้อความ Facebook</h1>
          <p className="text-sm text-slate-500">
            อ่านและตอบข้อความจากทุกเพจ{totalUnread > 0 ? ` · ยังไม่อ่าน ${totalUnread} ข้อความ` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin() ? (
            <button
              type="button"
              onClick={toggleBotEnabled}
              disabled={botBusy || botLoading}
              aria-pressed={botSettings.enabled}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-50 ${botSettings.enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {botBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
              AI ตอบอัตโนมัติ: {botLoading ? '…' : botSettings.enabled ? 'เปิด' : 'ปิด'}
            </button>
          ) : (
            <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${botSettings.enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-500'}`}>
              <Bot className="h-4 w-4" aria-hidden="true" />
              AI ตอบอัตโนมัติ: {botLoading ? '…' : botSettings.enabled ? 'เปิด' : 'ปิด'}
            </span>
          )}
          {isSuperAdmin() ? (
            <button
              type="button"
              onClick={toggleRequireProperty}
              disabled={botBusy || botLoading}
              aria-pressed={botSettings.requirePropertyForBot === true}
              title="เมื่อเปิด AI จะตอบเฉพาะแชทที่เลือกทรัพย์หรือกรอกรายละเอียดบ้านไว้แล้ว"
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-50 ${botSettings.requirePropertyForBot === true ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              ต้องมีข้อมูลบ้านก่อน: {botLoading ? '…' : botSettings.requirePropertyForBot === true ? 'เปิด' : 'ปิด'}
            </button>
          ) : botSettings.requirePropertyForBot === true && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
              <Home className="h-4 w-4" aria-hidden="true" />
              ต้องมีข้อมูลบ้านก่อน: เปิด
            </span>
          )}
          <label className="sr-only" htmlFor="messenger-page-filter">กรองตามเพจ</label>
          <select
            id="messenger-page-filter"
            value={pageFilter}
            onChange={event => setPageFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
          >
            <option value="all">ทุกเพจ ({pageNames.size})</option>
            {[...pageNames.entries()].map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPageManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            จัดการเพจ
          </button>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className={`relative grid h-[calc(100vh-190px)] min-h-[560px] grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_1fr] ${contactOpen && selectedConversation ? 'xl:grid-cols-[320px_1fr_340px]' : ''}`}>
        <aside className={`${mobileChatOpen ? 'hidden' : 'flex'} min-h-0 flex-col border-r border-slate-200 md:flex`}>
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label className="sr-only" htmlFor="messenger-search">ค้นหาห้องสนทนา</label>
              <input
                id="messenger-search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อ เบอร์ อีเมล ข้อความ…"
                className="w-full rounded-xl bg-slate-100 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-700" aria-label="กำลังโหลด…" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500">
                <MessageCircle className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
                <p className="text-sm">{conversations.length ? 'ไม่พบห้องสนทนาที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อความจาก Facebook'}</p>
                <p className="mt-1 text-xs">ข้อความใหม่จะแสดงที่นี่อัตโนมัติ</p>
              </div>
            ) : (
              filteredConversations.map(conversation => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left hover:bg-slate-50 ${selectedId === conversation.id ? 'bg-blue-50' : ''}`}
                >
                  <Avatar src={conversation.profilePicUrl} name={customerName(conversation)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm text-slate-900 ${conversation.unreadCount ? 'font-bold' : 'font-semibold'}`}>
                        {customerName(conversation)}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${conversation.unreadCount ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                        {conversation.lastDirection === 'outgoing' ? 'คุณ: ' : ''}
                        {conversation.lastMessageText}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[10px] font-bold text-white">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PageBadge name={conversation.pageName || pageNames.get(conversation.pageId)} />
                      {conversation.leadCapturedAt && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          ได้ข้อมูลติดต่อแล้ว
                        </span>
                      )}
                      {conversation.needsHuman && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          รอเจ้าหน้าที่
                        </span>
                      )}
                      {conversation.needsProperty && !conversation.currentPropertyCode && !conversation.staffNote && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                          รอรายละเอียดบ้าน
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`${mobileChatOpen ? 'flex' : 'hidden'} min-h-0 flex-col md:flex`}>
          {!selectedConversation ? (
            <div className="hidden h-full flex-col items-center justify-center text-slate-500 md:flex">
              <div className="mb-4 rounded-full bg-slate-100 p-5">
                <MessageCircle className="h-10 w-10 text-slate-400" aria-hidden="true" />
              </div>
              <p className="font-medium">เลือกห้องสนทนาเพื่ออ่านข้อความ</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                  aria-label="กลับไปรายการข้อความ"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar src={selectedConversation.profilePicUrl} name={customerName(selectedConversation)} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-slate-900">{customerName(selectedConversation)}</h2>
                  <p className="truncate text-xs text-slate-500">
                    ผ่านเพจ {selectedConversation.pageName || pageNames.get(selectedConversation.pageId) || selectedConversation.pageId}
                    {selectedConversation.contact?.phone ? ` · ${selectedConversation.contact.phone}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleConversationBot}
                  disabled={botBusy || (selectedConversation.botPaused === true && botSettings.requirePropertyForBot === true && !selectedConversation.currentPropertyCode && !selectedConversation.staffNote)}
                  aria-pressed={selectedConversation.botPaused !== true}
                  title={selectedConversation.botPaused === true ? (botSettings.requirePropertyForBot === true && !selectedConversation.currentPropertyCode && !selectedConversation.staffNote ? 'เลือกทรัพย์หรือกรอกรายละเอียดบ้านก่อน จึงจะเปิดให้ AI ตอบได้' : 'AI หยุดตอบแชทนี้อยู่ กดเพื่อให้ AI ตอบต่อ') : 'AI ตอบแชทนี้ได้ กดเพื่อหยุด AI แล้วตอบเอง'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50 ${selectedConversation.botPaused === true ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{selectedConversation.botPaused === true ? 'AI หยุด · เปิดต่อ' : (botSettings.requirePropertyForBot === true && !selectedConversation.currentPropertyCode && !selectedConversation.staffNote) ? 'AI รอรายละเอียดบ้าน · หยุด' : 'AI ตอบอยู่ · หยุด'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(open => !open)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${contactOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  aria-pressed={contactOpen}
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">ข้อมูลลูกค้า</span>
                </button>
              </div>

              <PropertyBar
                key={selectedConversation.id}
                conversation={selectedConversation}
                options={propertyOptions}
                required={botSettings.requirePropertyForBot === true}
                busy={propertyBusy}
                onSet={changeConversationProperty}
                onClear={() => changeConversationProperty('')}
                onSaveNote={changeConversationNote}
              />

              {selectedConversation.needsHuman && (
                <div className="flex gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  AI ส่งต่อแชทนี้ให้เจ้าหน้าที่{selectedConversation.handoffReason ? ` (${selectedConversation.handoffReason})` : ''} · AI หยุดตอบแล้ว กด &quot;เปิดต่อ&quot; เมื่อต้องการให้ AI ตอบอีกครั้ง
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-700" aria-label="กำลังโหลด…" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(message => {
                      const outgoing = message.direction === 'outgoing'
                      const imageOnly = !message.text && message.attachments?.every(item => item.type === 'image')
                      return (
                        <div key={message.id} className={`flex items-end gap-2 ${outgoing ? 'justify-end' : 'justify-start'}`}>
                          {!outgoing && (
                            <Avatar src={selectedConversation.profilePicUrl} name={customerName(selectedConversation)} size="sm" />
                          )}
                          <div className={`max-w-[80%] sm:max-w-[65%] ${imageOnly ? '' : `rounded-2xl px-4 py-2.5 shadow-sm ${outgoing ? 'rounded-br-md bg-blue-700 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}`}>
                            {message.text && (
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
                            )}
                            {message.attachments?.length > 0 && (
                              <div className={`space-y-2 ${message.text ? 'mt-2' : ''}`}>
                                {message.attachments.map((attachment, index) => (
                                  <Attachment key={`${attachment.url || attachment.type}-${index}`} attachment={attachment} outgoing={outgoing} />
                                ))}
                              </div>
                            )}
                            <div className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${outgoing && !imageOnly ? 'text-blue-100' : 'text-slate-400'}`}>
                              {message.sentBy === 'ai' && (
                                <span className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => rateAiMessage(message.id, 'good')}
                                    aria-label="คำตอบ AI ดี"
                                    aria-pressed={message.aiFeedback?.rating === 'good'}
                                    className={`rounded p-0.5 hover:bg-white/20 ${message.aiFeedback?.rating === 'good' ? 'text-white' : 'opacity-60'}`}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => rateAiMessage(message.id, 'bad')}
                                    aria-label="คำตอบ AI ไม่ดี"
                                    aria-pressed={message.aiFeedback?.rating === 'bad'}
                                    className={`rounded p-0.5 hover:bg-white/20 ${message.aiFeedback?.rating === 'bad' ? 'text-amber-300' : 'opacity-60'}`}
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </span>
                              )}
                              <span>{message.sentBy === 'ai' ? 'AI · ' : ''}{formatDateTime(message.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {outsideWindow && (
                <div className="flex gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ลูกค้าทักมาล่าสุดเกิน 24 ชั่วโมง Facebook อาจไม่ให้ส่งข้อความจนกว่าลูกค้าจะทักมาใหม่
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 sm:p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="ส่งรูปภาพ"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <label className="sr-only" htmlFor="messenger-draft">ข้อความตอบกลับ</label>
                <textarea
                  id="messenger-draft"
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="พิมพ์ข้อความตอบกลับ…"
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40"
                  aria-label="ส่งข้อความ"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </form>
            </>
          )}
        </section>

        {contactOpen && selectedConversation && (
          <aside className="absolute inset-y-0 right-0 z-20 min-h-0 w-full max-w-sm overflow-hidden border-l border-slate-200 shadow-xl xl:static xl:z-auto xl:max-w-none xl:shadow-none">
            <ContactPanel
              key={selectedConversation.id}
              conversation={selectedConversation}
              onClose={() => setContactOpen(false)}
              callApi={callApi}
            />
          </aside>
        )}
      </div>

      {pageManagerOpen && (
        <PageManager pages={pages} onClose={() => setPageManagerOpen(false)} callApi={callApi} />
      )}
    </div>
  )
}
