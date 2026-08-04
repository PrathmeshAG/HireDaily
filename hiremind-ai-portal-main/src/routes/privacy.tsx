import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-bold text-white">
        Privacy Policy
      </h1>

      <p className="mb-8 text-white/60">
        Last Updated: August 2026
      </p>

      <div className="glass space-y-8 rounded-3xl p-8">

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Introduction
          </h2>

          <p className="leading-7 text-white/70">
            At HireDaily, we value your privacy and are committed to protecting
            your personal information. This Privacy Policy explains what
            information we collect, how we use it, and the choices you have
            regarding your data while using our website.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Information We Collect
          </h2>

          <ul className="list-disc space-y-2 pl-6 text-white/70">
            <li>Browser and device information</li>
            <li>Cookies and similar technologies</li>
            <li>Website usage and analytics data</li>
            <li>IP address and approximate location</li>
            <li>Information you voluntarily provide through our contact page</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            How We Use Your Information
          </h2>

          <ul className="list-disc space-y-2 pl-6 text-white/70">
            <li>To improve website performance and user experience.</li>
            <li>To analyze visitor behavior and website traffic.</li>
            <li>To provide relevant job opportunities.</li>
            <li>To respond to inquiries and support requests.</li>
            <li>To maintain website security and prevent abuse.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Cookies
          </h2>

          <p className="leading-7 text-white/70">
            HireDaily uses cookies and similar technologies to remember user
            preferences, improve website functionality, and provide a better
            browsing experience. You can disable cookies through your browser
            settings if you prefer.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Google AdSense
          </h2>

          <p className="leading-7 text-white/70">
            We may display advertisements served by Google AdSense. Google may
            use cookies to deliver personalized advertisements based on your
            interests and previous browsing activity. You can learn more about
            how Google uses data by visiting Google's advertising policies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Analytics
          </h2>

          <p className="leading-7 text-white/70">
            We use analytics tools, including Vercel Analytics and other
            performance monitoring services, to understand website usage,
            measure traffic, and continuously improve our platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Third-Party Links
          </h2>

          <p className="leading-7 text-white/70">
            HireDaily contains links to official company career pages and other
            third-party websites. We are not responsible for the privacy
            practices or content of external websites. We encourage users to
            review their privacy policies before sharing personal information.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Data Security
          </h2>

          <p className="leading-7 text-white/70">
            We implement reasonable security measures to help protect your
            information. However, no method of data transmission over the
            internet is completely secure, and we cannot guarantee absolute
            security.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Changes to This Policy
          </h2>

          <p className="leading-7 text-white/70">
            We may update this Privacy Policy from time to time. Any changes
            will be published on this page with an updated revision date.
            Continued use of HireDaily after changes are posted constitutes your
            acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Contact Us
          </h2>

          <p className="leading-7 text-white/70">
            If you have any questions about this Privacy Policy or how your
            information is handled, please contact us at:
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