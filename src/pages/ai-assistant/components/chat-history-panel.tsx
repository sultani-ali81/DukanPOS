import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}: ChatHistoryPanelProps) {
  return (
    <Card className="min-h-0 gap-0 border border-border py-0">
      <CardHeader className="h-[72px] shrink-0 border-b border-border px-4 py-4">
        <div className="flex h-full items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-muted-foreground" />
            Chats
          </CardTitle>
          <Button type="button" size="sm" onClick={onNewChat} disabled={disabled}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3">
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
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
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
                      className="h-8 bg-white text-foreground"
                      onChange={(event) => onRenameValueChange(event.target.value)}
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
                      className="min-w-0 flex-1 px-3 py-2 text-left"
                    >
                      <span className="block truncate text-sm font-medium">
                        {getThreadTitle(thread)}
                      </span>
                      <span
                        className={cn(
                          "mt-1 flex items-center gap-1 text-xs",
                          active
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground",
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
                            active &&
                              "text-primary-foreground hover:bg-white/15 hover:text-primary-foreground",
                          )}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onStartRename(thread)}>
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
      </CardContent>
    </Card>
  );
}
