import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakChinese } from "@/lib/speak";

export default function SpeakButton({
  text,
  label = "Speak",
  className = "",
  size = "icon",
  variant = "outline",
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        speakChinese(text);
      }}
      title={label}
      aria-label={label}
    >
      <Volume2 className="h-4 w-4" />
    </Button>
  );
}