import { useState } from 'react';

export function useSpeechToText(onResult: (text: string) => void) {
  const [recognising, setRecognising] = useState(false);

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported');
      return;
    }
    const rec = new (window as any).webkitSpeechRecognition();
    rec.lang = 'en-GB';
    rec.onstart = () => setRecognising(true);
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript);
    rec.onend = () => setRecognising(false);
    rec.start();
  };

  return { recognising, startDictation };
}