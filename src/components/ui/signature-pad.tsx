import React, { useRef, useEffect, useState } from 'react';
import { Button } from './button';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onSignatureChange: (blob: Blob | null) => void;
    initialImage?: string | null;
}

export function SignaturePad({ onSignatureChange, initialImage }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Resize canvas to fill parent
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = 200; // Fixed height
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initial Image
        if (initialImage) {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Prevent tainted canvas
            img.src = initialImage;
            img.onload = () => {
                if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setHasSignature(true);
            }
        }

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [initialImage]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        setHasSignature(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        exportSignature();
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onSignatureChange(null);
    };

    const exportSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            onSignatureChange(blob);
        });
    };

    return (
        <div className="w-full space-y-2">
            <div className="border-2 border-dashed border-input rounded-md bg-white touch-none relative overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[200px] touch-none cursor-crosshair"
                />
                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50">
                        Assine aqui
                    </div>
                )}
            </div>
            <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={clear}>
                    <Eraser className="w-4 h-4 mr-2" />
                    Limpar Assinatura
                </Button>
            </div>
        </div>
    );
}
