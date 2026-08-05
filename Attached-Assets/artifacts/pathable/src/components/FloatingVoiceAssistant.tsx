import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Mic } from "lucide-react";

export default function FloatingVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [, setLocation] = useLocation();
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
      };
    }

    // Keep GPS updated every 30s
    const updateGps = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => {}
      );
    };
    updateGps();
    const gpsInterval = setInterval(updateGps, 30000);

    return () => clearInterval(gpsInterval);
  }, []);

  const speak = (text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  const playBeep = () => {
    try {
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Ignored
    }
  };

  const startListening = useCallback(() => {
    if (isListening || !recognitionRef.current) return;
    setIsListening(true);
    playBeep();
    speak("Voice assistant active. What would you like to do?", () => {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
      }
    });
  }, [isListening]);

  const handleFollowUp = () => {
    speak("Is there anything else you need?", () => {
      const followUpRec = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
      followUpRec.continuous = false;
      followUpRec.lang = "en-US";
      followUpRec.onresult = (e: any) => {
        const tr = e.results[0][0].transcript.toLowerCase();
        if (tr.includes("yes") || tr.includes("yeah") || tr.includes("yep")) {
          startListening();
        } else {
          speak("Voice assistant closed");
        }
      };
      followUpRec.start();
    });
  };

  const handleVoiceCommand = async (command: string) => {
    let handled = false;

    // 1. Navigation
    const navMatch = command.match(/(navigate to|take me to|go to|find) (library|computer lab|classroom|hod cabin|washroom|foyer)/i);
    if (navMatch) {
      let place = navMatch[2].toLowerCase();
      // standardize names
      if (place === 'hod cabin') place = 'HOD Cabin';
      else if (place === 'computer lab') place = 'Computer Lab';
      else place = place.charAt(0).toUpperCase() + place.slice(1);

      speak(`Starting navigation to ${place}`);
      localStorage.setItem("pathable-voice-destination", place);
      setLocation("/navigate");
      handled = true;
    }

    // 2. Report Obstacle
    else if (/(report obstacle|report issue|there is a problem|something is blocking)/i.test(command)) {
      speak("Opening obstacle report");
      setLocation("/report");
      handled = true;
    }

    // 3. Send SOS
    else if (/(sos|help me|emergency|i need help|send sos)/i.test(command)) {
      speak("Sending SOS alert now");
      try {
        const payload = {
          message: "Voice-triggered SOS",
          ...(gpsRef.current && { lat: gpsRef.current.lat, lng: gpsRef.current.lng })
        };
        const res = await fetch("/api/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          speak("SOS sent. Help is on the way", handleFollowUp);
          return; // Skip standard follow up to use this specific one
        } else {
          throw new Error("Failed");
        }
      } catch (err) {
        speak("SOS failed to send. Please call for help directly", handleFollowUp);
        return;
      }
    }

    // 4. Find Safe Room
    else if (/(safe room|find shelter|where is safe|safe space)/i.test(command)) {
      speak("Showing safe rooms near you");
      setLocation("/safe-rooms");
      handled = true;
    }

    // 5. First Aid
    else if (/(first aid|medical help|i am injured|need medical)/i.test(command)) {
      speak("Opening first aid resources");
      setLocation("/emergency");
      handled = true;
    }

    // 6. Start Camera
    else if (/(start camera|open camera|detect obstacles|scan surroundings)/i.test(command)) {
      speak("Starting camera obstacle detection");
      localStorage.setItem("pathable-auto-camera", "true");
      setLocation("/navigate");
      handled = true;
    }

    // 7. Help
    else if (/(help|what can you do|commands)/i.test(command)) {
      speak("You can say: navigate to library, send SOS, report obstacle, find safe room, first aid, or start camera");
      handled = true;
    }

    // Unrecognized
    if (!handled) {
      speak("I didn't understand. Say help to hear available commands", () => {
        try { recognitionRef.current.start(); } catch(e){}
      });
      return;
    }

    if (handled) {
      setTimeout(handleFollowUp, 2000);
    }
  };

  // Double tap to activate
  useEffect(() => {
    let lastTap = 0;
    const handleTouch = (e: TouchEvent | MouseEvent) => {
      // Ignore if clicking the mic button itself (handled by onClick)
      const target = e.target as HTMLElement;
      if (target.closest('.voice-assistant-btn')) return;

      const now = Date.now();
      if (now - lastTap < 300) {
        startListening();
      }
      lastTap = now;
    };
    
    document.addEventListener("pointerdown", handleTouch);
    return () => document.removeEventListener("pointerdown", handleTouch);
  }, [startListening]);

  return (
    <div
      role="region"
      aria-live="assertive"
      style={{ zIndex: 9999, position: "fixed", bottom: "20px", right: "20px" }}
    >
      <button
        role="button"
        tabIndex={0}
        aria-label="Activate voice assistant - double tap anywhere or press this button"
        aria-pressed={isListening}
        className={`voice-assistant-btn flex items-center justify-center rounded-full shadow-lg transition-all ${
          isListening ? "bg-red-500 animate-pulse" : "bg-blue-600 hover:bg-blue-700"
        }`}
        style={{ width: "64px", height: "64px" }}
        onClick={startListening}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startListening();
          }
        }}
      >
        <Mic className="text-white" style={{ width: "32px", height: "32px" }} />
      </button>
    </div>
  );
}
