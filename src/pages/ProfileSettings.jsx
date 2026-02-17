import { useState, useEffect } from 'react'
import { usePublicAuth } from '../context/PublicAuthContext'
import { useNavigate } from 'react-router-dom'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth'
import { doc, getDoc, updateDoc, query, where, getDocs, collection, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { publicAuth, publicDb, publicStorage } from '../lib/firebase'
import { compressImage } from '../lib/imageCompressor'
import PageLayout from '../components/PageLayout'
import { User, Phone, MessageCircle, Facebook, ImagePlus, Lock, X, Save } from 'lucide-react'

export default function ProfileSettings() {
  const { user, userRole, isAgent } = usePublicAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    phone: '',
    lineId: '',
    facebookUrl: '',
    username: '',
    photoURL: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    // Only allow agent to access this page
    if (!isAgent()) {
      navigate('/')
      return
    }

    loadUserData()
  }, [user, navigate, isAgent])

  const loadUserData = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(publicDb, 'users', user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          nickname: data.nickname || '',
          phone: data.phone || '',
          lineId: data.lineId || '',
          facebookUrl: data.facebookUrl || '',
          username: data.username || (user.email?.split('@')[0] || ''),
          photoURL: data.photoURL || user.photoURL || '',
        })
      } else {
        // Initialize with email username
        const emailUsername = user.email?.split('@')[0] || ''
        setForm({
          firstName: '',
          lastName: '',
          nickname: '',
          phone: '',
          lineId: '',
          facebookUrl: '',
          username: emailUsername,
          photoURL: '',
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const validateUsername = (username) => {
    // Only English letters and numbers
    return /^[a-zA-Z0-9]+$/.test(username)
  }

  const checkUsernameExists = async (username, currentUserId) => {
    if (!username || username === (user.email?.split('@')[0] || '')) return false

    const q = query(collection(publicDb, 'users'), where('username', '==', username))
    const snapshot = await getDocs(q)
    return snapshot.docs.some((doc) => doc.id !== currentUserId)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    setUploadingPhoto(true)
    setErrorMessage(null)

    try {
      // Delete old photo if exists
      if (form.photoURL && form.photoURL.includes('firebasestorage')) {
        try {
          const oldRef = ref(publicStorage, form.photoURL)
          await deleteObject(oldRef)
        } catch (err) {
          console.error('Error deleting old photo:', err)
        }
      }

      // Compress image
      const compressedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800 })

      // Upload to Firebase Storage
      const storageRef = ref(publicStorage, `agents/${user.uid}/${Date.now()}_${compressedFile.name}`)
      await uploadBytes(storageRef, compressedFile)
      const downloadURL = await getDownloadURL(storageRef)

      setForm((prev) => ({ ...prev, photoURL: downloadURL }))
      setSuccessMessage('อัปโหลดรูปภาพสำเร็จ')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error uploading photo:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!form.photoURL) return

    try {
      if (form.photoURL.includes('firebasestorage')) {
        const photoRef = ref(publicStorage, form.photoURL)
        await deleteObject(photoRef)
      }

      setForm((prev) => ({ ...prev, photoURL: '' }))
      setSuccessMessage('ลบรูปภาพสำเร็จ')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error removing photo:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการลบรูปภาพ')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Validate username
      if (!form.username.trim()) {
        setErrorMessage('กรุณากรอก Username')
        setSaving(false)
        return
      }

      if (!validateUsername(form.username)) {
        setErrorMessage('Username ต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น')
        setSaving(false)
        return
      }

      // Check username uniqueness
      const usernameExists = await checkUsernameExists(form.username.trim(), user.uid)
      if (usernameExists) {
        setErrorMessage('Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น')
        setSaving(false)
        return
      }

      // Update Firestore
      await updateDoc(doc(publicDb, 'users', user.uid), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nickname: form.nickname.trim(),
        phone: form.phone.trim(),
        lineId: form.lineId.trim(),
        facebookUrl: form.facebookUrl.trim(),
        username: form.username.trim(),
        photoURL: form.photoURL,
        updatedAt: serverTimestamp(),
      })

      // Update Firebase Auth profile
      if (form.photoURL) {
        await updateProfile(publicAuth.currentUser, {
          photoURL: form.photoURL,
          displayName: form.username.trim(),
        })
      }

      setSuccessMessage('บันทึกข้อมูลสำเร็จ')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setChangingPassword(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { currentPassword, newPassword, confirmPassword } = passwordForm

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        setErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน')
        setChangingPassword(false)
        return
      }

      if (newPassword.length < 6) {
        setErrorMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
        setChangingPassword(false)
        return
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage('รหัสผ่านใหม่ไม่ตรงกัน')
        setChangingPassword(false)
        return
      }

      if (currentPassword === newPassword) {
        setErrorMessage('รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม')
        setChangingPassword(false)
        return
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(publicAuth.currentUser, credential)

      // Update password
      await updatePassword(publicAuth.currentUser, newPassword)

      setSuccessMessage('เปลี่ยนรหัสผ่านสำเร็จ')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error changing password:', error)
      if (error.code === 'auth/wrong-password') {
        setErrorMessage('รหัสผ่านเดิมไม่ถูกต้อง')
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('รหัสผ่านใหม่ไม่แข็งแรงพอ')
      } else {
        setErrorMessage('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <PageLayout heroTitle="ตั้งค่าโปรไฟล์" heroSubtitle="" showHero={false}>
        <div className="min-h-[60vh] bg-slate-50 py-12 flex items-center justify-center">
          <p className="text-slate-600">กำลังโหลดข้อมูล...</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout heroTitle="ตั้งค่าโปรไฟล์" heroSubtitle="" showHero={false}>
      <div className="min-h-[60vh] bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Profile Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
              <User className="h-6 w-6" />
              ข้อมูลโปรไฟล์
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">รูปโปรไฟล์</label>
                <div className="flex items-center gap-4">
                  {form.photoURL ? (
                    <div className="relative">
                      <img
                        src={form.photoURL}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition cursor-pointer">
                      <ImagePlus className="h-5 w-5" />
                      {uploadingPhoto ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2">รูปภาพจะถูกบีบอัดอัตโนมัติ</p>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="username"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">ภาษาอังกฤษหรือตัวเลขเท่านั้น</p>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อ</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="ชื่อ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">นามสกุล</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="นามสกุล"
                  />
                </div>
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อเล่น</label>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="ชื่อเล่น"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="0812345678"
                />
              </div>

              {/* Line ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Line ID
                </label>
                <input
                  type="text"
                  value={form.lineId}
                  onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="line_id"
                />
              </div>

              {/* Facebook URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={form.facebookUrl}
                  onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="https://facebook.com/yourprofile"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">อีเมล</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">ไม่สามารถแก้ไขอีเมลได้</p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
              <Lock className="h-6 w-6" />
              เปลี่ยนรหัสผ่าน
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่านเดิม</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="กรอกรหัสผ่านเดิม"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="h-5 w-5" />
                  {changingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
