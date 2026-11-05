import LegalPage from '@/components/LegalPage'

export default function PrivacyPage() {
  return <LegalPage title="Privacy" intro="A plain-language summary of the data used to operate this learning workspace." sections={[
    { heading: 'Practice data in your browser', body: 'Without signing in, study answers, bookmarks, mistakes, notes, goals and theme preference are saved in this browser using namespaced localStorage keys. Clearing browser storage can remove that local copy. The site does not intentionally clear older question or progress keys during migration.' },
    { heading: 'Optional account sync', body: 'When Firebase is configured and you sign in, account and study data may be stored in Firebase Authentication and Firestore for cross-device access. Google sign-in may also involve Google processing your authentication information. Firebase Storage is used for administrator-managed images when enabled.' },
    { heading: 'Question reports', body: 'A question report is saved locally and, when you are signed in and the database is configured, sent to the site database with the question id and report text so an administrator can review it.' },
    { heading: 'Your choices', body: 'You can use practice features without creating an account. To request account or data assistance, contact the repository maintainer through the project issue tracker. Do not include passwords or secret credentials in a public issue.' },
  ]} />
}
