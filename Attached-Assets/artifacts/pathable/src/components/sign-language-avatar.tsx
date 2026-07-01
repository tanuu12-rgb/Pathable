import { useEffect, useState } from "react";
import { Hand, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface SignLanguageAvatarProps {
  text: string;
  isActive: boolean;
}

export function SignLanguageAvatar({ text, isActive }: SignLanguageAvatarProps) {
  const [currentWord, setCurrentWord] = useState<string>("");

  useEffect(() => {
    if (!isActive || !text) {
      setCurrentWord("");
      return;
    }

    const words = text.split(" ").filter((w) => w.length > 0);
    if (words.length === 0) return;

    let i = 0;
    setCurrentWord(words[0]);

    const intervalId = setInterval(() => {
      i++;
      if (i < words.length) {
        setCurrentWord(words[i]);
      } else {
        clearInterval(intervalId);
        setTimeout(() => setCurrentWord(""), 1000);
      }
    }, 400); // Change word/sign every 400ms

    return () => clearInterval(intervalId);
  }, [text, isActive]);

  if (!isActive && !currentWord) return null;

  return (
    <div className="w-full flex-shrink-0 bg-background border-t border-border p-3 flex flex-col items-center justify-center gap-2 relative overflow-hidden h-32">
      
      {/* Background aesthetics */}
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      
      {/* Title */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 z-10 w-full justify-start px-2">
        <Activity className="h-3 w-3 animate-pulse" />
        <span>ASL Interpretation</span>
      </div>

      <div className="flex-1 w-full flex items-center justify-center gap-8 z-10">
        {/* Animated Hand Icon representing the "avatar" */}
        <motion.div
           animate={{
            rotate: [0, -15, 15, -15, 0],
            y: [0, -5, 5, -5, 0],
            scale: [1, 1.1, 1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="bg-primary/10 text-primary p-3 rounded-full"
        >
          <Hand className="h-10 w-10" />
        </motion.div>

        {/* The text being signed */}
        <div className="min-w-[120px] text-center">
            {currentWord ? (
                <motion.span
                  key={currentWord}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-bold tracking-wider uppercase text-foreground bg-accent/20 px-4 py-1.5 rounded-full inline-block"
                >
                  {currentWord}
                </motion.span>
            ) : (
                <span className="text-sm text-muted-foreground italic">Idle</span>
            )}
        </div>
      </div>
    </div>
  );
}
