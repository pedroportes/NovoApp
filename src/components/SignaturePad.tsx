import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
    onSave: (blob: Blob | null) => void
    initialUrl?: string | null
}

export function SignaturePad({ onSave, initialUrl }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)
    const [isLocked, setIsLocked] = useState(false)

    // Sync external state
    useEffect(() => {
        if (initialUrl) {
            // We'll let the canvas load handled by the other effect
        }
    }, [initialUrl])

    useEffect(() => {
        if (initialUrl && canvasRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (ctx) {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                    setHasSignature(true)
                    setIsLocked(true) // Lock if existing signature is loaded
                }
                img.src = initialUrl
            }
        }
    }, [initialUrl])

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isLocked) return
        const canvas = canvasRef.current
        if (!canvas) return

        setIsDrawing(true)
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(e, canvas)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#000'
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || isLocked) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Prevent scrolling on touch devices while drawing
        if ('touches' in e) {
            // e.preventDefault() // This might be too aggressive if invalid passive listener, handled via touch-action css
        }

        const { x, y } = getCoordinates(e, canvas)
        ctx.lineTo(x, y)
        ctx.stroke()
        setHasSignature(true)
    }

    const endDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false)
            // Auto-save logic could go here, but we wait for user to 'Lock' usually or submit form
            // saveSignature() -> We can keep the blob updated but 'Lock' is ensuring it's final
        }
    }

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY

        if ('touches' in e) {
            clientX = e.touches[0].clientX
            clientY = e.touches[0].clientY
        } else {
            clientX = (e as React.MouseEvent).clientX
            clientY = (e as React.MouseEvent).clientY
        }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        }
    }

    const clear = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
        setIsLocked(false)
        onSave(null)
    }

    const handleLock = (e: React.MouseEvent) => {
        e.preventDefault() // Prevent form submit
        if (!hasSignature) return
        setIsLocked(true)
        saveSignature()
    }

    const handleUnlock = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsLocked(false)
        // Optionally clear specific locked state, but keeps the drawing
    }

    const saveSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.toBlob((blob) => {
            onSave(blob)
        }, 'image/png')
    }

    return (
        <div className="space-y-2">
            <div className={`border rounded-lg overflow-hidden bg-white touch-none relative ${isLocked ? 'opacity-70 bg-gray-50' : 'cursor-crosshair'}`}>
                <canvas
                    ref={canvasRef}
                    width={600} // Increased resolution
                    height={300} // Increased resolution
                    className="w-full h-[200px]"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                    style={{ touchAction: 'none' }} // Important for preventing scroll
                />
                {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-white/80 px-4 py-2 rounded-full text-sm font-semibold shadow-sm text-gray-500 border">
                            Assinatura Travada
                        </span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                <p className="text-xs text-muted-foreground pl-1 font-medium">
                    {isLocked ? 'Assinatura Travada (Segura)' : 'Faça sua assinatura acima'}
                </p>
                <div className="flex gap-2">
                    {!isLocked && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clear}
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Eraser className="w-4 h-4 mr-2" />
                            Limpar
                        </Button>
                    )}

                    {isLocked ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUnlock}
                            type="button"
                            className="border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                            Destravar / Editar
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleLock}
                            disabled={!hasSignature}
                            type="button"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 font-semibold"
                        >
                            Travar Assinatura
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
