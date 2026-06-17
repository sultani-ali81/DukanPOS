"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { users } from "@/lib/data";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function ProfileClient() {
  const currentUser = users[0]; // Using first user as current user
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: currentUser.name,
    phone: currentUser.phone,
  });
  const [originalData] = useState({
    name: currentUser.name,
    phone: currentUser.phone,
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    toast.success("Profile updated", {
      description: "Your profile information has been saved successfully.",
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setFormData(originalData);
    setIsEditing(false);
  }

  return (
    <div>
      <PageHeader
        title="Profile Settings"
        description="Manage your account information."
      >
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </PageHeader>

      <div className="max-w-2xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Editable Fields */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                    {formData.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                    {formData.phone}
                  </div>
                )}
              </div>

              {/* Read-only Fields */}
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {currentUser.role}
                </div>
              </div>

              <div className="space-y-2">
                <Label>User ID</Label>
                <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {currentUser.id}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {currentUser.active ? "Active" : "Inactive"}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
