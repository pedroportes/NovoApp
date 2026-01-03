import { supabase } from "@/lib/supabase"

export interface OCRResult {
    nome?: string
    telefone?: string
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
}

export const ocrService = {
    /**
     * Converts a File to Base64 string
     */
    fileToBase64: (file: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
        })
    },

    /**
     * Sends the image to Supabase Edge Function 'process-handwriting'
     */
    processHandwriting: async (file: Blob): Promise<OCRResult> => {
        try {
            const base64 = await ocrService.fileToBase64(file)

            const { data, error } = await supabase.functions.invoke('process-handwriting', {
                body: { image: base64 }
            })

            if (error) {
                console.error('Edge Function Error:', error)
                throw error
            }

            if (data && data.error) {
                throw new Error(data.error)
            }

            return data as OCRResult
        } catch (error) {
            console.error('OCR Service Error:', error)
            throw error
        }
    }
}
