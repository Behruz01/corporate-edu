import { useCallback, useEffect, useRef, useState } from 'react';

type StopHandlers = {
  resolve: (blob: Blob | null) => void;
  reject: (error: Error) => void;
};

type MicRecorder = {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  blob: Blob | null;
};

export function useMicRecorder(): MicRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopHandlersRef = useRef<StopHandlers | null>(null);

  const cleanup = useCallback((): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (recorderRef.current?.state === 'recording') return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('MIC_UNSUPPORTED');
    if (typeof MediaRecorder === 'undefined') throw new Error('MIC_UNSUPPORTED');

    setBlob(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const options: MediaRecorderOptions = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
    const recorder = new MediaRecorder(stream, options);
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event): void => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = (): void => {
      const type = recorder.mimeType || 'audio/webm';
      const recordedBlob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type }) : null;
      setBlob(recordedBlob);
      const handlers = stopHandlersRef.current;
      stopHandlersRef.current = null;
      cleanup();
      handlers?.resolve(recordedBlob);
    };

    recorder.onerror = (event): void => {
      const error = new Error(event.error?.message || 'MIC_RECORDING_FAILED');
      const handlers = stopHandlersRef.current;
      stopHandlersRef.current = null;
      cleanup();
      handlers?.reject(error);
    };

    recorder.start();
    setIsRecording(true);
  }, [cleanup]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return blob;

    return new Promise<Blob | null>((resolve, reject) => {
      stopHandlersRef.current = { resolve, reject };
      try {
        recorder.stop();
      } catch (error) {
        stopHandlersRef.current = null;
        cleanup();
        reject(error instanceof Error ? error : new Error('MIC_STOP_FAILED'));
      }
    });
  }, [blob, cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { isRecording, start, stop, blob };
}
