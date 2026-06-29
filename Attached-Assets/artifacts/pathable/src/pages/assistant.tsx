import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@workspace/api-client-react";
import { Send, Mic, MicOff, Volume2, VolumeX, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
  checklist?: string[];
}

const SUGGESTED = [
  "How do I get to the library?",
  "Is there an accessible restroom near Block B?",
  "What do I do if I get stuck?",
  "Where is the nearest first aid kit?",
  "Find me a quiet room",
];

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm PathAble's campus assistant. I can help you navigate Lakewood University accessibly, find facilities, and answer questions about campus accessibility. What do you need?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const aiChat = useAiChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function speak(text: string) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    aiChat.mutate(
      { data: { message: text } },
      {
        onSuccess: (data) => {
          const assistantMsg: Message = {
            role: "assistant",
            content: data.reply,
            checklist: data.checklist,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          speak(data.reply);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
          ]);
        },
      }
    );
  }

  function toggleListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">Campus navigation help</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTtsEnabled(!ttsEnabled)}
          aria-label={ttsEnabled ? "Disable voice output" : "Enable voice output"}
          className="gap-1.5 text-xs"
        >
          {ttsEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          {ttsEnabled ? "Voice On" : "Voice Off"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <MessageCircle className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-card border border-border text-foreground rounded-bl-none"
              }`}
            >
              <p className="leading-relaxed">{msg.content}</p>
              {msg.checklist && msg.checklist.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Action checklist:</p>
                  <ol className="space-y-1">
                    {msg.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 w-4 h-4 bg-primary/20 text-primary rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        ))}

        {aiChat.isPending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 shrink-0">
              <MessageCircle className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-4 pt-2 border-t border-border">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about campus accessibility..."
              aria-label="Message input"
              className="w-full px-4 py-2.5 pr-10 border border-border rounded-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <Button
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            onClick={toggleListening}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            className="rounded-full shrink-0 h-10 w-10"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || aiChat.isPending}
            aria-label="Send message"
            className="rounded-full shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isListening && (
          <p className="text-xs text-primary text-center mt-2 animate-pulse">Listening...</p>
        )}
      </div>
    </div>
  );
}
