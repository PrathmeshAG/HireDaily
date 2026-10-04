import { createFileRoute } from "@tanstack/react-router";
import { SITE } from "../lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hire Daily" },
      { name: "description", content: "Read the Hire Daily privacy policy and learn how information is handled." },
      { property: "og:title", content: "Privacy Policy — Hire Daily" },
      { name: "twitter:title", content: "Privacy Policy — Hire Daily" },
      { property: "og:description", content: "Read the Hire Daily privacy policy and learn how information is handled." },
      { name: "twitter:description", content: "Read the Hire Daily privacy policy and learn how information is handled." },
      { property: "og:url", content: "https://hire-daily.vercel.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-bold text-white">
        Privacy Policy
      </h1>

      <p className="mb-8 text-white/60">
        Last Updated: {SITE.lastPolicyUpdate}
      </p>

      <div className="glass space-y-8 rounded-3xl p-8">

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Introduction
          </h2>

          <p className="leading-7 text-white/70">
            At Hire Daily, we value your privacy and are committed to protecting
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
            Hire Daily uses cookies and similar technologies to remember user
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
            We display advertisements served by Google AdSense. Google and its partners use cookies and
            similar technologies to show ads based on your visits to this and other websites. You can choose
            non-personalised ads in our cookie notice, switch off personalised advertising at{" "}
            <a className="text-cyan-400 underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>,
            or learn how Google uses data from sites that use its services at{" "}
            <a className="text-cyan-400 underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>.
            You can also opt out of third-party vendor cookies at{" "}
            <a className="text-cyan-400 underline" href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a>.
            Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent
            before personalised ads are used.
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
            Accounts, Sign-in and Firebase
          </h2>
          <p className="leading-7 text-white/70">
            You can browse Hire Daily without an account. If you create one, we use Google Firebase to run it.
            This is what is stored and why:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-white/70">
            <li><strong>Email and password sign-up:</strong> your email address, the name you enter, the account creation and last sign-in time, and a unique user ID. Your password is handled by Firebase Authentication and is never visible to us.</li>
            <li><strong>Sign in with Google:</strong> Google shares your name, email address and profile picture link with us. We use the name and picture to show your profile and to write your name on certificates. We do not receive your Google password and we do not access your Gmail, Drive or contacts.</li>
            <li><strong>Coding practice progress:</strong> which practice tasks you solved, when you solved them and how many runs it took. This is saved in Firebase Realtime Database under your user ID so that your badges and certificates follow you to another device. Your code is not uploaded. Drafts of your code stay only in your browser.</li>
            <li><strong>In your browser:</strong> Firebase keeps a sign-in session in your browser storage, and we keep your progress, code drafts and cookie choice in local storage on your device.</li>
          </ul>
          <p className="mt-3 leading-7 text-white/70">
            We use this data only to provide the account, profile, badges and certificates, to keep the service secure,
            and to reply if you contact us. We do not sell it or use it to build advertising profiles. Firebase is operated
            by Google and processes the data on our behalf under Google's terms and privacy policy. Job listings and
            company logos are also stored with Firebase. You can sign out at any time from your profile.
          </p>
          <p className="mt-3 leading-7 text-white/70">
            <strong>Keeping and deleting data:</strong> we keep account data for as long as your account exists. To
            delete your account and the progress stored under it, email us from the address you signed up with and we
            will remove it. Clearing your browser data removes the copies stored on your device.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Service Requests and Emails
          </h2>
          <p className="leading-7 text-white/70">
            When you use the Services page or the Contact page, your device opens your own email app with a
            pre-filled message to us. Hire Daily does not store the form in a database. The details you choose to
            send (such as your name, email, phone number, resume link and message) reach us only when you press
            send in your email app. We use them only to reply to you and to deliver the service you asked for,
            and we do not sell them.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Your Choices and Rights
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-white/70">
            <li>You can accept or reject personalised ads and change your decision any time using Cookie settings in the footer. Signing in does not require you to accept personalised ads.</li>
            <li>You can delete cookies or block them in your browser settings.</li>
            <li>You can ask us to access, correct or delete the personal data we hold about you, including your account and coding progress. You can change your display name yourself on your profile page.</li>
            <li>Visitors in the EEA, UK and Switzerland have additional rights under local data protection laws. Contact us to use them.</li>
            <li>Our website is not directed at children under 13 and we do not knowingly collect their data.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">
            Third-Party Links
          </h2>

          <p className="leading-7 text-white/70">
            Hire Daily contains links to official company career pages and other
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
            Continued use of Hire Daily after changes are posted constitutes your
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
            href={`mailto:${SITE.contactEmail}`}
            className="mt-3 inline-block font-medium text-cyan-400 hover:underline"
          >
            {SITE.contactEmail}
          </a>
        </section>

      </div>
    </div>
  );
}