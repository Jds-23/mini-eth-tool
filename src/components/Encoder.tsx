import { AbiFunction, AbiEvent, AbiError, AbiParameters } from 'ox'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormControl, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { useMemo, useState, useRef } from 'react'
import { Copy, Check } from 'lucide-react'

const funcSigSchema = z.string().min(1, 'Required')

export default function Encoder() {
  // Step 1: Function signature form
  const sigForm = useForm({
    resolver: zodResolver(z.object({ sig: funcSigSchema })),
    defaultValues: { sig: '' },
    mode: 'onChange',
  })
  const sig = useWatch({ control: sigForm.control, name: 'sig' })
  const [sigError, setSigError] = useState<string | null>(null)

  // Parse function signature with ox
  const abiObj = useMemo<any | null>(() => {
    setSigError(null)
    if (!sig) return null
    let prefix = ''
    let rest = sig.trim()
    const match = rest.match(/^(function|event|error)\s+/i)
    if (match) {
      prefix = match[1].toLowerCase()
      rest = rest.slice(match[0].length)
    }
    // If input is a tuple of types, e.g. (uint,address)
    const tupleMatch = rest.match(/^\(([^)]*)\)$/)
    if (!prefix && tupleMatch) {
      try {
        let types = tupleMatch[1].split(',').map(s => s.trim()).filter(Boolean)
        // Canonicalize types: uint -> uint256, int -> int256
        types = types.map(t =>
          t === 'uint' ? 'uint256'
          : t === 'int' ? 'int256'
          : t
        )
        // Filter out any empty or invalid types
        types = types.filter(t => t && typeof t === 'string' && /^[a-zA-Z0-9_\[\]]+$/.test(t))
        if (!types.length) throw new Error('No types found')
        const params = AbiParameters.from(types)
        // Ensure params is an array of objects with a type property
        if (!Array.isArray(params) || !params.every((p: any) => typeof p === 'object' && typeof p.type === 'string')) {
          throw new Error('Invalid parameter types')
        }
        return { type: 'tuple', params, types }
      } catch (e: any) {
        setSigError(e.message || 'Invalid parameter tuple')
        return null
      }
    }
    try {
      if (prefix === 'event') {
        const ev = AbiEvent.from('event ' + rest)
        if (ev.type !== 'event') throw new Error('Not an event signature')
        return ev
      } else if (prefix === 'error') {
        const err = AbiError.from('error ' + rest)
        if (err.type !== 'error') throw new Error('Not an error signature')
        return err
      } else {
        // Default to function
        const fn = AbiFunction.from('function ' + rest)
        if (fn.type !== 'function') throw new Error('Not a function signature')
        return fn
      }
    } catch (e: any) {
      setSigError(e.message || 'Invalid signature')
      return null
    }
  }, [sig])

  // Step 2: Dynamic param form
  let paramFields: (any & { name: string })[] = []
  if (abiObj) {
    if (abiObj.type === 'tuple' && Array.isArray(abiObj.types)) {
      paramFields = abiObj.types.map((type: string, idx: number) => ({ name: `arg${idx}`, type }))
    } else if (Array.isArray(abiObj.inputs)) {
      paramFields = abiObj.inputs.map((input: any, idx: number) => ({ ...input, name: input.name || `arg${idx}` }))
    }
  }
  const paramShape: Record<string, any> = {}
  paramFields.forEach((input, idx) => {
    paramShape[input.name] = z.string().min(1, 'Required')
  })
  const paramSchema = z.object(paramShape)
  const paramForm = useForm({
    resolver: zodResolver(paramSchema),
    defaultValues: paramFields.reduce<Record<string, string>>((acc, f) => {
      acc[f.name] = ''
      return acc
    }, {}),
    mode: 'onChange',
  })
  const paramValues = useWatch({ control: paramForm.control })
  const [encoded, setEncoded] = useState<string | null>(null)
  const [usePacked, setUsePacked] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Encode on submit
  function handleEncode(data: Record<string, string>) {
    if (!abiObj) return
    try {
      const args = paramFields.map(f => data[f.name])
      if (abiObj.type === 'function') {
        const hex = AbiFunction.encodeData(abiObj, args)
        setEncoded(hex)
      } else if (abiObj.type === 'error') {
        const hex = AbiError.encode(abiObj, args)
        setEncoded(hex)
      } else if (abiObj.type === 'tuple') {
        if (!Array.isArray(abiObj.params) || !abiObj.params.every((p: any) => typeof p === 'object' && typeof p.type === 'string')) {
          setSigError('Invalid parameter types for encoding')
          setEncoded('')
          return
        }
        let hex = ''
        if (usePacked) {
          try {
            hex = AbiParameters.encodePacked(abiObj.params, args)
          } catch (e: any) {
            setSigError(e.message || 'encodePacked error: check types and values')
            setEncoded('')
            return
          }
        } else {
          hex = AbiParameters.encode(abiObj.params, args)
        }
        setEncoded(hex)
      }
    } catch (e: any) {
      setEncoded('')
      setSigError(e.message || 'Encoding error')
    }
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed max-w-lg border-black shadow flex flex-col gap-6">
      <h2 className="text-lg font-bold mb-2">EVM Function Encoder</h2>
      <Form {...sigForm}>
        <form className="flex flex-col gap-4" onSubmit={sigForm.handleSubmit(() => {})}>
          <FormField
            control={sigForm.control}
            name="sig"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Paste function signature, e.g. approve(address,uint256)"
                    onKeyDown={e => {
                      if (!field.onChange) return
                      const el = e.target as HTMLTextAreaElement
                      const val = el.value
                      const start = el.selectionStart
                      const end = el.selectionEnd
                      // Only handle single-cursor, not selection
                      if (start !== end) return
                      // Map of opening to closing brackets
                      const pairs: Record<string, string> = {
                        '(': ')',
                        '[': ']',
                        '{': '}',
                      }
                      const open = e.key
                      const close = pairs[open]
                      if (close) {
                        // If next char is already the closing, just move cursor
                        if (val[start] === close) {
                          setTimeout(() => {
                            el.selectionStart = el.selectionEnd = start + 1
                          }, 0)
                          e.preventDefault()
                          return
                        }
                        // Insert closing bracket after cursor
                        const newVal = val.slice(0, start) + open + close + val.slice(end)
                        field.onChange(newVal)
                        setTimeout(() => {
                          el.selectionStart = el.selectionEnd = start + 1
                        }, 0)
                        e.preventDefault()
                        return
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      {sigError && <div className="text-red-500 text-sm">{sigError}</div>}
      {abiObj && paramFields.length > 0 && (
        <Form {...paramForm}>
          <form className="flex flex-col gap-4" onSubmit={paramForm.handleSubmit(handleEncode)}>
            {paramFields.map((field, idx) => (
              <FormField
                key={field.name}
                control={paramForm.control}
                name={field.name}
                render={({ field: f }: { field: any }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...f} placeholder={`${field.name} (${field.type})`} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {abiObj.type === 'tuple' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={usePacked}
                  onChange={e => setUsePacked(e.target.checked)}
                  className="accent-black"
                />
                Use encodePacked (solidityPacked)
              </label>
            )}
            {(abiObj.type === 'function' || abiObj.type === 'error' || abiObj.type === 'tuple') && (
              <Button type="submit" className="w-fit">Encode</Button>
            )}
          </form>
        </Form>
      )}
      {encoded && (abiObj?.type === 'function' || abiObj?.type === 'error' || abiObj?.type === 'tuple') && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input type="text" readOnly value={encoded} className="flex-1" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
              onClick={() => {
                if (encoded) {
                  navigator.clipboard.writeText(encoded)
                  setCopied(true)
                  if (copyTimeout.current) clearTimeout(copyTimeout.current)
                  copyTimeout.current = setTimeout(() => setCopied(false), 1000)
                }
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
      {abiObj?.type === 'event' && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">Event topic hash (topic0):</div>
          <Input type="text" readOnly value={abiObj.topicHash || ''} />
        </div>
      )}
    </div>
  )
}
