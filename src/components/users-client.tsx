"use client";

import { EditUserDialog } from "@/components/edit-user-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { users, type User } from "@/lib/data";
import { Pencil } from "lucide-react";
import { useState } from "react";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UsersClient() {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  function handleEdit(user: User) {
    setEditingUser(user);
    setOpen(true);
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="items-center">
            {users.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => handleEdit(u)}
              >
                <TableCell>
                  <div className="flex gap-3 items-center">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.phone}
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "Admin" ? "default" : "secondary"}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.active ? "secondary" : "destructive"}>
                    {u.active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    aria-label={`Edit ${u.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(u);
                    }}
                  >
                    <Pencil className="size-4 " />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <EditUserDialog user={editingUser} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
