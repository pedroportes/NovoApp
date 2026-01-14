import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface VoiceRecognitionProps {
    onResult: (transcript: string) => void;
    onError?: (error: any) => void;
}

export function useVoiceRecognition({ onResult, onError }: VoiceRecognitionProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast.error('Seu navegador não suporta reconhecimento de voz.');
            return;
        }

        try {
            if (!recognitionRef.current) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'pt-BR';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    setIsListening(true);
                };

                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    onResult(transcript);
                    setIsListening(false);
                };

                recognition.onerror = (event: any) => {
                    console.error('Erro no reconhecimento de voz:', event.error);
                    if (event.error !== 'no-speech') {
                        toast.error(`Erro: ${event.error}`);
                    }
                    setIsListening(false);
                    if (onError) onError(event.error);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }

            recognitionRef.current.start();
        } catch (error) {
            console.error('Erro ao iniciar reconhecimento:', error);
            setIsListening(false);
        }
    }, [onResult, onError]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    return {
        isListening,
        startListening,
        stopListening,
        supported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
}
