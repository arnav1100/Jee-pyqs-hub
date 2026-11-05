import LegalPage from '@/components/LegalPage'

export default function AboutPage() {
  return <LegalPage title="About JEE PYQ HUB" intro="A focused, student-friendly workspace for learning through previous-year questions." sections={[
    { heading: 'Our purpose', body: 'JEE PYQ HUB helps aspirants practise questions by exam category, year, shift, subject and chapter. The goal is to make deliberate practice and revision feel clear, encouraging and manageable.' },
    { heading: 'How practice works', body: 'Question records can be served from the connected Firestore database, the repository questions.json file, and supported browser-stored question data. Practice attempts, bookmarks and revision notes are stored locally, with optional account sync when Firebase is configured.' },
    { heading: 'Content and feedback', body: 'Question content may be administered or imported by the site owner. If you find a possible error, use the report control on the question page so it can be reviewed.' },
  ]} />
}
