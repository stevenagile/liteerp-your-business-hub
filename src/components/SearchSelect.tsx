import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type SearchOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string | null;
  options: SearchOption[];
  onChange: (value: string, option: SearchOption) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  renderItem?: (opt: SearchOption) => ReactNode;
};

export function SearchSelect({
  value,
  options,
  onChange,
  placeholder = "請選擇",
  emptyText = "查無資料",
  className,
  disabled,
  renderItem,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="搜尋..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.hint ?? ""} ${opt.value}`}
                  onSelect={() => {
                    onChange(opt.value, opt);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {renderItem ? (
                    renderItem(opt)
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {opt.hint}
                        </span>
                      )}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
