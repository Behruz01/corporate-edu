import { useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useMicRecorder } from './useMicRecorder';

type MicButtonProps = {
  onTranscript: (t: string) => void;
  lang?: string;
  disabled?: boolean;
};

type VoiceTranscribeResponse = {
  text: string;
};

export function MicButton({ onTranscript, lang, disabled = false }: MicButtonProps): JSX.Element {
  const { t } = useTranslation('voice');
  const { isRecording, start, stop } = useMicRecorder();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleClick(): Promise<void> {
    if (isProcessing) return;

    if (isRecording) {
      await stopAndTranscribe();
      return;
    }

    try {
      await start();
    } catch (error) {
      toast.error(isPermissionDenied(error) ? t('micDenied') : t('error'));
    }
  }

  async function stopAndTranscribe(): Promise<void> {
    try {
      const audio = await stop();
      if (!audio || audio.size === 0) return;

      setIsProcessing(true);
      const form = new FormData();
      form.append('audio', audio, 'voice.webm');
      const normalizedLang = lang?.trim();
      if (normalizedLang) form.append('lang', normalizedLang);

      const { data } = await api.post<VoiceTranscribeResponse>('/voice/transcribe', form);
      const text = data.text.trim();
      if (text.length > 0) onTranscript(text);
    } catch {
      toast.error(t('error'));
    } finally {
      setIsProcessing(false);
    }
  }

  const label = isProcessing ? t('processing') : isRecording ? t('stop') : t('record');
  const isDisabled = isProcessing || (disabled && !isRecording);

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? 'destructive' : 'outline'}
      disabled={isDisabled}
      aria-label={label}
      title={label}
      onClick={() => void handleClick()}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : isRecording ? (
        <Square className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Mic className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}

function isPermissionDenied(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
}
