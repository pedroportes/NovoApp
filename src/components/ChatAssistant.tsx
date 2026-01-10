import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, X, Sparkles, Loader2, User, Mic, MicOff } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { useAuth } from '@/contexts/AuthContext';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function ChatAssistant() {
    const { userData } = useAuth(); // Removed companyData
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! Sou a IA do FlowDrain. Posso ajudar com dados de clientes, financeiro ou dúvidas sobre o sistema. O que precisa hoje?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null); // Store recognition instance
    const scrollRef = useRef<HTMLDivElement>(null);

    const toggleRecording = () => {
        if (isRecording) {
            if (recognitionRef.current) {
                recognitionRef.current.stop(); // Manually stop
            }
            setIsRecording(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !userData?.empresa_id) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = {
                empresaId: userData.empresa_id,
                userName: userData.nome || 'Usuário',
                role: userData.cargo || 'tecnico'
            };

            // Remove internal system messages or seed messages if necessary.
            // Here we pass everything except the very last one we just added (because aiService.sendMessage takes the NEW message as argument)
            // But wait, setMessages is async, so 'messages' here might not have the new one yet?
            // Actually, we called setMessages(prev => [...prev, userMsg]). 'messages' variable in closure is OLD.
            // So we need to pass 'messages' (current state) as history. The new 'userMsg' is passed as the 'userMessage' string argument.

            const responseText = await aiService.sendMessage(userMsg.content, messages, context);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, não consegui processar sua pergunta agora.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!userData) return null; // Only show for logged users

    return (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            <div className={`transition-all duration-300 transform origin-bottom-right mb-4 pointer-events-auto ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 h-0 w-0 overflow-hidden'}`}>
                <Card className="w-[350px] md:w-[400px] h-[500px] shadow-2xl border-primary/20 flex flex-col bg-background/95 backdrop-blur-sm">
                    <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-xl flex flex-row justify-between items-center space-y-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">FlowDrain IA</CardTitle>
                                <CardDescription className="text-blue-100 text-xs">Conectado ao Gemini Pro</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <div className="h-full overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {msg.role === 'assistant' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                    </div>
                                    <div className={`rounded-xl p-3 max-w-[80%] text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                        : 'bg-card border border-border rounded-tl-none'
                                        }`}>
                                        {/* <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            className="prose prose-sm dark:prose-invert max-w-none break-words"
                                            components={{
                                                ul: ({node, ...props}) => <ul className="my-1 ml-4 list-disc" {...props} />,
                                                li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                strong: ({node, ...props}) => <span className="font-bold text-foreground/90" {...props} />
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown> */}
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <Bot className="h-5 w-5" />
                                    </div>
                                    <div className="bg-card border border-border p-3 rounded-xl rounded-tl-none flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Pensando...
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-3 bg-muted/30 border-t border-border">
                        <div className="flex w-full gap-2">
                            <Input
                                placeholder="Digite sua pergunta..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                className="flex-1 focus-visible:ring-offset-0 focus-visible:ring-1"
                            />
                            <Button size="icon" onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="shrink-0">
                                <Send className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant={isRecording ? "destructive" : "secondary"}
                                onClick={toggleRecording}
                                disabled={isLoading}
                                className={`shrink-0 transition-all ${isRecording ? 'animate-pulse' : ''}`}
                            >
                                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Floating Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all hover:scale-110 pointer-events-auto"
                >
                    <Sparkles className="h-7 w-7" />
                </Button>
            )}
        </div>
    );
}
