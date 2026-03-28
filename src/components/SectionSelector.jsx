import { Select } from '@/components/ui/select';
import { formatSectionName } from '@/lib/utils';

export default function SectionSelector({ sections, selectedSection, onChange }) {
  return (
    <Select value={selectedSection} onChange={(event) => onChange(event.target.value)}>
      {sections.map((section) => (
        <option key={section} value={section}>
          {formatSectionName(section)}
        </option>
      ))}
    </Select>
  );
}
