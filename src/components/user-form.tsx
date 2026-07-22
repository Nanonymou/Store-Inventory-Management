"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Site, UserRole } from "@/lib/types";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  siteId: string | null;
}

type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

interface UserFormProps {
  sites: Site[];
  /** "create" collects email + password; "edit" hides them. */
  mode: "create" | "edit";
  initial?: Partial<UserFormValues>;
  submitLabel?: string;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

/**
 * Create/edit form for a user. A Storeman must be bound to a site; an Admin is
 * not. On create it also collects the email and a temporary password
 * (min. 8 chars, letters + digits) the user must change on first login.
 */
export function UserForm({
  sites,
  mode,
  initial,
  submitLabel = "Simpan",
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(initial?.role ?? "storeman");
  const [siteId, setSiteId] = React.useState<string>(initial?.siteId ?? "");
  const [errors, setErrors] = React.useState<UserFormErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: UserFormErrors = {};
    if (!name.trim()) next.name = "Nama wajib diisi.";
    if (mode === "create") {
      if (!email.trim()) next.email = "Email wajib diisi.";
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        next.email = "Format email tidak valid.";
      }
      if (password.length < 8) {
        next.password = "Password minimal 8 karakter.";
      } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        next.password = "Password harus mengandung huruf dan angka.";
      }
    }
    if (role === "storeman" && !siteId) {
      next.siteId = "Storeman wajib terikat ke site.";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      siteId: role === "admin" ? null : siteId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Nama" error={errors.name} required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Budi Santoso"
          autoFocus
        />
      </Field>

      {mode === "create" && (
        <Field label="Email" error={errors.email} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@stokman.test"
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Peran" required>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as UserRole)}
            options={[
              { value: "storeman", label: "Storeman" },
              { value: "admin", label: "Admin" },
            ]}
            className="w-full"
          />
        </Field>
        {role === "storeman" && (
          <Field label="Site" error={errors.siteId} required>
            <Select
              value={siteId}
              onValueChange={setSiteId}
              placeholder="Pilih site"
              options={sites.map((s) => ({ value: s.id, label: s.name }))}
              className="w-full"
            />
          </Field>
        )}
      </div>

      {mode === "create" && (
        <Field
          label="Password Sementara"
          error={errors.password}
          required
        >
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min. 8 karakter, huruf + angka"
          />
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
