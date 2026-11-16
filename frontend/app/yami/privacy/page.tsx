import Link from "next/link";
import type { Metadata } from "next";
import styles from "../../writing/writing.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Yami Publisher",
  description: "Privacy information for the Yami Publisher social media management tool.",
};

export default function YamiPrivacy() {
  return (
    <main className={styles.page}><article className={styles.article}>
      <Link href="/" className={styles.backLink}>← Back to portfolio</Link>
      <p className={styles.eyebrow}>Yami Publisher</p><h1>Privacy Policy</h1>
      <p className={styles.lede}>Last updated: 17 November 2026</p>
      <div className={styles.body}>
        <h2>Who operates this service</h2><p>Yami Publisher is a social media management tool operated by Rasik Tiwari for the Yami Blackbull project.</p>
        <h2>Information processed</h2><p>When you sign in or connect an account, the service may process account identifiers, profile details and authorisation tokens provided by the relevant platform. It also processes the media, captions, scheduling details and publishing status you provide, and technical logs needed to operate and troubleshoot the service.</p>
        <h2>How information is used and shared</h2><p>Information is used to authenticate users, connect authorised accounts and prepare, schedule or manage content. Information needed for an authorised action is shared with the relevant social platform. Those platforms handle information under their own privacy policies. The service and its data are hosted on the operator’s server; hosting and network providers may process technical connection data.</p>
        <h2>Storage and retention</h2><p>Information is retained for as long as needed to operate the service and manage connected content, subject to applicable legal requirements. Copies may remain in backups for a period after deletion. Credentials and stored information are restricted to authorised access.</p>
        <h2>Your choices and contact</h2><p>You can revoke a connected app’s access through the relevant platform. To ask about access, correction or deletion of information, or for other privacy questions, email <a href="mailto:rasiktiwari80@gmail.com">rasiktiwari80@gmail.com</a>. See also the <Link href="/yami/terms">Terms of Service</Link>.</p>
      </div>
    </article></main>
  );
}
