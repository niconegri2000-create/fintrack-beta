import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AppModal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex flex-col max-h-[85vh] gap-0 p-0", className)}>
        {title ? (
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        ) : null}

        {/* BODY SCROLLABILE */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">{children}</div>
        </ScrollArea>

        {/* FOOTER FISSO */}
        {footer ? (
          <div className="border-t px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
