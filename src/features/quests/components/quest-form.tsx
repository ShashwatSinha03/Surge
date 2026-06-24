'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TEMPLATES = [
  { value: 'saas', label: 'SaaS' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'mobile_app', label: 'Mobile App' },
  { value: 'open_source', label: 'Open Source' },
  { value: 'custom', label: 'Custom' },
] as const;

type FieldErrors = {
  title?: string;
  description?: string;
  template_type?: string;
};

export function QuestForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState('custom');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        template_type: templateType,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.errors) {
        const fieldErrors: FieldErrors = {};
        for (const err of data.errors) {
          const field = err.path?.[0] as keyof FieldErrors;
          if (field) fieldErrors[field] = err.message;
        }
        setErrors(fieldErrors);
      } else if (data.error) {
        setErrors({ title: data.error });
      }
      setSubmitting(false);
      return;
    }

    router.push(`/quests/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <Input
        label="Title"
        placeholder="Name your quest"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        maxLength={100}
        required
      />

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm text-muted">
          Description
        </label>
        <textarea
          id="description"
          placeholder="What are you building?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-fg text-sm placeholder:text-muted/50 focus:outline-none focus:border-fg/40 transition-colors resize-none"
        />
        {errors.description && (
          <p className="text-xs text-red-400">{errors.description}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm text-muted">Template</label>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTemplateType(t.value)}
              className={`px-3 py-2.5 rounded-lg text-sm border transition-colors ${
                templateType === t.value
                  ? 'bg-accent text-accent-fg border-accent'
                  : 'bg-surface text-muted border-border hover:border-fg/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {errors.template_type && (
          <p className="text-xs text-red-400">{errors.template_type}</p>
        )}
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Quest'}
      </Button>
    </form>
  );
}
