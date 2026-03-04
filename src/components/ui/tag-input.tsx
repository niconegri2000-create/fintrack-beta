import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTags, useCreateTag, TagRow } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface TagInputProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagInput({ selectedTagIds, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  const filtered = allTags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase().trim())
  );

  const normalizedInput = inputValue.toLowerCase().trim().replace(/^#/, "");
  const exactMatch = allTags.find((t) => t.name === normalizedInput);
  const showCreateOption = normalizedInput.length > 0 && !exactMatch;

  const addTag = useCallback(
    (tagId: string) => {
      if (!selectedTagIds.includes(tagId)) {
        onChange([...selectedTagIds, tagId]);
      }
      setInputValue("");
    },
    [selectedTagIds, onChange]
  );

  const removeTag = useCallback(
    (tagId: string) => {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    },
    [selectedTagIds, onChange]
  );

  const handleCreateAndAdd = useCallback(async () => {
    if (!normalizedInput) return;
    try {
      const tag = await createTag.mutateAsync(normalizedInput);
      addTag(tag.id);
    } catch {
      // upsert might return existing
    }
  }, [normalizedInput, createTag, addTag]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && !showCreateOption) {
        addTag(filtered[0].id);
      } else if (showCreateOption) {
        handleCreateAndAdd();
      }
    }
    if (e.key === "Backspace" && !inputValue && selectedTagIds.length > 0) {
      removeTag(selectedTagIds[selectedTagIds.length - 1]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs"
          >
            #{tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="ml-0.5 rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Cerca o crea tag…"
          className="text-sm"
        />

        {showSuggestions && (filtered.length > 0 || showCreateOption) && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag.id);
                }}
              >
                #{tag.name}
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-accent transition-colors font-medium"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreateAndAdd();
                }}
              >
                + Crea "#{normalizedInput}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
