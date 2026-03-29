import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { speakChinese } from '@/lib/speak';

export default function SpeakButton({ text, label = 'Speak', className = '', variant = 'outline', size = 'icon' }) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        speakChinese(text);
      }}
    >
      <Volume2 className="h-4 w-4" />
    </Button>
  );
}
