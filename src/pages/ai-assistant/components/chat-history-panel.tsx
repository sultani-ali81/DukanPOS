import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AiChatThreadSummary } from "@/types/ai-assistant";
import {
  Clock3,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { formatThreadTime, getThreadTitle } from "../ai-assistant.utils";

type ChatHistoryPanelProps = {
  threads: AiChatThreadSummary[];
  selectedThreadId: string | null;
  loading: boolean;
  disabled: boolean;
  renamingThreadId: string | null;
  renameValue: string;
  renameLoading: boolean;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onStartRename: (thread: AiChatThreadSummary) => void;
  onRenameValueChange: (value: string) => void;
  onCancelRename: () => void;
  onSubmitRename: (threadId: string) => void;
  onDelete: (thread: AiChatThreadSummary) => void;
  onClose?: () => void;
  className?: string;
};

export function ChatHistoryPanel({
  threads,
  selectedThreadId,
  loading,
  disabled,
  renamingThreadId,
  renameValue,
  renameLoading,
  onNewChat,
  onSelectThread,
  onStartRename,
  onRenameValueChange,
  onCancelRename,
  onSubmitRename,
  onDelete,
  onClose,
  className,
}: ChatHistoryPanelProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-muted/20", className)}>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2 px-1 text-sm font-semibold">
          <MessageSquare className="size-4 text-muted-foreground" />
          <span>Chats</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewChat}
            disabled={disabled}
          >
            <Plus className="size-4" />
            New
          </Button>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close chat history"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2.5">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading chats...
            </div>
          ) : null}

          {!loading && threads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              No saved chats yet.
            </div>
          ) : null}

          {threads.map((thread) => {
            const active = thread.id === selectedThreadId;

            return (
              <div
                key={thread.id}
                className={cn(
                  "group flex items-center rounded-lg transition-colors",
                  active
                    ? "bg-gray-100 text-foreground shadow-sm ring-1 ring-border"
                    : "text-foreground hover:bg-muted/80",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                {renamingThreadId === thread.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-1 p-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onSubmitRename(thread.id);
                    }}
                  >
                    <Input
                      autoFocus
                      value={renameValue}
                      maxLength={120}
                      disabled={renameLoading}
                      aria-label="Conversation title"
                      className="h-8 bg-gray-100 text-foreground"
                      onChange={(event) =>
                        onRenameValueChange(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Escape") onCancelRename();
                      }}
                      onBlur={() => {
                        if (!renameLoading) onCancelRename();
                      }}
                    />
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectThread(thread.id)}
                      aria-current={active ? "page" : undefined}
                      className="min-w-0 flex-1 px-3 py-2 text-left"
                    >
                      <span className="block truncate text-sm font-medium">
                        {getThreadTitle(thread)}
                      </span>
                      <span
                        className={cn(
                          "mt-1 flex items-center gap-1 text-xs",
                          "text-muted-foreground",
                        )}
                      >
                        <Clock3 className="size-3" />
                        {formatThreadTime(thread.lastMessageAt)}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${getThreadTitle(thread)}`}
                          disabled={disabled}
                          className={cn(
                            "mr-1 shrink-0 opacity-70 hover:opacity-100",
                            active && "hover:bg-muted",
                          )}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => onStartRename(thread)}
                        >
                          <Pencil /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => onDelete(thread)}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
