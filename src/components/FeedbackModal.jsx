import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp } from 'lucide-react';
import { chatWithKnowledgeBase, applyFeedbackToQueue } from '../services/geminiService';
import kbContent from '../data/knowledgeBase.md?raw';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: "Hi, I'm Pace. I can help you with the DXC prepaid accounting process — GL codes, amortization schedules, vendor contracts, exception handling, or anything about P1/P2.\n\nWhat would you like to know?"
            }]);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) handleClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleClose = () => {
        setMessages([]);
        setInputValue('');
        onClose();
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;
        const userMessage = inputValue.trim();
        setInputValue('');

        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        const history = messages.map(m => ({ role: m.role, content: m.content }));

        try {
            const response = await chatWithKnowledgeBase(userMessage, kbContent, history);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting. Try asking about GL codes, amortization schedules, or the P1/P2 workflow."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQueueAsFeedback = async (msgContent) => {
        try {
            await applyFeedbackToQueue({
                title: `Feedback: ${msgContent.slice(0, 60)}`,
                feedback: msgContent,
                questions: [],
                answers: [],
                summary: msgContent,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '✓ Queued as a process improvement item. The finance team will review it.'
            }]);
        } catch (e) {
            console.error('Queue error:', e);
        }
    };

    const ShimmerText = ({ text }) => (
        <div className="relative inline-block leading-none">
            <span className="text-[13px] font-[450] block leading-[13px] text-[#A3A3A3]">{text}</span>
            <span
                className="text-[13px] font-[450] pointer-events-none absolute top-0 left-0 bg-clip-text leading-[13px] text-transparent animate-[width_1.5s_linear_infinite]"
                style={{
                    backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 40%, #5E7BFF 50%, transparent 60%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: '120% 0%',
                }}
            >
                {text}
            </span>
        </div>
    );

    const PaceAvatar = () => (
        <div className="flex h-4 min-h-4 w-4 min-w-4 items-center justify-center rounded-md bg-[#2445ff] text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
        </div>
    );

    const formatContent = (text) => {
        // Bold **text** → <strong>
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const ChatMessage = ({ msg, onQueueFeedback }) => {
        const isUser = msg.role === 'user';
        const lines = msg.content.split('\n');

        return (
            <div className="flex w-full mb-5 justify-start">
                <div className="flex gap-3 w-full">
                    {isUser ? (
                        <div className="w-6 h-6 bg-[#FFE2D1] rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[#AF521F] text-[10px] font-bold">P</span>
                        </div>
                    ) : (
                        <div className="mt-0.5 flex-shrink-0">
                            <PaceAvatar />
                        </div>
                    )}

                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-[#171717]">
                                {isUser ? 'You' : 'Pace'}
                            </span>
                        </div>

                        {msg.isLoading ? (
                            <div className="flex items-center gap-1.5">
                                <ShimmerText text="Thinking..." />
                            </div>
                        ) : (
                            <div className="text-[13px] text-[#171717] leading-relaxed font-[450] space-y-1">
                                {lines.map((line, i) => {
                                    if (line.startsWith('• ')) {
                                        return (
                                            <div key={i} className="flex gap-2">
                                                <span className="text-[#8f8f8f] mt-0.5">•</span>
                                                <span>{formatContent(line.slice(2))}</span>
                                            </div>
                                        );
                                    }
                                    if (line === '') return <div key={i} className="h-1" />;
                                    return <p key={i}>{formatContent(line)}</p>;
                                })}
                                {!isUser && onQueueFeedback && msg.content.length > 60 && !msg.content.startsWith('✓') && (
                                    <button
                                        onClick={() => onQueueFeedback(msg.content)}
                                        className="mt-2 text-[11px] text-[#8f8f8f] hover:text-[#555] underline underline-offset-2 transition-colors"
                                    >
                                        Submit as process improvement
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end pb-6 pr-6 pointer-events-none">
            <div className="pointer-events-auto relative shadow-2xl w-[380px] rounded-[22px] border border-gray-200 bg-white animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="flex max-h-[560px] flex-col rounded-[22px]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0] shrink-0">
                        <div className="flex items-center gap-2">
                            <PaceAvatar />
                            <span className="text-[13px] font-semibold text-[#171717]">Work with Pace</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#e8fff0] text-[10px] font-medium text-[#16a34a]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] inline-block"></span>
                                Online
                            </span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-black/5 rounded-full transition-colors opacity-50 hover:opacity-100"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden" style={{ minHeight: '200px' }}>
                        {messages.map((msg, idx) => (
                            <ChatMessage
                                key={idx}
                                msg={msg}
                                onQueueFeedback={handleQueueAsFeedback}
                            />
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 mb-5">
                                <div className="mt-0.5 flex-shrink-0"><PaceAvatar /></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-[#171717]">Pace</span>
                                    <ShimmerText text="Thinking..." />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick suggestions (only before first user message) */}
                    {messages.length === 1 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                            {['GL code mapping', 'Amortization schedule', 'How does P2 work?', 'Exception handling'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setInputValue(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                                    className="text-[11px] px-2.5 py-1 rounded-full border border-[#e5e5e5] text-[#555] hover:bg-[#f5f5f5] transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 border-t border-[#f0f0f0] shrink-0">
                        <div className="rounded-xl border border-[#e5e5e5] bg-white relative">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Ask anything about the process..."
                                disabled={isLoading}
                                className="w-[calc(100%-20px)] text-[13px] font-[450] placeholder:text-[#b0b0b0] text-[#171717] min-h-[20px] max-h-[120px] resize-none border-none bg-transparent m-2.5 p-0 focus:ring-0 focus:outline-none overflow-y-auto shadow-none outline-none leading-[18px]"
                                rows={1}
                                style={{ height: 'auto', minHeight: '20px' }}
                            />
                            <div className="flex items-center justify-end py-2 pr-2.5">
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isLoading}
                                    className={`p-1.5 rounded-full transition-all flex items-center justify-center w-6 h-6 ${
                                        inputValue.trim() && !isLoading
                                            ? 'bg-[#2445ff] text-white hover:bg-[#1a35e0]'
                                            : 'bg-[#f0f0f0] text-[#ccc]'
                                    }`}
                                >
                                    <ArrowUp className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
