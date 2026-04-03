import { Select } from '@/components/ui/select';

export default function SectionSelector({ sections, selectedSection, onChange, noSectionsLabel, comingSoonLabel,lessonLabel }) {
  return (
    <Select className="w-full min-w-0" value={selectedSection} onChange={(event) => onChange(event.target.value)}>
      {sections.length === 0 ? <option value="">{noSectionsLabel}</option> : null}
      {sections.map((section) => (
        <option key={section.id || section.file} value={section.file} disabled={section.enabled === false}>
          {section.order ? `${lessonLabel} ${section.order} - ${section.title}` : section.title}
          {section.enabled === false ? ` (${comingSoonLabel})` : ''}
        </option>
      ))}
    </Select>
  );
}
