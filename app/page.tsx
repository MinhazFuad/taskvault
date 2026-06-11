import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30 font-sans flex flex-col">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            Task<span className="text-blue-500">Vault</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-semibold tracking-wide">
              TaskVault 1.0 is Live
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              The verified bridge between <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                talent and opportunity.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Complete verified learning modules, build an immutable reputation, and execute real-world corporate bounties—all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all shadow-xl shadow-blue-500/25">
                Start as a Student
              </Link>
              <Link href="/register" className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-lg transition-all">
                Post Bounties as Corporate
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-slate-900 border-y border-white/5 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How TaskVault Works</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">An ecosystem designed to prove competence with data, not just degrees.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-blue-500/50 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6 border border-blue-500/20">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">1. Verified Learning</h3>
                <p className="text-slate-400 leading-relaxed">
                  Complete rigorous, instructor-published courses. Pass modules to earn concrete Reputation Points (RP) mapped directly to specific skills.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-purple-500/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 border border-purple-500/20">
                  <svg className="w-6 h-6 text-purple-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">2. Global Elo Ranking</h3>
                <p className="text-slate-400 leading-relaxed">
                  Your skill isn't a static certificate. Climb the global leaderboard by consistently delivering high-quality work and mastering new domains.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/50 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6 border border-emerald-500/20">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">3. Execute Bounties</h3>
                <p className="text-slate-400 leading-relaxed">
                  Unlock access to paid corporate bounties. Companies trust your RP score, allowing you to instantly bid on and complete real-world tasks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Corporate CTA Section */}
        <section className="py-24 px-6 max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Are you a company looking for talent?</h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            Stop sorting through fabricated resumes. Post tasks to a secure bounty board where only proven, skill-verified talent can apply.
          </p>
          <Link href="/register" className="inline-block px-8 py-4 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg transition-all">
            Create a Corporate Account
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} TaskVault. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Instructor Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}