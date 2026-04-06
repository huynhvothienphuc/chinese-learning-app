import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { speakChinese } from '@/lib/speak';
import { cn } from '@/lib/utils';

export default function SpeakButton({ text, label = 'Speak', className = '', variant = 'outline', size = 'icon', iconSize = 'md', slow = false }) {
  const [playing, setPlaying] = useState(false);
  const iconClass = iconSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  function handleClick(event) {
    event.stopPropagation();
    setPlaying(true);
    speakChinese(text, {
      rate: slow ? 0.6 : 0.88,
      onEnd: () => setPlaying(false),
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(
        'transition-colors',
        playing && 'border-green-400 bg-green-50 text-green-600 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400',
        className,
      )}
      title={label}
      aria-label={label}
      onClick={handleClick}
    >
      <Volume2 className={cn(iconClass, playing && 'animate-pulse')} />
    </Button>
  );
}
