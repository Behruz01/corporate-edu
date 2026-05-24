import { useEffect, useRef, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

type SpeakButtonProps = {
  text: string;
  disabled?: boolean;
};

type PlaybackState = 'idle' | 'loading' | 'playing';

export default function SpeakButton({ text, disabled = false }: SpeakButtonProps): JSX.Element {
  const { t } = useTranslation('voice');
  const [state, setState] = useState<PlaybackState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  async function handleClick(): Promise<void> {
    if (state === 'loading') return;
    if (state === 'playing') {
      stopPlayback();
      return;
    }

    const input = text.trim();
    if (!input || disabled) return;

    setState('loading');
    try {
      const { data } = await api.post<Blob>('/voice/speak', { text: input }, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const audio = new Audio(url);

      urlRef.current = url;
      audioRef.current = audio;
      audio.addEventListener('ended', handlePlaybackDone, { once: true });
      audio.addEventListener('error', handlePlaybackError, { once: true });

      await audio.play();
      setState('playing');
    } catch {
      cleanupAudio();
      setState('idle');
      toast.error(t('error'));
    }
  }

  function handlePlaybackDone(): void {
    cleanupAudio();
    setState('idle');
  }

  function handlePlaybackError(): void {
    cleanupAudio();
    setState('idle');
    toast.error(t('error'));
  }

  function stopPlayback(): void {
    cleanupAudio();
    setState('idle');
  }

  function cleanupAudio(): void {
    audioRef.current?.pause();
    audioRef.current = null;

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }

  const label = state === 'loading' ? t('speaking') : state === 'playing' ? t('stop') : t('speak');
  const isDisabled = state === 'loading' || (state === 'idle' && (disabled || text.trim().length === 0));

  return (
    <Button
      type="button"
      size="icon"
      variant={state === 'playing' ? 'destructive' : 'ghost'}
      className="h-8 w-8"
      disabled={isDisabled}
      aria-label={label}
      title={label}
      onClick={() => void handleClick()}
    >
      {state === 'loading' ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : state === 'playing' ? (
        <Square className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
