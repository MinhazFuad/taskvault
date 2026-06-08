'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

/* ──────────────────────────────────────────────
   Types
────────────────────────────────────────────── */
interface Course {
  Title: string;
  Reward_Skill: string;
  Reward_RP: number;
  Completed_At: string;
}

interface BountyReview {
  Bounty_ID: number;
  Title: string;
  Company_Name: string;
  Corporate_Rating: number;
  Corporate_Review: string | null;
  Completed_At: string;
}

interface ProfileData {
  Full_Name: string;
  Email: string;
  Username: string;
  Role: string;
  Profile_Picture: string | null;
  Banner_Image: string | null;
  Bio: string | null;
  Headline: string | null;
  Location: string | null;
  LinkedIn_URL: string | null;
  GitHub_URL: string | null;
  Created_At: string;
  Available_Rep_Points: number;
  Skill_Level: string;
  Available_Credits: number;
  courses: Course[];
  skills: string[];
  reviews: BountyReview[];
}

/* ──────────────────────────────────────────────
   Certificate PDF
────────────────────────────────────────────── */
async function downloadCertificate(
  studentName: string,
  courseTitle: string,
  completionDate: string,
  rewardSkill: string
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, cx = W / 2;

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(252, 252, 251);
  doc.rect(10, 10, W - 20, H - 20, 'F');

  // Outer border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, W - 20, H - 20);
  // Inner border
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.rect(14, 14, W - 28, H - 28);

  // Corner accents (L-shapes)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(10, 22, 10, 10);   doc.line(10,  10, 22,  10);
  doc.line(W - 22, 10, W - 10, 10);  doc.line(W - 10, 10, W - 10, 22);
  doc.line(10, H - 22, 10, H - 10);  doc.line(10, H - 10, 22, H - 10);
  doc.line(W - 22, H - 10, W - 10, H - 10); doc.line(W - 10, H - 10, W - 10, H - 22);

  // Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('T A S K V A U L T', cx, 27, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('L E A R N I N G   P L A T F O R M', cx, 33, { align: 'center' });

  // Blue accent line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.6);
  doc.line(cx - 55, 38, cx + 55, 38);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text('Certificate of Completion', cx, 57, { align: 'center' });

  // Intro
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('This is to certify that', cx, 73, { align: 'center' });

  // Student name (Times bold italic for elegance)
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  doc.text(studentName, cx, 92, { align: 'center' });
  const nw = doc.getTextWidth(studentName);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(cx - nw * 0.55, 96, cx + nw * 0.55, 96);

  // Body text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('has successfully completed', cx, 108, { align: 'center' });

  // Course title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(courseTitle, 180);
  doc.text(titleLines, cx, 121, { align: 'center' });
  const afterTitle = 121 + (titleLines.length - 1) * 7;

  // Skill badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(59, 130, 246);
  doc.text(`[ ${rewardSkill} ]`, cx, afterTitle + 11, { align: 'center' });

  // Bottom accent line
  const lineY = afterTitle + 20;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.6);
  doc.line(cx - 55, lineY, cx + 55, lineY);

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Completed on  ${completionDate}`, cx, lineY + 12, { align: 'center' });

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('TaskVault Learning Platform', 22, H - 22);
  doc.text('Certificate of Achievement · taskvault.io', W - 22, H - 22, { align: 'right' });

  const safe = courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`taskvault-certificate-${safe}.pdf`);
}

/* ──────────────────────────────────────────────
   CV PDF
────────────────────────────────────────────── */
async function downloadCV(profile: ProfileData) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, mg = 20, cw = W - 2 * mg;
  let y = 22;

  const section = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), mg, y);
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(mg, y, mg + cw, y);
    y += 6;
  };

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.Full_Name, mg, y);
  y += 8;

  // Headline
  if (profile.Headline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(profile.Headline, mg, y);
    y += 6;
  }

  // Contact row
  const contactParts = [profile.Email, profile.Location, profile.GitHub_URL, profile.LinkedIn_URL].filter(Boolean);
  if (contactParts.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const contactStr = contactParts.join('  ·  ') as string;
    const contactLines = doc.splitTextToSize(contactStr, cw);
    doc.text(contactLines, mg, y);
    y += contactLines.length * 4 + 2;
  }

  // Blue rule
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(mg, y, mg + cw, y);
  y += 7;

  // Tier badge
  const badgeLabel = `${profile.Skill_Level} Tier  ·  ${profile.Available_Rep_Points} RP`;
  const bw = doc.getTextWidth(badgeLabel) + 8;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.2);
  doc.roundedRect(mg, y - 4, bw, 8, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text(badgeLabel, mg + 4, y + 1.5);
  y += 13;

  // About
  if (profile.Bio) {
    section('Professional Summary');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(profile.Bio, cw);
    doc.text(lines, mg, y);
    y += lines.length * 4.5 + 8;
  }

  // Skills
  if (profile.skills.length > 0) {
    section('Technical Skills');
    let x = mg;
    for (const skill of profile.skills) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const sw = doc.getTextWidth(skill) + 7;
      if (x + sw > W - mg) { x = mg; y += 9; }
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y - 4.5, sw, 7, 1, 1, 'FD');
      doc.setTextColor(51, 65, 85);
      doc.text(skill, x + 3.5, y + 0.8);
      x += sw + 3;
    }
    y += 14;
  }

  // Courses
  if (profile.courses.length > 0) {
    section('Certifications & Courses');
    for (const c of profile.courses) {
      if (y > 270) { doc.addPage(); y = 20; }
      const date = new Date(c.Completed_At).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(c.Title, cw - 30);
      doc.text(titleLines, mg, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(date, W - mg, y, { align: 'right' });
      y += titleLines.length * 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TaskVault  ·  ${c.Reward_Skill}  ·  +${c.Reward_RP ?? 0} RP`, mg, y);
      y += 4;

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(mg, y, mg + cw, y);
      y += 6;
    }
  }

  // Footer
  const joinYear = profile.Created_At ? new Date(profile.Created_At).getFullYear() : '';
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated from TaskVault Learning Platform  ·  Member since ${joinYear}`, W / 2, 287, { align: 'center' });

  doc.save(`${profile.Full_Name.replace(/\s+/g, '_')}_CV.pdf`);
}

/* ──────────────────────────────────────────────
   Tier config
────────────────────────────────────────────── */
const TIER_CFG: Record<string, { color: string; bg: string; icon: string }> = {
  Junior:       { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',    icon: '🌱' },
  Intermediate: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '⚡' },
  Advanced:     { color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30',  icon: '🔥' },
};

/* ──────────────────────────────────────────────
   Main page
────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();

  const [userId,  setUserId]  = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [certLoading, setCertLoading] = useState<string | null>(null);
  const [cvLoading,   setCvLoading]   = useState(false);

  const [form, setForm] = useState({
    username: '', headline: '', bio: '', location: '', linkedinUrl: '', githubUrl: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  /* load */
  const loadProfile = async (uid: number) => {
    const res = await fetch(`/api/profile?id=${uid}&t=${Date.now()}`).then(r => r.json());
    if (res.success) {
      setProfile(res.data);
      setForm({
        username:    res.data.Username    || '',
        headline:    res.data.Headline    || '',
        bio:         res.data.Bio         || '',
        location:    res.data.Location    || '',
        linkedinUrl: res.data.LinkedIn_URL || '',
        githubUrl:   res.data.GitHub_URL  || '',
      });
    }
  };

  useEffect(() => {
    (async () => {
      const auth = await fetch('/api/auth/me').then(r => r.json());
      if (!auth.success || auth.user.role !== 'Student') { router.push('/dashboard'); return; }
      const uid = auth.user.userId;
      setUserId(uid);
      await loadProfile(uid);
      setLoading(false);
    })();
  }, [router]);

  /* file pickers */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'avatar') { setAvatarFile(file); setAvatarPreview(url); }
    else                   { setBannerFile(file);  setBannerPreview(url); }
  };

  /* save */
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true); setSaveErr('');
    const data = new FormData();
    data.append('userId',      String(userId));
    data.append('username',    form.username);
    data.append('headline',    form.headline);
    data.append('bio',         form.bio);
    data.append('location',    form.location);
    data.append('linkedinUrl', form.linkedinUrl);
    data.append('githubUrl',   form.githubUrl);
    if (avatarFile) data.append('avatar', avatarFile);
    if (bannerFile) data.append('banner', bannerFile);

    const res = await fetch('/api/profile', { method: 'POST', body: data }).then(r => r.json());
    setSaving(false);
    if (res.success) {
      await loadProfile(userId);
      setEditing(false);
      setAvatarFile(null); setAvatarPreview(null);
      setBannerFile(null);  setBannerPreview(null);
    } else {
      setSaveErr(res.error || 'Failed to save.');
    }
  };

  const cancelEdit = () => {
    if (!profile) return;
    setForm({
      username:    profile.Username    || '',
      headline:    profile.Headline    || '',
      bio:         profile.Bio         || '',
      location:    profile.Location    || '',
      linkedinUrl: profile.LinkedIn_URL || '',
      githubUrl:   profile.GitHub_URL  || '',
    });
    setAvatarFile(null); setAvatarPreview(null);
    setBannerFile(null);  setBannerPreview(null);
    setSaveErr(''); setEditing(false);
  };

  /* certificate */
  const handleCert = async (course: Course) => {
    if (!profile) return;
    setCertLoading(course.Title);
    const date = new Date(course.Completed_At).toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    await downloadCertificate(profile.Full_Name, course.Title, date, course.Reward_Skill);
    setCertLoading(null);
  };

  /* CV */
  const handleCV = async () => {
    if (!profile) return;
    setCvLoading(true);
    await downloadCV(profile);
    setCvLoading(false);
  };

  /* loading */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col text-white">
        <TopNav role="Student" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-500 text-sm">Loading profile…</div>
        </div>
      </div>
    );
  }
  if (!profile) return null;

  const tier    = TIER_CFG[profile.Skill_Level] || TIER_CFG.Junior;
  const avatar  = avatarPreview || profile.Profile_Picture || null;
  const banner  = bannerPreview || profile.Banner_Image    || null;
  const joinYear = profile.Created_At ? new Date(profile.Created_At).getFullYear() : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-8 space-y-5 pb-16">

        {/* ── Hero card ── */}
        <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">

          {/* Banner */}
          <div className="relative h-44 bg-slate-800 group overflow-hidden">
            {banner ? (
              <img src={banner} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-800 to-purple-900/30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />

            {editing && (
              <>
                <button
                  onClick={() => bannerRef.current?.click()}
                  className="absolute inset-0 w-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium gap-2"
                >
                  <CameraIcon /> Change Banner
                </button>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'banner')} />
              </>
            )}
          </div>

          {/* Content below banner */}
          <div className="px-6 pb-6 relative">

            {/* Avatar */}
            <div className="absolute -top-14 left-6">
              <div className="relative w-28 h-28 rounded-full ring-4 ring-slate-900 overflow-hidden bg-slate-700 group shadow-xl">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">
                    {profile.Full_Name.charAt(0).toUpperCase()}
                  </div>
                )}
                {editing && (
                  <>
                    <button
                      onClick={() => avatarRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <CameraIcon />
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'avatar')} />
                  </>
                )}
              </div>
            </div>

            {/* Buttons top-right */}
            <div className="flex justify-end pt-3 gap-2 min-h-[40px]">
              {editing ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white transition-colors flex items-center gap-2"
                >
                  <EditIcon />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile info */}
            <div className="mt-10 space-y-3">
              {/* Name */}
              <h1 className="text-2xl font-bold text-white">{profile.Full_Name}</h1>

              {/* Username */}
              {editing ? (
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                  placeholder="@username"
                  className="text-slate-400 text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-blue-500"
                />
              ) : (
                <p className="text-blue-400 font-mono text-sm">@{profile.Username}</p>
              )}

              {/* Headline */}
              {editing ? (
                <input
                  value={form.headline}
                  onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                  placeholder="Add a professional headline…"
                  className="text-slate-300 text-base bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 w-full max-w-lg focus:outline-none focus:border-blue-500"
                />
              ) : (
                profile.Headline && (
                  <p className="text-slate-300 text-base">{profile.Headline}</p>
                )
              )}

              {/* Bio */}
              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  placeholder="Tell the world about yourself…"
                  className="text-slate-400 text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full max-w-2xl focus:outline-none focus:border-blue-500 resize-none"
                />
              ) : (
                profile.Bio && (
                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{profile.Bio}</p>
                )
              )}

              {/* Location + social links */}
              <div className="flex flex-wrap gap-4 items-center pt-1">
                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-sm">📍</span>
                    <input
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="Location"
                      className="text-slate-300 text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 w-40 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  profile.Location && (
                    <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                      <span>📍</span>{profile.Location}
                    </span>
                  )
                )}

                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <LinkedInIcon />
                    <input
                      value={form.linkedinUrl}
                      onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                      placeholder="LinkedIn URL"
                      className="text-slate-300 text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 w-48 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  profile.LinkedIn_URL && (
                    <a href={profile.LinkedIn_URL} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-slate-400 hover:text-blue-400 text-sm transition-colors">
                      <LinkedInIcon /> LinkedIn
                    </a>
                  )
                )}

                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <GitHubIcon />
                    <input
                      value={form.githubUrl}
                      onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))}
                      placeholder="GitHub URL"
                      className="text-slate-300 text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 w-48 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  profile.GitHub_URL && (
                    <a href={profile.GitHub_URL} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                      <GitHubIcon /> GitHub
                    </a>
                  )
                )}

                {joinYear && (
                  <span className="text-slate-600 text-xs ml-auto">Member since {joinYear}</span>
                )}
              </div>

              {saveErr && <p className="text-red-400 text-sm">{saveErr}</p>}
            </div>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* RP */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-2xl font-bold text-blue-400">{profile.Available_Rep_Points}</span>
            </div>
            <span className="text-slate-500 text-xs">Reputation Points</span>
          </div>

          {/* Tier */}
          <div className={`rounded-xl border ${tier.bg} p-4 flex flex-col gap-1`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{tier.icon}</span>
              <span className={`text-xl font-bold ${tier.color}`}>{profile.Skill_Level}</span>
            </div>
            <span className="text-slate-500 text-xs">Skill Tier</span>
          </div>

          {/* Courses */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-2xl font-bold text-emerald-400">{profile.courses.length}</span>
            </div>
            <span className="text-slate-500 text-xs">Courses Completed</span>
          </div>

          {/* Skills */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-2xl font-bold text-purple-400">{profile.skills.length}</span>
            </div>
            <span className="text-slate-500 text-xs">Skills Unlocked</span>
          </div>
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Left column */}
          <div className="md:col-span-1 space-y-5">

            {/* About */}
            {profile.Bio && !editing && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <SectionHeading color="bg-blue-500">About</SectionHeading>
                <p className="text-slate-400 text-sm leading-relaxed">{profile.Bio}</p>
              </div>
            )}

            {/* Skills */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <SectionHeading color="bg-purple-500">Skills</SectionHeading>
              {profile.skills.length === 0 ? (
                <p className="text-slate-600 text-xs italic">No skills yet. Complete a course to unlock skills.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s, i) => (
                    <span key={i} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Platform info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <SectionHeading color="bg-emerald-500">Platform</SectionHeading>
              <div className="space-y-2.5 text-sm">
                <InfoRow label="Email" value={profile.Email} />
                <InfoRow label="Role" value={profile.Role} />
                <InfoRow label="Credits" value={String(profile.Available_Credits)} accent="text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Right column — transcripts */}
          <div className="md:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block" />
                  Academic Transcripts
                  <span className="ml-1 px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                    {profile.courses.length}
                  </span>
                </h3>

                {/* Download CV */}
                <button
                  onClick={handleCV}
                  disabled={cvLoading || profile.courses.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-40 transition-colors"
                >
                  {cvLoading ? <SpinnerIcon /> : <DownloadIcon />}
                  Download CV
                </button>
              </div>

              {/* Course rows */}
              {profile.courses.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="text-3xl mb-3">📚</div>
                  <p className="text-slate-500 text-sm">No completed courses yet.</p>
                  <Link href="/dashboard/courses" className="text-blue-400 text-xs mt-2 inline-block hover:underline">
                    Browse Courses →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {profile.courses.map((course, i) => {
                    const date = new Date(course.Completed_At).toLocaleDateString('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    });
                    return (
                      <div key={i} className="px-6 py-4 flex items-start sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors group">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5 w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-200 text-sm font-medium leading-snug truncate">{course.Title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-slate-500 text-xs">{date}</span>
                              <span className="text-slate-700 text-xs">·</span>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                {course.Reward_Skill}
                              </span>
                              <span className="text-xs text-blue-400 font-medium">+{course.Reward_RP ?? 0} RP</span>
                            </div>
                          </div>
                        </div>

                        {/* Certificate button */}
                        <button
                          onClick={() => handleCert(course)}
                          disabled={certLoading === course.Title}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-40 transition-colors"
                        >
                          {certLoading === course.Title ? <SpinnerIcon /> : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          Certificate
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Client Reviews ── */}
        {profile.reviews && profile.reviews.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                Client Reviews
                <span className="ml-1 px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                  {profile.reviews.length}
                </span>
              </h3>
              {/* Average */}
              {(() => {
                const avg = (profile.reviews.reduce((s, r) => s + r.Corporate_Rating, 0) / profile.reviews.length).toFixed(1);
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 text-sm font-bold">{avg}</span>
                    <span className="text-yellow-400 text-sm">★</span>
                    <span className="text-slate-600 text-xs">avg from {profile.reviews.length} {profile.reviews.length === 1 ? 'client' : 'clients'}</span>
                  </div>
                );
              })()}
            </div>

            <div className="divide-y divide-slate-800/60">
              {profile.reviews.map(review => {
                const date = new Date(review.Completed_At).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                return (
                  <div key={review.Bounty_ID} className="px-6 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-300 text-sm font-semibold">{review.Company_Name}</span>
                          <span className="text-slate-600 text-xs">·</span>
                          <span className="text-slate-500 text-xs truncate">{review.Title}</span>
                        </div>
                        {/* Stars */}
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className={`text-sm ${s <= review.Corporate_Rating ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-slate-600 text-xs shrink-0">{date}</span>
                    </div>
                    {review.Corporate_Review && (
                      <blockquote className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-slate-700 pl-3">
                        "{review.Corporate_Review}"
                      </blockquote>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Small reusable pieces
────────────────────────────────────────────── */
function SectionHeading({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
      <span className={`w-1 h-4 ${color} rounded-full inline-block`} />
      {children}
    </h3>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`${accent || 'text-slate-300'} text-right truncate`}>{value}</span>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
