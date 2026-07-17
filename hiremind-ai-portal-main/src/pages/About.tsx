import { ShieldCheck, Briefcase, Rocket, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">

          <h1 className="text-5xl md:text-6xl font-bold">
            About <span className="text-cyan-400">Hire Daily</span>
          </h1>

          <p className="mt-6 text-gray-400 max-w-3xl mx-auto text-lg">
            Hire Daily is a modern job discovery platform helping students,
            freshers, and professionals find verified job opportunities from
            official company career pages and trusted recruitment sources.
          </p>

        </div>
      </section>

      {/* Mission */}

      <section className="max-w-6xl mx-auto px-6 py-12">

        <div className="grid md:grid-cols-2 gap-8">

          <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl p-8">
            <Rocket className="text-cyan-400 mb-4" size={36} />

            <h2 className="text-2xl font-semibold mb-4">
              Our Mission
            </h2>

            <p className="text-gray-400 leading-8">
              We aim to simplify the job search process by providing daily
              verified job opportunities, internships, off-campus drives,
              interview resources, and career guidance — all in one place.
            </p>

          </div>

          <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl p-8">
            <Users className="text-cyan-400 mb-4" size={36} />

            <h2 className="text-2xl font-semibold mb-4">
              Why Hire Daily?
            </h2>

            <ul className="space-y-3 text-gray-400">

              <li>✅ Daily Verified Job Updates</li>

              <li>✅ Internship Opportunities</li>

              <li>✅ Fresher Hiring</li>

              <li>✅ Smart Search & Filters</li>

              <li>✅ Completely Free Platform</li>

              <li>✅ Mobile Friendly Experience</li>

            </ul>

          </div>

        </div>

      </section>

      {/* Disclaimer */}

      <section className="max-w-6xl mx-auto px-6 py-16">

        <div className="bg-slate-900 rounded-3xl border border-cyan-500/20 p-10">

          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-cyan-400" size={34} />

            <h2 className="text-3xl font-bold">
              Disclaimer
            </h2>

          </div>

          <div className="space-y-6 text-gray-400 leading-8">

            <p>
              Hire Daily shares publicly available job opportunities for
              informational purposes only. We are <b>not a recruitment agency</b>,
              <b> not an employer</b>, and <b>not affiliated</b> with the
              companies listed unless explicitly stated.
            </p>

            <p>
              Job details, eligibility criteria, salaries, deadlines,
              locations, and hiring processes are managed solely by the
              respective employers and may change without prior notice.
            </p>

            <p>
              Applicants should always verify every job posting through the
              company's official careers website before applying.
            </p>

            <p>
              Hire Daily and HireMind AI are not responsible for expired
              links, hiring decisions, application outcomes, inaccurate
              information supplied by third parties, technical issues, or
              any direct or indirect loss resulting from the use of this
              platform.
            </p>

            <p>
              By using this website, you acknowledge that all employment
              decisions are solely between you and the respective employer.
            </p>

          </div>

        </div>

      </section>

      {/* Coming Soon */}

      <section className="max-w-6xl mx-auto px-6 pb-24">

        <div className="rounded-3xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 p-10 text-center">

          <Briefcase
            className="mx-auto text-cyan-400 mb-4"
            size={42}
          />

          <h2 className="text-4xl font-bold">
            HireMind AI
          </h2>

          <p className="text-cyan-400 mt-2">
            Coming Soon
          </p>

          <p className="text-gray-400 mt-6 max-w-3xl mx-auto leading-8">

            We're building AI-powered career tools including Resume Analysis,
            ATS Resume Builder, AI Interview Preparation, Smart Job
            Recommendations, Career Insights, and Personalized Learning to
            help you land your dream job faster.

          </p>

        </div>

      </section>

    </div>
  );
}