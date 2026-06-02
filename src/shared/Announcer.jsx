import { useState, useEffect, useRef } from 'react';

// Visuaalisesti piilotettu live-alue. Ilmoittaa ruudunlukijalle pelin uusimman
// tapahtuman (siirtorekisterin tuorein logText). Aina läsnä, riippumatta siitä
// onko näkyvä tapahtumaloki auki vai kiinni.
export default function Announcer({ message }) {
  const [text, setText] = useState('');
  const prev = useRef('');
  useEffect(() => {
    // logText voi olla HTML-string tai React-node — ilmoitetaan vain string-viestit
    if (typeof message !== 'string') return;
    const plain = message.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (plain && plain !== prev.current) {
      prev.current = plain;
      setText(plain);
    }
  }, [message]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}
    >
      {text}
    </div>
  );
}
