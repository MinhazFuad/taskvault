'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

const ROLE_COLORS: Record<string, string> = {
  Student:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Corporate:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Instructor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Admin:      'bg-red-500/10 text-red-400 border-red-500/20',
};

const ROLES = ['All', 'Student', 'Corporate', 'Instructor', 'Admin'];

type User = {
  User_ID: number;
  Full_Name: string;
  Email: string;
  Username: string | null;
  Role: string;
  Is_Banned: number;
  Created_At: string;
  Profile_Picture: string | null;
  Rep_Points: number;
  Company_Name: string | null;
  Wallet_Balance: number;
  Bounties_Completed: number;
  Bounties_Posted: number;
  Courses_Created: number;
};

type EditForm = {
  fullName: string;
  email: string;
  role: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ fullName: '', email: '', role: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: roleFilter, search: debouncedSearch });
      const res = await fetch(`/api/admin/users?${params}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setUsers(json.data);
      else setError(json.error || 'Failed to load users');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, debouncedSearch]);

  // Auth guard + initial load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(json => {
        if (!json.success || json.user.role !== 'Admin') router.push('/dashboard');
      });
  }, [router]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ fullName: user.Full_Name, email: user.Email, role: user.Role });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${editUser.User_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editForm.fullName.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditUser(null);
        await fetchUsers();
      } else {
        setEditError(json.error || 'Failed to save changes.');
      }
    } catch {
      setEditError('Network error.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleBan = async (user: User) => {
    const newBanned = !user.Is_Banned;
    const action = newBanned ? 'ban' : 'unban';
    if (!confirm(`Are you sure you want to ${action} ${user.Full_Name}?`)) return;

    setActionLoading(user.User_ID);
    try {
      const res = await fetch(`/api/admin/users/${user.User_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: newBanned }),
      });
      const json = await res.json();
      if (json.success) await fetchUsers();
      else alert(json.error || `Failed to ${action} user.`);
    } catch {
      alert('Network error.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.User_ID}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        await fetchUsers();
      } else {
        alert(json.error || 'Failed to delete user.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Admin" />

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Account</h3>
                <p className="text-slate-400 text-sm mt-0.5">User ID #{editUser.User_ID}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-slate-500 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            {editError && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3 rounded-xl">{editError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.fullName}
                  onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Role</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="Student">Student</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Admin">Admin</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Changing role creates required profile records automatically.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-7 max-w-sm w-full shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <svg className="w-10 h-10 text-orange-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="text-lg font-bold text-white">Delete Account?</h3>
              <p className="text-slate-400 text-sm">
                This will permanently delete <strong className="text-white">{deleteTarget.Full_Name}</strong> and all their associated data. This cannot be undone.
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-xs space-y-1 text-slate-400">
              <p>Role: <span className="font-bold text-white">{deleteTarget.Role}</span></p>
              <p>Email: <span className="font-mono text-slate-300">{deleteTarget.Email}</span></p>
              {deleteTarget.Role === 'Student' && <p className="text-orange-400 font-semibold flex items-start gap-1.5"><svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Active bounties will be unassigned and returned to Open.</p>}
              {deleteTarget.Role === 'Corporate' && <p className="text-orange-400 font-semibold flex items-start gap-1.5"><svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>All posted bounties and escrow records will be deleted.</p>}
              {deleteTarget.Role === 'Instructor' && <p className="text-orange-400 font-semibold flex items-start gap-1.5"><svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>All courses and student progress will be deleted.</p>}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/dashboard" className="text-red-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Control Panel</Link>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-slate-400 text-sm mt-1">Edit, ban, or delete any account on the platform.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Showing</span>
            <span className="text-xl font-extrabold text-white">{users.length} users</span>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Role tabs */}
          <div className="flex gap-1 bg-slate-900/80 border border-slate-700 p-1 rounded-xl">
            {ROLES.map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${roleFilter === r ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center text-sm font-semibold">{error}</div>
        )}

        {/* TABLE */}
        {loading ? (
          <div className="text-slate-400 text-center py-16 animate-pulse font-medium">Loading user registry...</div>
        ) : users.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            No users match the current filters.
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60">
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Details</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(user => {
                    const isActing = actionLoading === user.User_ID;
                    return (
                      <tr key={user.User_ID} className={`hover:bg-slate-700/20 transition-colors ${user.Is_Banned ? 'opacity-60' : ''}`}>

                        {/* USER */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${user.Is_Banned ? 'bg-red-900/40 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                              {user.Profile_Picture ? (
                                <img src={user.Profile_Picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                user.Full_Name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-xs truncate">{user.Full_Name}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">{user.Email}</p>
                              {user.Username && <p className="text-[10px] text-blue-400 font-mono">@{user.Username}</p>}
                            </div>
                          </div>
                        </td>

                        {/* ROLE */}
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[user.Role] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {user.Role}
                          </span>
                        </td>

                        {/* DETAILS */}
                        <td className="px-5 py-4 hidden md:table-cell text-[11px] text-slate-400 space-y-0.5">
                          {user.Role === 'Student' && (
                            <>
                              <p><span className="text-slate-600">RP:</span> <span className="font-bold text-blue-400">{user.Rep_Points}</span></p>
                              <p><span className="text-slate-600">Bounties:</span> {user.Bounties_Completed} done</p>
                            </>
                          )}
                          {user.Role === 'Corporate' && (
                            <>
                              <p className="font-semibold text-slate-300 truncate max-w-[140px]">{user.Company_Name}</p>
                              <p><span className="text-slate-600">Posted:</span> {user.Bounties_Posted}</p>
                            </>
                          )}
                          {user.Role === 'Instructor' && (
                            <p><span className="text-slate-600">Courses:</span> {user.Courses_Created}</p>
                          )}
                          {user.Role === 'Admin' && <p className="text-red-400 font-bold text-[10px]">Full Access</p>}
                          <p><span className="text-slate-600">Wallet:</span> ${parseFloat(user.Wallet_Balance.toString()).toFixed(2)}</p>
                        </td>

                        {/* JOINED */}
                        <td className="px-5 py-4 text-[11px] text-slate-500 hidden lg:table-cell">
                          {user.Created_At ? new Date(user.Created_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-4">
                          {user.Is_Banned ? (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase">Banned</span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">Active</span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(user)}
                              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleToggleBan(user)}
                              disabled={isActing}
                              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-wider border disabled:opacity-40 ${
                                user.Is_Banned
                                  ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                                  : 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20'
                              }`}
                            >
                              {isActing ? '...' : user.Is_Banned ? 'Unban' : 'Ban'}
                            </button>

                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                            >
                              Delete
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
