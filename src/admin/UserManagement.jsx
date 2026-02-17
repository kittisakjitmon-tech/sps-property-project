import { useState, useEffect, useMemo } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { getUsersSnapshot, updateUserRole, deleteUser, suspendUser, unsuspendUser } from '../lib/users'
import { createAuditLog } from '../lib/firestore'
import AddMemberModal from '../components/AddMemberModal'
import {
  Users,
  Shield,
  User,
  UserCheck,
  Trash2,
  AlertCircle,
  Check,
  Search,
  Filter,
  X,
  Ban,
  CheckCircle,
  History,
} from 'lucide-react'

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'สมาชิก',
  agent: 'Agent',
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-900 border-purple-300',
  admin: 'bg-blue-100 text-blue-900 border-blue-300',
  member: 'bg-slate-100 text-slate-900 border-slate-300',
  agent: 'bg-emerald-100 text-emerald-900 border-emerald-300',
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-900 border-green-300',
  suspended: 'bg-red-100 text-red-900 border-red-300',
}

// Confirmation Modal Component
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'ยืนยัน', confirmColor = 'bg-blue-900' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-900" />
            </div>
            <h3 className="text-xl font-bold text-blue-900">{title}</h3>
          </div>
          <p className="text-slate-700 mb-6">{message}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 ${confirmColor} text-white rounded-lg hover:opacity-90 transition font-medium`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const { user, userRole, isSuperAdmin } = useAdminAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [changingRole, setChangingRole] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [suspendingId, setSuspendingId] = useState(null)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'delete', 'suspend', 'unsuspend', 'role', 'initial_setup'
    userId: null,
    userEmail: null,
    newRole: null,
    oldRole: null,
  })

  // Check if there are any super admins
  const hasSuperAdmin = useMemo(() => {
    return users.some((u) => u.role === 'super_admin')
  }, [users])

  // Allow access if user is super admin OR if no super admin exists yet
  const canAccess = isSuperAdmin() || !hasSuperAdmin

  useEffect(() => {
    if (!user) return

    const unsub = getUsersSnapshot((userList) => {
      setUsers(userList)
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Filtered users
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.email?.toLowerCase().includes(query) ||
          u.name?.toLowerCase().includes(query)
      )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'suspended') {
        filtered = filtered.filter((u) => u.status === 'suspended')
      } else {
        filtered = filtered.filter((u) => !u.status || u.status === 'active')
      }
    }

    return filtered
  }, [users, searchQuery, roleFilter, statusFilter])

  // Create audit log helper
  const logAuditAction = async (action, targetUserId, targetUserName, details) => {
    try {
      // Only log if super admin exists (audit logs require super admin permission)
      if (hasSuperAdmin) {
        await createAuditLog({
          adminId: user?.uid || '',
          adminName: user?.email || 'Unknown',
          targetUserId,
          targetUserName,
          action,
          details,
        })
      }
    } catch (error) {
      console.error('Error creating audit log:', error)
      // Don't throw - audit logging is best-effort
    }
  }

  const handleRoleChangeClick = (userId, userEmail, oldRole, newRole) => {
    setConfirmModal({
      isOpen: true,
      type: 'role',
      userId,
      userEmail,
      oldRole,
      newRole,
    })
  }

  const handleRoleChangeConfirm = async () => {
    const { userId, userEmail, oldRole, newRole } = confirmModal
    if (!userId || !newRole) return

    setChangingRole(userId)
    setErrorMessage(null)
    setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null, newRole: null, oldRole: null })

    try {
      await updateUserRole(userId, newRole)
      await logAuditAction(
        'CHANGE_ROLE',
        userId,
        userEmail,
        `Changed from ${ROLE_LABELS[oldRole] || oldRole} to ${ROLE_LABELS[newRole]}`
      )
      setSuccessMessage(`เปลี่ยนระดับสิทธิ์เป็น "${ROLE_LABELS[newRole]}" สำเร็จ`)
      
      // If this is initial setup, reload page to refresh auth context
      if (confirmModal.type === 'initial_setup') {
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error) {
      console.error('Error updating role:', error)
      setErrorMessage('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setChangingRole(null)
    }
  }

  const handleInitialSetup = () => {
    if (!user) return
    setConfirmModal({
      isOpen: true,
      type: 'initial_setup',
      userId: user.uid,
      userEmail: user.email,
      oldRole: userRole || 'member',
      newRole: 'super_admin',
    })
  }

  const handleDeleteClick = (userId, userEmail) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      userId,
      userEmail,
    })
  }

  const handleDeleteConfirm = async () => {
    const { userId, userEmail } = confirmModal
    if (!userId) return

    setDeletingId(userId)
    setErrorMessage(null)
    setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null })

    try {
      await deleteUser(userId)
      await logAuditAction('DELETE_USER', userId, userEmail, `Deleted user: ${userEmail}`)
      setSuccessMessage('ลบผู้ใช้สำเร็จ')
    } catch (error) {
      console.error('Error deleting user:', error)
      setErrorMessage('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSuspendClick = (userId, userEmail, isSuspended) => {
    setConfirmModal({
      isOpen: true,
      type: isSuspended ? 'unsuspend' : 'suspend',
      userId,
      userEmail,
    })
  }

  const handleSuspendConfirm = async () => {
    const { userId, userEmail, type } = confirmModal
    if (!userId) return

    setSuspendingId(userId)
    setErrorMessage(null)
    setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null })

    try {
      if (type === 'suspend') {
        await suspendUser(userId)
        await logAuditAction('SUSPEND_USER', userId, userEmail, 'User account suspended')
        setSuccessMessage('ระงับการใช้งานสำเร็จ')
      } else {
        await unsuspendUser(userId)
        await logAuditAction('UNSUSPEND_USER', userId, userEmail, 'User account unsuspended')
        setSuccessMessage('ยกเลิกการระงับการใช้งานสำเร็จ')
      }
    } catch (error) {
      console.error('Error suspending/unsuspending user:', error)
      setErrorMessage('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setSuspendingId(null)
    }
  }

  const getConfirmModalProps = () => {
    const { type, userEmail, newRole, oldRole } = confirmModal
    switch (type) {
      case 'delete':
        return {
          title: 'ยืนยันการลบผู้ใช้',
          message: `ต้องการลบผู้ใช้ "${userEmail}" หรือไม่?\n\nการกระทำนี้ไม่สามารถยกเลิกได้`,
          confirmText: 'ลบ',
          confirmColor: 'bg-red-600',
          onConfirm: handleDeleteConfirm,
        }
      case 'suspend':
        return {
          title: 'ยืนยันการระงับการใช้งาน',
          message: `ต้องการระงับการใช้งานของ "${userEmail}" หรือไม่?\n\nผู้ใช้จะไม่สามารถเข้าสู่ระบบได้`,
          confirmText: 'ระงับ',
          confirmColor: 'bg-red-600',
          onConfirm: handleSuspendConfirm,
        }
      case 'unsuspend':
        return {
          title: 'ยืนยันการยกเลิกการระงับ',
          message: `ต้องการยกเลิกการระงับการใช้งานของ "${userEmail}" หรือไม่?`,
          confirmText: 'ยกเลิกการระงับ',
          confirmColor: 'bg-green-600',
          onConfirm: handleSuspendConfirm,
        }
      case 'role':
        return {
          title: 'ยืนยันการเปลี่ยนระดับสิทธิ์',
          message: `ต้องการเปลี่ยนระดับสิทธิ์ของ "${userEmail}" จาก "${ROLE_LABELS[oldRole] || oldRole}" เป็น "${ROLE_LABELS[newRole]}" หรือไม่?`,
          confirmText: 'ยืนยัน',
          confirmColor: 'bg-blue-900',
          onConfirm: handleRoleChangeConfirm,
        }
      case 'initial_setup':
        return {
          title: 'ตั้งค่า Super Admin แรก',
          message: `คุณกำลังจะตั้งค่าตัวเองเป็น Super Admin คนแรกของระบบ\n\nอีเมล: ${userEmail}\n\nหลังจากนี้คุณจะสามารถจัดการสมาชิกทั้งหมดได้`,
          confirmText: 'ตั้งค่าเป็น Super Admin',
          confirmColor: 'bg-purple-600',
          onConfirm: handleRoleChangeConfirm,
        }
      default:
        return {
          title: '',
          message: '',
          confirmText: 'ยืนยัน',
          confirmColor: 'bg-blue-900',
          onConfirm: () => {},
        }
    }
  }

  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-red-700">เฉพาะ Super Admin เท่านั้นที่สามารถเข้าถึงหน้านี้ได้</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-slate-600">กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  const superAdmins = users.filter((u) => u.role === 'super_admin')
  const admins = users.filter((u) => u.role === 'admin')
  const members = users.filter((u) => u.role === 'member')
  const suspended = users.filter((u) => u.status === 'suspended')

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-900" />
            <h1 className="text-3xl font-bold text-blue-900">จัดการสมาชิก</h1>
          </div>
          {hasSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition font-semibold shadow-sm"
            >
              + เพิ่มสมาชิก
            </button>
          )}
        </div>
        <p className="text-slate-600">
          จัดการระดับสิทธิ์และสมาชิกทั้งหมด ({users.length} คน)
        </p>
      </div>

      {/* Initial Setup Banner - Show if no super admin exists */}
      {!hasSuperAdmin && user && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-purple-900" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-purple-900 mb-2">
                ตั้งค่า Super Admin แรก
              </h3>
              <p className="text-slate-700 mb-4">
                ระบบยังไม่มี Super Admin กรุณาตั้งค่าตัวเองเป็น Super Admin เพื่อเริ่มใช้งานระบบจัดการสมาชิก
              </p>
              <button
                type="button"
                onClick={handleInitialSetup}
                disabled={changingRole === user.uid}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Shield className="h-5 w-5" />
                {changingRole === user.uid ? 'กำลังตั้งค่า...' : 'ตั้งค่าเป็น Super Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-red-100 rounded transition"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-purple-900" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Super Admin</p>
              <p className="text-2xl font-bold text-purple-900">{superAdmins.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-blue-900" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Admin</p>
              <p className="text-2xl font-bold text-blue-900">{admins.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <p className="text-sm text-slate-600">สมาชิก</p>
              <p className="text-2xl font-bold text-slate-900">{members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-900" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Agent</p>
              <p className="text-2xl font-bold text-emerald-900">{users.filter((u) => u.role === 'agent').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <Ban className="h-6 w-6 text-red-900" />
            </div>
            <div>
              <p className="text-sm text-slate-600">ระงับการใช้งาน</p>
              <p className="text-2xl font-bold text-red-900">{suspended.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 appearance-none bg-white"
            >
              <option value="all">ทุกระดับสิทธิ์</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="member">สมาชิก</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 appearance-none bg-white"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งานปกติ</option>
              <option value="suspended">ระงับการใช้งาน</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">อีเมล</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">ระดับสิทธิ์</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">สถานะ</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase">สร้างเมื่อ</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isSuspended = u.status === 'suspended'
                const currentRole = u.role || 'member'
                
                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50 transition ${
                      isSuspended ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{u.email || '-'}</p>
                      {u.name && <p className="text-sm text-slate-500">{u.name}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={currentRole}
                        onChange={(e) =>
                          handleRoleChangeClick(u.id, u.email, currentRole, e.target.value)
                        }
                        disabled={changingRole === u.id || isSuspended || (!hasSuperAdmin && u.id !== user?.uid)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition ${
                          ROLE_COLORS[currentRole]
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <option value="member">สมาชิก</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="agent">Agent</option>
                      </select>
                      {changingRole === u.id && (
                        <span className="ml-2 text-xs text-slate-500">กำลังอัปเดต...</span>
                      )}
                      {!hasSuperAdmin && u.id !== user?.uid && (
                        <span className="ml-2 text-xs text-yellow-600">รอตั้งค่า Super Admin ก่อน</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border-2 ${
                          isSuspended
                            ? STATUS_COLORS.suspended
                            : STATUS_COLORS.active
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <Ban className="h-3 w-3" />
                            ระงับการใช้งาน
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            ใช้งานปกติ
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {u.createdAt?.toDate
                        ? u.createdAt.toDate().toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {hasSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSuspendClick(u.id, u.email, isSuspended)}
                              disabled={suspendingId === u.id}
                              className={`p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSuspended
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-orange-600 hover:bg-orange-50'
                              }`}
                              title={isSuspended ? 'ยกเลิกการระงับ' : 'ระงับการใช้งาน'}
                            >
                              {isSuspended ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(u.id, u.email)}
                              disabled={deletingId === u.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {!hasSuperAdmin && (
                          <span className="text-xs text-slate-400">รอตั้งค่า Super Admin ก่อน</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'ไม่พบผลลัพธ์ที่ตรงกับเงื่อนไข'
                : 'ยังไม่มีสมาชิก'}
            </p>
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                }}
                className="text-blue-900 hover:underline text-sm"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      {filteredUsers.length > 0 && (
        <div className="mt-4 text-sm text-slate-600 text-center">
          แสดงผล {filteredUsers.length} จาก {users.length} รายการ
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, type: null, userId: null, userEmail: null, newRole: null, oldRole: null })
        }
        {...getConfirmModalProps()}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={(message) => {
          setSuccessMessage(message)
          setIsAddMemberOpen(false)
        }}
      />
    </div>
  )
}
