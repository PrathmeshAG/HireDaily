import { ShieldCheck, Briefcase, Rocket, Users, ClipboardCheck } from "lucide-react";

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
            freshers, and professionals find job opportunities from official
            company career pages and trusted public recruitment sources.
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
              We aim to simplify the job search process by providing useful
              job opportunities, internships, off-campus drives, interview
              resources, and career guidance in one place.
            </p>
          </div>

          <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl p-8">
            <Users className="text-cyan-400 mb-4" size={36} />

            <h2 className="text-2xl font-semibold mb-4">
              Why Hire Daily?
            </h2>

            <ul className="space-y-3 text-gray-400">
              <li>✅ Job opportunities reviewed for source and application information</li>
              <li>✅ Internship Opportunities</li>
              <li>✅ Fresher Hiring</li>
              <li>✅ Smart Search & Filters</li>
              <li>✅ Completely Free Platform</li>
              <li>✅ Mobile Friendly Experience</li>
            </ul>
          </div>

        </div>
      </section>

      {/* How We Verify Jobs */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-slate-900 border border-cyan-500/20 rounded-3xl p-8 md:p-10">

          <div className="flex items-center gap-3 mb-6">
            <ClipboardCheck className="text-cyan-400" size={34} />

            <div>
              <h2 className="text-3xl font-bold">
                How We Verify Jobs
              </h2>
              <p className="text-gray-400 mt-2">
                We focus on source transparency and accurate application
                information rather than simply adding more listings.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-gray-400 leading-7">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                1. Source the opportunity
              </h3>
              <p>
                We identify opportunities from official company career pages
                and trusted public recruitment sources. Official employer
                sources are preferred whenever they are available.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                2. Review the job information
              </h3>
              <p>
                We review the available company, role, location, application
                source, deadline, and other job details before publishing or
                updating a listing.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                3. Record verification information
              </h3>
              <p>
                When verification evidence is available, the job can include
                its verification status and a last-verified timestamp. The
                timestamp indicates when the available job information was
                last checked; it does not guarantee that an employer has not
                changed the posting afterward.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                4. Review expiry and application status
              </h3>
              <p>
                Listings are reviewed for their application deadline and
                current status. Expired opportunities are removed from active
                job listings, while an existing job page may remain accessible
                when useful so applicants can see that its application period
                has closed.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-gray-400 leading-7">
            <p>
              <span className="font-semibold text-white">About salary:</span>{" "}
              If a job shows a salary as <span className="text-white">Expected</span>,
              it means the available job information does not provide a
              confirmed employer salary figure. It should not be interpreted
              as a guaranteed salary or an estimate created by Hire Daily.
            </p>
          </div>

        </div>
      </section>

      {/* Application guidance */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-slate-900 border border-cyan-500/20 rounded-3xl p-8 md:p-10">

          <h2 className="text-3xl font-bold mb-4">
            Applying Through Hire Daily
          </h2>

          <div className="space-y-4 text-gray-400 leading-8">
            <p>
              Hire Daily is a job discovery platform, not a recruitment
              agency. We do not make hiring decisions, conduct employer
              interviews, or act as the employer for the opportunities shown
              on the platform.
            </p>

            <p>
              When an application link is provided, applicants should review
              the job details and apply through the employer's official
              application page or the source identified on the listing.
            </p>

            <p>
              Employers control their own vacancies, eligibility requirements,
              application deadlines, hiring decisions, and application
              processes. Job information can change after a listing has been
              published, so applicants should verify the current information
              before submitting an application.
            </p>
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