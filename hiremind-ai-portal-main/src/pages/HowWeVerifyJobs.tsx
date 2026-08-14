import {
  ShieldCheck,
  SearchCheck,
  Building2,
  CalendarCheck,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

export default function HowWeVerifyJobs() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Hero */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
            <ShieldCheck className="text-cyan-400" size={32} />
          </div>

          <h1 className="text-4xl font-bold md:text-5xl">
            How Hire Daily Verifies Job Listings
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            Hire Daily focuses on making job discovery easier while keeping
            the source and application path transparent. Here is how we review
            job opportunities before and after they appear on the platform.
          </p>
        </div>
      </section>

      {/* Verification process */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <Step
              icon={<SearchCheck size={30} />}
              number="01"
              title="Identify the opportunity"
              text="We identify job opportunities from official company career pages and trusted public recruitment sources. Official employer sources are preferred whenever they are available."
            />

            <Step
              icon={<Building2 size={30} />}
              number="02"
              title="Review company and role details"
              text="We review the available company, job title, location, experience, job type, salary information, application source, and other relevant details supplied by the source."
            />

            <Step
              icon={<CalendarCheck size={30} />}
              number="03"
              title="Check application information"
              text="When available, we record the application deadline and the application URL. Applicants should still confirm the current information on the employer's website before applying."
            />

            <Step
              icon={<ShieldCheck size={30} />}
              number="04"
              title="Record verification information"
              text="When the existing verification evidence supports it, a listing can show its verification status and last-verified timestamp. We do not treat an application URL alone as proof of verification."
            />
          </div>
        </div>
      </section>

      {/* Last verified */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-cyan-500/20 bg-slate-900 p-8 md:p-10">
          <h2 className="text-3xl font-bold">What does “Last verified” mean?</h2>

          <p className="mt-5 max-w-4xl leading-8 text-gray-400">
            The <span className="text-white">Last verified</span> timestamp
            indicates when the available verification information for a
            listing was last checked. It is a record of that check, not a
            guarantee that an employer has not changed the vacancy afterward.
          </p>

          <p className="mt-4 max-w-4xl leading-8 text-gray-400">
            If a listing does not have sufficient verification evidence, Hire
            Daily does not invent a verification status or date. The listing
            can instead show a neutral state such as{" "}
            <span className="text-white">Not specified</span>.
          </p>
        </div>
      </section>

      {/* Expiry and salary */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <InfoCard
            icon={<CalendarCheck size={30} />}
            title="Expired jobs"
            text="Application deadlines are reviewed when deadline information is available. Expired opportunities are removed from active job listings. An existing job URL may remain accessible when useful, with its application status clearly shown as closed."
          />

          <InfoCard
            icon={<AlertCircle size={30} />}
            title='What does "Expected" salary mean?'
            text='If salary is displayed as "Expected", the available job information does not provide a confirmed employer salary figure. It is not a guaranteed salary and is not an estimate created by Hire Daily.'
          />
        </div>
      </section>

      {/* Applying */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-cyan-500/20 bg-slate-900 p-8 md:p-10">
          <div className="flex items-center gap-3">
            <ExternalLink className="text-cyan-400" size={30} />
            <h2 className="text-3xl font-bold">Where should you apply?</h2>
          </div>

          <p className="mt-5 leading-8 text-gray-400">
            Hire Daily is a job discovery platform, not a recruitment agency.
            We do not make hiring decisions or act as the employer for jobs
            listed on the platform.
          </p>

          <p className="mt-4 leading-8 text-gray-400">
            When an application link is provided, applicants should review the
            requirements and apply through the employer's official application
            page or the source identified on the listing.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm leading-7 text-gray-400">
            <span className="font-semibold text-white">Important:</span>{" "}
            Employers control their own vacancies, eligibility requirements,
            deadlines, hiring decisions, and application processes. Job
            information can change after publication, so always verify the
            current details before submitting an application.
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="px-6 pb-24 pt-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-8 text-center md:p-10">
          <h2 className="text-3xl font-bold">Our approach</h2>

          <p className="mx-auto mt-4 max-w-3xl leading-8 text-gray-400">
            Our goal is not to claim that every job is permanently verified.
            Our goal is to make the available source, job information,
            verification status, deadline, and application path as clear as
            possible so users can make informed application decisions.
          </p>
        </div>
      </section>
    </div>
  );
}

function Step({
  icon,
  number,
  title,
  text,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold tracking-widest text-cyan-400">
            {number}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        </div>
      </div>

      <p className="mt-5 leading-8 text-gray-400">{text}</p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-cyan-400">{icon}</span>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>

      <p className="leading-8 text-gray-400">{text}</p>
    </div>
  );
}