/**
 * Single source of truth for brand, owner and contact details.
 * Edit the values below once; About, Contact, Privacy, Footer and JSON-LD all read from here.
 */
export const SITE = {
  /** The one and only brand spelling used everywhere. */
  name: "Hire Daily",
  url: "https://hire-daily.vercel.app",
  tagline: "Find Your Dream Job Faster",

  /** TODO: confirm the name, role and short bio. These are shown on the About page (E-E-A-T). */
  owner: {
    name: "Prathmesh Bobade",
    role: "Founder and Editor",
    location: "Pune, Maharashtra, India",
    bio: "Prathmesh started Hire Daily to make job hunting clearer for students and freshers. He personally reviews every listing for its source and application link before it is published, and writes the career guides on this site.",
    /** Put a photo at /public/owner.jpg and set this to "/owner.jpg". Leave empty to show initials. */
    photo: "/owner.jpg",
    linkedin: "",
  },

  /**
   * Contact. Once you own a domain, create a mailbox such as contact@yourdomain.com
   * and replace the value below. Until then the Gmail address stays as the fallback.
   * (A vercel.app address cannot receive email.)
   */
  contactEmail: "prathmeshbobade33@gmail.com",

  /** Add a real URL to show an icon in the footer. Empty values are not rendered. */
  social: {
    instagram: "https://www.instagram.com/hire_daily/",
    linkedin: "",
    x: "",
    github: "",
  },

  lastPolicyUpdate: "3 October 2026",
} as const;

/**
 * One wording for salary, used on the About page, the verification page and job pages.
 * Never describe it as an estimate made by Hire Daily.
 */
export const SALARY_NOTE =
  'If a salary is marked "Expected", the listing does not state a confirmed salary from the employer. The figure comes from the source or the posting details, it is not a guarantee, and Hire Daily does not calculate or estimate salaries.';
