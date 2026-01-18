'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SearchFiltersProps {
  source: string;
  onSourceChange: (source: string) => void;
  language: 'english' | 'hindi';
  onLanguageChange: (language: 'english' | 'hindi') => void;
}

export function SearchFilters({ 
  source, 
  onSourceChange, 
  language, 
  onLanguageChange 
}: SearchFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      <div className="space-y-2">
        <Label htmlFor="source-filter" className="text-xs md:text-sm">
          {language === 'hindi' ? 'स्रोत' : 'Source'}
        </Label>
        <Select value={source} onValueChange={onSourceChange}>
          <SelectTrigger id="source-filter" className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">
              {language === 'hindi' ? 'सभी' : 'All Sources'}
            </SelectItem>
            <SelectItem value="bhagavatam" className="text-sm">Śrīmad-Bhāgavatam</SelectItem>
            <SelectItem value="vishnu_sahasranam" className="text-sm">Viṣṇu Sahasranāma</SelectItem>
            <SelectItem value="lalita_sahasranam" className="text-sm">Lalitā Sahasranāma</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="language-filter" className="text-xs md:text-sm">
          {language === 'hindi' ? 'भाषा' : 'Language'}
        </Label>
        <Select value={language} onValueChange={(v: any) => onLanguageChange(v)}>
          <SelectTrigger id="language-filter" className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english" className="text-sm">English</SelectItem>
            <SelectItem value="hindi" className="text-sm">हिन्दी</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
