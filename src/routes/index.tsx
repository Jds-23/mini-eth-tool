import { createFileRoute } from '@tanstack/react-router'
import Calculator from '@/components/Calculator'
import Encoder from '@/components/Encoder'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="mt-5 mx-auto max-w-screen-xl px-4 flex flex-col gap-6">
      <Calculator />
      <Encoder />
    </div>
  )
}
