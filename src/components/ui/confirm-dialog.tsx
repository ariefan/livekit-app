"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(true);
    setResolveRef(null);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(false);
    setResolveRef(null);
  }, [resolveRef]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 animate-in fade-in-0"
            onClick={handleCancel}
          />
          {/* Dialog */}
          <div
            className={cn(
              "relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
              "mx-4"
            )}
          >
            <h2 className="text-lg font-semibold">{options.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {options.description}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                {options.cancelText || "Cancel"}
              </Button>
              <Button
                variant={options.variant === "destructive" ? "destructive" : "default"}
                onClick={handleConfirm}
              >
                {options.confirmText || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
