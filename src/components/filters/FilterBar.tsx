import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useCategories, Category } from "@/hooks/useCategories";
import { useTags, TagRow } from "@/hooks/useTags";

interface FilterBarProps {
  selectedCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  selectedTagIds: string[];
  onTagsChange: (ids: string[]) => void;
  showCategory?: boolean;
}

export function FilterBar({
  selectedCategoryId,
  onCategoryChange,
  selectedTagIds,
  onTagsChange,
  showCategory = true,
}: FilterBarProps) {
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const hasFilters = selectedCategoryId !== null || selectedTagIds.length > 0;

  const selectedTagNames = useMemo(() => {
    return tags.filter((t) => selectedTagIds.includes(t.id));
  }, [tags, selectedTagIds]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showCategory && (
        <Select
          value={selectedCategoryId ?? "__all__"}
          onValueChange={(v) => onCategoryChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tutte le categorie</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
            Tag
            {selectedTagIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {selectedTagIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cerca tag…" />
            <CommandList>
              <CommandEmpty>Nessun tag trovato</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggleTag(tag.id)}
                    className="gap-2"
                  >
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm">{tag.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected tag chips */}
      {selectedTagNames.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1 text-xs cursor-pointer hover:bg-secondary/80"
          onClick={() => toggleTag(tag.id)}
        >
          {tag.name}
          <X className="h-3 w-3" />
        </Badge>
      ))}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-xs text-muted-foreground"
          onClick={() => {
            onCategoryChange(null);
            onTagsChange([]);
          }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}
