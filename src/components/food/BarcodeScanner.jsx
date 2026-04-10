import { useState, useEffect, useRef } from 'react'
import { Loader2, X } from 'lucide-react'
import { lookupBarcode, BARCODE_SUPPORTED } from './foodApi'

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const frameRef = useRef(null)
  const detectorRef = useRef(null)
  const [error, setError] = useState(null)
  const [looking, setLooking] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    if (!BARCODE_SUPPORTED) return
    detectorRef.current = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    })
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        scanFrame()
      }
    } catch {
      setError('Camera access denied.')
    }
  }

  function stopCamera() {
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function scanFrame() {
    if (!videoRef.current || !detectorRef.current) return
    try {
      const codes = await detectorRef.current.detect(videoRef.current)
      if (codes.length > 0) {
        stopCamera()
        handleCode(codes[0].rawValue)
        return
      }
    } catch {}
    frameRef.current = requestAnimationFrame(scanFrame)
  }

  async function handleCode(code) {
    const clean = code.trim()
    if (!/^\d{8,14}$/.test(clean)) {
      setError('Invalid barcode — must be 8–14 digits.')
      return
    }
    setLooking(true)
    try {
      const food = await lookupBarcode(clean)
      if (food) { onResult(food); return }
      setError(`No food found for barcode ${clean}.`)
    } catch {
      setError('Lookup failed. Try again.')
    }
    setLooking(false)
  }

  async function handleManual(e) {
    e.preventDefault()
    if (manualCode.trim()) handleCode(manualCode.trim())
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
        <span className="text-white font-semibold text-sm">Scan barcode</span>
        <button onClick={() => { stopCamera(); onClose() }} className="text-slate-400 p-1">
          <X size={20} />
        </button>
      </div>

      {looking ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 size={32} className="animate-spin text-emerald-400" />
          <p className="text-sm text-slate-400">Looking up barcode…</p>
        </div>
      ) : BARCODE_SUPPORTED && !error ? (
        <div className="relative flex-1 overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-36">
              <div className="absolute inset-0 border-2 border-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              {[['top-0 left-0','border-t-2 border-l-2 rounded-tl-lg'],
                ['top-0 right-0','border-t-2 border-r-2 rounded-tr-lg'],
                ['bottom-0 left-0','border-b-2 border-l-2 rounded-bl-lg'],
                ['bottom-0 right-0','border-b-2 border-r-2 rounded-br-lg']
              ].map(([pos, cls]) => (
                <div key={pos} className={`absolute w-6 h-6 border-emerald-400 ${pos} ${cls}`} />
              ))}
            </div>
          </div>
          <p className="absolute bottom-10 w-full text-center text-white/70 text-sm">
            Point camera at barcode
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {!BARCODE_SUPPORTED && (
            <p className="text-slate-400 text-sm text-center">
              Barcode scanning isn't supported on this browser. Enter the barcode number manually:
            </p>
          )}
          <form onSubmit={handleManual} className="w-full flex gap-2">
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="e.g. 5000112637922"
              inputMode="numeric"
              autoFocus
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" className="px-4 py-2.5 bg-emerald-600 rounded-lg text-white text-sm font-semibold">
              Look up
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
