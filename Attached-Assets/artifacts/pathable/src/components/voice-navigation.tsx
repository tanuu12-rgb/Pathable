import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Users } from 'lucide-react';
import { Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Create a custom blue dot icon for the user position
const userIcon = new L.DivIcon({
  html: `<div style="background-color: blue; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: '',
  iconSize: [15, 15],
  iconAnchor: [7.5, 7.5]
});

interface Location {
  name: string;
  lat: number;
  lng: number;
  keywords: string[];
}

const LOCATIONS: Location[] = [
  { name: 'Classroom', lat: 19.075541, lng: 72.991941, keywords: ['class', 'classroom', 'room'] },
  { name: 'HOD Cabin', lat: 19.075511, lng: 72.991790, keywords: ['hod', 'cabin', 'head of department'] },
  { name: 'Computer Lab', lat: 19.075526, lng: 72.991729, keywords: ['computer', 'lab', 'labs'] },
  { name: 'Washroom', lat: 19.075515, lng: 72.991749, keywords: ['washroom', 'toilet', 'restroom', 'bathroom'] },
  { name: 'Library', lat: 19.075466, lng: 72.991408, keywords: ['library', 'books'] },
  { name: 'Foyer', lat: 19.075565, lng: 72.991730, keywords: ['foyer', 'entrance', 'lobby'] }
];

export interface Detection {
  class: string;
  score: number;
  bbox: number[];
}

export interface VoiceNavigationProps {
  onDestinationSet: (lat: number, lng: number, name: string) => void;
  detections: Detection[];
}

type Priority = 'CRITICAL' | 'HEAVY_CROWD' | 'GPS' | 'MODERATE_CROWD';

interface QueueItem {
  text: string;
  priority: Priority;
  addedAt: number;
}

const PRIORITIES: Record<Priority, number> = {
  CRITICAL: 1,
  HEAVY_CROWD: 2,
  GPS: 3,
  MODERATE_CROWD: 4,
};

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360; // in degrees
}

function getDirectionName(bearing: number) {
  if (bearing >= 337.5 || bearing < 22.5) return 'north';
  if (bearing >= 22.5 && bearing < 67.5) return 'north-east';
  if (bearing >= 67.5 && bearing < 112.5) return 'east';
  if (bearing >= 112.5 && bearing < 157.5) return 'south-east';
  if (bearing >= 157.5 && bearing < 202.5) return 'south';
  if (bearing >= 202.5 && bearing < 247.5) return 'south-west';
  if (bearing >= 247.5 && bearing < 292.5) return 'west';
  if (bearing >= 292.5 && bearing < 337.5) return 'north-west';
  return 'forward';
}

export default function VoiceNavigation({ onDestinationSet, detections }: VoiceNavigationProps) {
  const [isListening, setIsListening] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [crowdCount, setCrowdCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [destination, setDestination] = useState<Location | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const recognitionRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const synthesisQueueRef = useRef<QueueItem[]>([]);
  const isSpeakingRef = useRef(false);
  
  const lastGPSAnnounceRef = useRef(0);
  const lastBearingRef = useRef<number | null>(null);
  const lastHeavyCrowdAnnounceRef = useRef(0);
  const lastModerateCrowdAnnounceRef = useRef(0);

  const synth = window.speechSynthesis;

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
    }

    return () => {
      stopNavigation();
      synth.cancel();
    };
  }, []);

  const processQueue = useCallback(() => {
    if (isSpeakingRef.current || synthesisQueueRef.current.length === 0) return;

    // Sort by priority, then by added time
    synthesisQueueRef.current.sort((a, b) => {
      if (PRIORITIES[a.priority] === PRIORITIES[b.priority]) {
        return a.addedAt - b.addedAt;
      }
      return PRIORITIES[a.priority] - PRIORITIES[b.priority];
    });

    const nextItem = synthesisQueueRef.current.shift();
    if (!nextItem) return;

    isSpeakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(nextItem.text);
    
    utterance.onend = () => {
      isSpeakingRef.current = false;
      processQueue();
    };
    
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      processQueue();
    };

    setAnnouncement(nextItem.text);
    synth.speak(utterance);
  }, [synth]);

  const speak = useCallback((text: string, priority: Priority = 'GPS') => {
    synthesisQueueRef.current.push({
      text,
      priority,
      addedAt: Date.now()
    });
    processQueue();
  }, [processQueue]);

  // Crowd detection processing
  useEffect(() => {
    if (!isNavigating) return;

    const persons = detections.filter(d => d.class === 'person');
    const count = persons.length;
    setCrowdCount(count);

    const now = Date.now();
    
    if (count >= 6) {
      if (now - lastHeavyCrowdAnnounceRef.current > 15000) {
        speak("Heavy crowd detected ahead, consider alternate path", 'HEAVY_CROWD');
        lastHeavyCrowdAnnounceRef.current = now;
      }
    } else if (count >= 3 && count <= 5) {
      if (now - lastModerateCrowdAnnounceRef.current > 20000) {
        speak("Moderate crowd ahead, proceed carefully", 'MODERATE_CROWD');
        lastModerateCrowdAnnounceRef.current = now;
      }
    }
  }, [detections, isNavigating, speak]);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsNavigating(false);
    setDestination(null);
  }, []);

  const handleLocationUpdate = useCallback((position: GeolocationPosition, targetDest: Location) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setUserPosition([lat, lng]);
    
    const distance = calculateDistance(lat, lng, targetDest.lat, targetDest.lng);
    const bearing = calculateBearing(lat, lng, targetDest.lat, targetDest.lng);
    const direction = getDirectionName(bearing);
    
    if (distance <= 10) {
      speak(`You have arrived at ${targetDest.name}`, 'GPS');
      stopNavigation();
      return;
    }

    const now = Date.now();
    let shouldAnnounce = false;

    // Time-based announcement (15 seconds)
    if (now - lastGPSAnnounceRef.current > 15000) {
      shouldAnnounce = true;
    }

    // Bearing-based announcement (20 degrees change)
    if (lastBearingRef.current !== null) {
      let diff = Math.abs(bearing - lastBearingRef.current);
      if (diff > 180) diff = 360 - diff;
      
      if (diff > 20) {
        shouldAnnounce = true;
      }
    }

    if (shouldAnnounce) {
      speak(`Head ${direction}. ${Math.round(distance)} meters to ${targetDest.name}`, 'GPS');
      lastGPSAnnounceRef.current = now;
      lastBearingRef.current = bearing;
    }
  }, [speak, stopNavigation]);

  const startNavigation = useCallback((targetDest: Location) => {
    onDestinationSet(targetDest.lat, targetDest.lng, targetDest.name);
    setDestination(targetDest);
    setIsNavigating(true);
    
    lastGPSAnnounceRef.current = 0;
    lastBearingRef.current = null;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => handleLocationUpdate(position, targetDest),
        (error) => console.error("GPS Watch Error:", error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported");
    }
  }, [handleLocationUpdate, onDestinationSet]);

  const parseLocation = (transcript: string): Location | null => {
    const lower = transcript.toLowerCase();
    const cleanedText = lower
      .replace(/take me to|navigate to|go to|i want to go to/g, '')
      .trim();

    // Try finding a direct match inside cleaned string
    for (const loc of LOCATIONS) {
      const match = loc.keywords.some(kw => cleanedText.includes(kw));
      if (match) return loc;
    }
    
    // Try finding within full transcript just in case
    for (const loc of LOCATIONS) {
      const match = loc.keywords.some(kw => lower.includes(kw));
      if (match) return loc;
    }

    return null;
  };

  const handleStartListening = useCallback(() => {
    if (!recognitionRef.current) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    
    setIsListening(true);
    setAnnouncement('Listening... speak your destination');
    
    const recognition = recognitionRef.current;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const parsedLoc = parseLocation(transcript);
      
      if (parsedLoc) {
        setAnnouncement(`Setting destination to ${parsedLoc.name}. Say yes to confirm or no to try again.`);
        let questionUtterance = new SpeechSynthesisUtterance(`Setting destination to ${parsedLoc.name}. Say yes to confirm or no to try again.`);
        
        questionUtterance.onend = () => {
             // Start a new one-off recognition for yes/no
             const confirmRec = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
             confirmRec.continuous = false;
             confirmRec.interimResults = false;
             confirmRec.onresult = (e: any) => {
                 const confirmVal = e.results[0][0].transcript.toLowerCase();
                 if (confirmVal.includes('yes') || confirmVal.includes('yeah') || confirmVal.includes('yep')) {
                     speak(`Navigation started to ${parsedLoc.name}`);
                     startNavigation(parsedLoc);
                 } else if (confirmVal.includes('no') || confirmVal.includes('nope')) {
                     handleStartListening();
                 } else {
                     speak("I didn't understand. Navigation cancelled.");
                 }
             };
             confirmRec.start();
        };
        synth.speak(questionUtterance);

      } else {
        const errorText = "Sorry, I didn't catch that. Please say library, computer lab, classroom, washroom, HOD cabin, or foyer";
        setAnnouncement(errorText);
        speak(errorText, 'GPS');
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setAnnouncement('');
    };

    try {
        recognition.start();
    } catch (e) {
        console.error(e);
        setIsListening(false);
    }
  }, [speak, startNavigation, synth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v' && !isListening && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        e.preventDefault();
        handleStartListening();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartListening, isListening]);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-[1000]" aria-live="assertive" role="region" aria-label="Voice Navigation">
        {/* Screen reader only announcement */}
        <div className="sr-only">
            {announcement}
        </div>
        
        {/* Visible announcement for visual feedback */}
        {announcement && (
            <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm max-w-[250px] text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                {announcement}
            </div>
        )}

        {isNavigating && (
          <div className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold shadow-lg border border-gray-200">
             Navigating to {destination?.name}
          </div>
        )}

        {isNavigating && crowdCount > 0 && (
            <div className={`px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 ${crowdCount >= 6 ? 'bg-red-500 text-white' : crowdCount >= 3 ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                <Users size={18} />
                <span>👥 {crowdCount} people detected</span>
            </div>
        )}

      <button
        onClick={handleStartListening}
        className={`p-6 rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
        }`}
        aria-label="Activate voice navigation"
        title="Activate Voice Navigation (Press V)"
      >
        <Mic className="text-white w-8 h-8" />
      </button>

      {/* Map visual overlays if the component is placed inside a MapContainer. If this component is not inside a map, the user can lift this state. */}
      {isNavigating && userPosition && destination && (
        <>
          <Marker position={userPosition} icon={userIcon} />
          <Polyline 
            positions={[userPosition, [destination.lat, destination.lng]]} 
            color="blue" 
            dashArray="10, 10" 
            weight={4} 
          />
        </>
      )}
    </div>
  );
}
