import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Hire Daily — Hire Daily" },
      { name: "description", content: "Contact Hire Daily for questions, feedback, or support." },
      { property: "og:title", content: "Contact Hire Daily — Hire Daily" },
      { property: "og:description", content: "Contact Hire Daily for questions, feedback, or support." },
      { property: "og:url", content: "https://hire-daily.vercel.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-bold text-white">
        Contact Us
      </h1>

      <p className="mb-8 text-white/60">
        We'd love to hear from you. Whether you have questions, feedback,
        partnership opportunities, or advertising inquiries, our team is here
        to help.
      </p>

      <div className="glass rounded-3xl p-8 space-y-8">

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            General Support
          </h2>

          <p className="leading-7 text-white/70">
            If you have any questions regarding job listings, website features,
            or technical issues, please feel free to contact us.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Email
          </h2>

          <a
            href="mailto:prathmeshbobade33@gmail.com"
            className="inline-block text-lg font-medium text-cyan-400 hover:underline"
          >
                prathmeshbobade33@gmail.com

          </a>

          <p className="mt-3 text-white/70">
            We typically respond within <strong>24–48 business hours</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Business & Advertising
          </h2>

          <p className="leading-7 text-white/70">
            Interested in promoting your company, hiring candidates, or
            advertising on HireDaily? Contact us via email and we'll get back to
            you with partnership opportunities.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Response Time
          </h2>

          <ul className="list-disc space-y-2 pl-6 text-white/70">
            <li>General inquiries: 24–48 business hours</li>
            <li>Business partnerships: 2–5 business days</li>
            <li>Technical support: As soon as possible</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            About HireDaily
          </h2>

          <p className="leading-7 text-white/70">
            HireDaily is a platform dedicated to helping students, freshers, and
            professionals discover verified job opportunities from leading
            companies. We strive to provide reliable, up-to-date job listings
            and a smooth job search experience.
          </p>
        </section>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <p className="text-center text-white/80">
            Thank you for choosing <span className="font-semibold text-cyan-400">HireDaily</span>.
            We appreciate your trust and look forward to assisting you.
          </p>
        </div>

      </div>
    </div>
  );
}