import { Select } from '@/components/ui/select';

export default function SectionSelector({ sections, selectedSection, onChange }) {
  return (
    <Select className="w-full min-w-0" value={selectedSection} onChange={(event) => onChange(event.target.value)}>
      {sections.length === 0 ? <option value="">No sections</option> : null}
      {sections.map((section) => (
        <option key={section.file} value={section.file} disabled={section.enabled === false}>
          {section.title}{section.enabled === false ? ' (Coming soon)' : ''}
        </option>
      ))}
    </Select>
  );
}
