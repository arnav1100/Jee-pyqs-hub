import TestBuilder from '@/components/TestBuilder'
import PremiumGate from '@/components/PremiumGate'

export default function MockTestsPage() {
  return (
    <PremiumGate>
      <TestBuilder initialType="full" />
    </PremiumGate>
  )
}
