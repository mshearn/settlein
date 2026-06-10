/** Thin wrapper over the Web Speech API (prefixed on iOS/Chrome). */

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface ListenHandle {
  stop(): void;
}

export function listen(
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError: (message: string) => void,
): ListenHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = navigator.language || "en-US";
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  rec.onresult = (event: any) => {
    let transcript = "";
    let isFinal = false;
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onResult(transcript.trim(), isFinal);
  };
  rec.onerror = (event: any) => {
    if (event.error === "no-speech") {
      onError("We didn't hear anything. Please try again.");
    } else if (event.error === "not-allowed") {
      onError("Microphone access was blocked. You can type instead.");
    } else {
      onError("Voice input didn't work this time. You can type instead.");
    }
  };
  rec.onend = onEnd;
  rec.start();

  return { stop: () => rec.stop() };
}
