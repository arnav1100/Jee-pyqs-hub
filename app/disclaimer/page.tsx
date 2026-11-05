import LegalPage from '@/components/LegalPage'

export default function DisclaimerPage() {
  return <LegalPage title="Disclaimer" intro="JEE PYQ HUB is an independent study tool and is not an official examination website." sections={[
    { heading: 'No official affiliation', body: 'This project is not affiliated with, endorsed by, or operated by the National Testing Agency, any examination authority, or any coaching institution.' },
    { heading: 'Accuracy and results', body: 'Question data and explanations are provided for practice. They may contain mistakes, omissions or formatting differences. Verify important material against official papers and trusted academic references. Use of this platform does not guarantee any examination result.' },
    { heading: 'Third-party marks and content', body: 'Names and marks of examinations are used only to identify study categories. Rights in third-party question papers, diagrams, marks and other source material remain with their respective owners.' },
    { heading: 'External services', body: 'Sign-in, database, hosting and image features may depend on third-party services configured by the project owner and are subject to those providers’ terms and availability.' },
  ]} />
}
