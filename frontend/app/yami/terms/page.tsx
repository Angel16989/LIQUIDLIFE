import Link from "next/link";
import type { Metadata } from "next";
import styles from "../../writing/writing.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Yami Publisher",
  description: "Terms of service for Yami Publisher, a social media publishing tool.",
};

export default function YamiTerms() {
  return (
    <main className={styles.page}><article className={styles.article}>
      <Link href="/" className={styles.backLink}>← Back to portfolio</Link>
      <p className={styles.eyebrow}>Yami Publisher</p><h1>Terms of Service</h1>
      <p className={styles.lede}>Last updated: 17 November 2026</p>
      <div className={styles.body}>
        <h2>About the service</h2><p>Yami Publisher is a social media management tool operated by Rasik Tiwari for the Yami Blackbull project. It helps authorised users prepare, schedule and manage content for connected accounts.</p>
        <h2>Using the service</h2><p>Use the service only with accounts you are authorised to manage. You are responsible for your content, the permissions you grant and complying with applicable laws and the terms of each connected platform. Review content before authorising publication.</p>
        <h2>Third-party platforms</h2><p>Social platforms operate independently and may change their services, permissions, limits or availability. A connection or scheduled post may fail or be delayed. You can disconnect access through the relevant platform’s account settings.</p>
        <h2>Availability</h2><p>The service is provided as available and may be interrupted or changed for maintenance, security or other reasons. Nothing in these terms excludes rights that cannot be excluded under applicable law.</p>
        <h2>Contact</h2><p>Questions: <a href="mailto:rasiktiwari80@gmail.com">rasiktiwari80@gmail.com</a>. See also the <Link href="/yami/privacy">Privacy Policy</Link>.</p>
      </div>
    </article></main>
  );
}
