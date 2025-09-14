
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  allowCreation?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  emptyMessage = "No options found.",
  allowCreation = true
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value ? options.find(o => o.value === value)?.label : "");

  React.useEffect(() => {
    const selectedOption = options.find(o => o.value === value);
    setInputValue(selectedOption ? selectedOption.label : "");
  }, [value, options]);

  const handleSelect = (currentValue: string, isCreation = false) => {
    if (isCreation) {
      onChange(currentValue); // Pass the new label for creation
      setInputValue(currentValue);
    } else {
      const selectedOption = options.find(o => o.value === currentValue);
      onChange(selectedOption ? selectedOption.value : "");
      setInputValue(selectedOption ? selectedOption.label : "");
    }
    setOpen(false);
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
       const selectedOption = options.find(o => o.value === value);
       setInputValue(selectedOption ? selectedOption.label : "");
    }
    setOpen(isOpen);
  }

  const currentLabel = options.find((option) => option.value === value)?.label || placeholder;

  const showCreateNew = allowCreation && inputValue && !options.some(option => option.label.toLowerCase() === inputValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={(value, search) => {
            if (options.find(o => o.label === value)?.label.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
        }}>
          <CommandInput 
            placeholder="Искать или создать..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                {!showCreateNew && emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Compare with label for filtering
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {showCreateNew && (
                <CommandItem
                  key={inputValue}
                  value={inputValue}
                  onSelect={() => handleSelect(inputValue, true)}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Создать "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
