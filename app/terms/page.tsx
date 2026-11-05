import LegalPage from '@/components/LegalPage'

export default function TermsPage() {
  return <LegalPage title="Terms of use" intro="Use JEE PYQ HUB as a practice aid, with care for your own account and learning data." sections={[
    { heading: 'Educational use', body: 'The site is intended for personal study and educational practice. Do not misuse the service, attempt to access administrative data, upload unlawful content, or interfere with another student’s account or progress.' },
    { heading: 'Question content', body: 'Question wording, answer keys and explanations should be checked against reliable source material. The site owner may correct, update or remove content to address quality or rights concerns.' },
    { heading: 'Availability', body: 'The site depends on browser storage, hosting and any configured Firebase services. Local study features may remain available when cloud sync is not configured, but cross-device sync requires a working account and backend.' },
    { heading: 'Changes', body: 'Features, policies and content may change as the project is maintained. Continued use means you accept the current version of these terms.' },
  ]} />
}
