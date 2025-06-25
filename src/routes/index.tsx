import { createFileRoute } from '@tanstack/react-router'
import Calculator from '@/components/Calculator'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="mt-5 mx-auto max-w-screen-xl px-4">
      <Calculator />
    </div>
  )
}
