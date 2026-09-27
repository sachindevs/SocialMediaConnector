"use client";

import { useState, useEffect, useCallback } from "react";
import type { ICannedResponse } from "@/types";

interface FormState {
  title: string;
  body: string;
  shortcut: string;
}

const emptyForm: FormState = { title: "", body: "", shortcut: "" };

export default function CannedResponsesPage() {
  const [responses, setResponses] = useState<ICannedResponse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchResponses = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/canned-responses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.cannedResponses ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchResponses(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchResponses]);

  function openCreate() {
    setEditingId(null);
    setFormState(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(resp: ICannedResponse) {
    setEditingId(resp._id.toString());
    setFormState({ title: resp.title, body: resp.body, shortcut: resp.shortcut });
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormState(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingId
        ? `/api/canned-responses/${editingId}`
        : "/api/canned-responses";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error)
        );
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setFormState(emptyForm);
      fetchResponses(search);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this canned response? This cannot be undone.")) return;
    const res = await fetch(`/api/canned-responses/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchResponses(search);
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to delete");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Canned Responses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage reusable reply templates for your team.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Response
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            {editingId ? "Edit Canned Response" : "Create Canned Response"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Greeting message"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shortcut{" "}
                <span className="text-gray-400 font-normal">(lowercase letters, digits, - _)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">/</span>
                <input
                  type="text"
                  value={formState.shortcut}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                    }))
                  }
                  required
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="hello"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body{" "}
                <span className="text-gray-400 font-normal">
                  — use{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">{"{agent_name}"}</code>
                  {", "}
                  <code className="text-xs bg-gray-100 px-1 rounded">{"{customer_name}"}</code>
                  {", "}
                  <code className="text-xs bg-gray-100 px-1 rounded">{"{platform}"}</code>
                </span>
              </label>
              <textarea
                value={formState.body}
                onChange={(e) => setFormState((s) => ({ ...s, body: e.target.value }))}
                required
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="Hi {customer_name}, my name is {agent_name}. How can I help you today?"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Saving…" : editingId ? "Save Changes" : "Create"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or shortcut…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : responses.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {search ? "No responses match your search." : "No canned responses yet."}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shortcut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                  Body preview
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {responses.map((resp) => (
                <tr key={resp._id.toString()} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{resp.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      /{resp.shortcut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">
                    {resp.body}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => openEdit(resp)}
                      className="text-xs text-blue-600 hover:text-blue-800 mr-3 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(resp._id.toString())}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
