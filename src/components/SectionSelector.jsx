import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';

export default function SectionSelector({ sections, sectionsLoading, selectedSection, onChange, noSectionsLabel, comingSoonLabel, lessonLabel }) {
  const { user } = useAuthStore();
  const isGuest = !user;

  function handleChange(e) {
    const file = e.target.value;
    const section = sections.find((s) => s.file === file);
    if (isGuest && section?.source === 'official' && !section?.is_free) return;
    onChange(e.target.value);
  }

  return (
    <Select className="w-full min-w-0" value={selectedSection} onChange={handleChange} disabled={sectionsLoading}>
      {sectionsLoading ? <option value="">...</option> : sections.length === 0 ? <option value="">{noSectionsLabel}</option> : null}
      {sections.map((section) => {
        const isLocked = section.source === 'official' && !section.is_free;
        const disabled = section.enabled === false || (isGuest && isLocked);
        const label = section.order ? `${lessonLabel} ${section.order} - ${section.title}` : section.title;
        const suffix = section.enabled === false ? ` (${comingSoonLabel})` : isLocked ? ' 🔒' : '';
        return (
          <option key={section.id || section.file} value={section.file} disabled={disabled}>
            {label}{suffix}
          </option>
        );
      })}
    </Select>
  );
}
