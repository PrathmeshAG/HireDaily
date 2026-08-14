import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Hire Daily" },
      { name: "description", content: "Read the Hire Daily terms of use." },
      { property: "og:title", content: "Terms of Use — Hire Daily" },
      { property: "og:description", content: "Read the Hire Daily terms of use." },
      { property: "og:url", content: "https://hire-daily.vercel.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-bold text-white">
        Terms & Conditions
      </h1>

      <p className="mb-8 text-white/60">
        Last Updated: August 2026
      </p>

      <div className="glass space-y-8 rounded-3xl p-8">

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Acceptance of Terms
          </h2>

          <p className="leading-7 text-white/70">
            By accessing and using HireDaily, you agree to comply with these
            Terms & Conditions. If you do not agree with any part of these
            terms, please discontinue using our website.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Job Information
          </h2>

          <p className="leading-7 text-white/70">
            HireDaily provides job opportunities collected from official company
            career portals and other publicly available sources. We strive to
            keep all information accurate and up to date; however, we cannot
            guarantee that every listing is complete, current, or error-free.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            User Responsibilities
          </h2>

          <ul className="list-disc space-y-2 pl-6 text-white/70">
            <li>Verify job details on the employer's official website before applying.</li>
            <li>Use the website only for lawful purposes.</li>
            <li>Do not misuse, copy, or attempt to disrupt our services.</li>
            <li>Respect the rights of employers and other users.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            No Employment Guarantee
          </h2>

          <p className="leading-7 text-white/70">
            HireDaily is an informational platform only. We do not guarantee
            interviews, job offers, employment, salary, or recruitment outcomes.
            Final hiring decisions are made solely by the respective employers.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            External Links
          </h2>

          <p className="leading-7 text-white/70">
            Our website may contain links to third-party websites, including
            official company career pages. We are not responsible for the
            content, privacy policies, availability, or practices of external
            websites.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Intellectual Property
          </h2>

          <p className="leading-7 text-white/70">
            The HireDaily logo, branding, website design, and original content
            are the intellectual property of HireDaily unless otherwise stated.
            Unauthorized copying or redistribution is prohibited.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Limitation of Liability
          </h2>

          <p className="leading-7 text-white/70">
            HireDaily shall not be liable for any direct or indirect loss,
            damages, or inconvenience arising from the use of this website or
            reliance on any job listing published on the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Changes to These Terms
          </h2>

          <p className="leading-7 text-white/70">
            We may update these Terms & Conditions at any time without prior
            notice. Continued use of HireDaily after changes are published
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Contact Us
          </h2>

          <p className="leading-7 text-white/70">
            If you have any questions regarding these Terms & Conditions, please
            contact us at:
          </p>

          <a
            href="mailto:prathmeshbobade33@gmail.com"
            className="mt-3 inline-block font-medium text-cyan-400 hover:underline"
          >
           prathmeshbobade33@gmail.com
          </a>
        </section>

      </div>
    </div>
  );
}