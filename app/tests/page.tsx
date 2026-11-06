import TestBuilder from '@/components/TestBuilder'
import PremiumGate from '@/components/PremiumGate'

export default function ChapterTestsPage() {
  return (
    <PremiumGate>
      <TestBuilder initialType="chapter" />
    </PremiumGate>
  )
}
