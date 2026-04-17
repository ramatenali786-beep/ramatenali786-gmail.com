import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { LANGUAGES } from './languages';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  label: string;
  disabled?: boolean;
}

export function LanguageSelector({ selectedCode, onSelect, label, disabled }: LanguageSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(search.toLowerCase()) ||
    lang.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLang = LANGUAGES.find(l => l.code === selectedCode);

  return (
    <DropdownMenu open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <DropdownMenuTrigger className="flex-1 w-full outline-none" disabled={disabled}>
        <div className={cn(
          "flex-1 bg-surface p-4 rounded-2xl border border-white/5 space-y-1 transition-colors text-left w-full",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/5"
        )}>
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{label}</p>
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-bold truncate mr-2">
              {selectedLang?.name || 'Select Language'}
            </span>
            {!disabled && <Search className="w-4 h-4 text-gold opacity-50" />}
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] bg-bg-deep border-white/10 p-0 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <Input
              autoFocus
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="pl-9 bg-surface border-white/5 focus-visible:ring-gold/50 rounded-xl h-10"
            />
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onSelect(lang.code);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all",
                    selectedCode === lang.code 
                      ? "bg-gold/10 text-gold font-bold" 
                      : "text-text-dim hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span>{lang.name}</span>
                    <span className="text-[10px] opacity-50 uppercase tracking-tighter">{lang.code}</span>
                  </div>
                  {selectedCode === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-text-dim text-sm">
                No languages found
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
