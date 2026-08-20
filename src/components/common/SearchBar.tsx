import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (val: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  className = '',
  onSearchChange,
  placeholder = 'Search opportunities, notice, or keyword...',
  ...props
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3.5 pointer-events-none flex items-center">
        <Search className="h-4 w-4 text-slate-400" />
      </div>
      <input
        type="text"
        className="au-input !pl-10 h-10 text-xs sm:text-sm font-semibold text-slate-700"
        placeholder={placeholder}
        onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        {...props}
      />
    </div>
  );
};

export default SearchBar;
