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
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">1. Verified Learning</h3>
                <p className="text-slate-400 leading-relaxed">
                  Complete rigorous, instructor-published courses. Pass modules to earn concrete Reputation Points (RP) mapped directly to specific skills.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-purple-500/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 border border-purple-500/20">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">2. Global Elo Ranking</h3>
                <p className="text-slate-400 leading-relaxed">
                  Your skill isn't a static certificate. Climb the global leaderboard by consistently delivering high-quality work and mastering new domains.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/50 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6 border border-emerald-500/20">
                  <span className="text-2xl">💼</span>
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