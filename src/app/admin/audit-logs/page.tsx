"use client";

import React, { useEffect, useState } from "react";
import { Search, Loader2, ClipboardList } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

interface AuditLogRow {
  id: string;
  admin_email: string;
  admin_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLogs = async (targetPage = page, q = search) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/audit-logs?page=${targetPage}&pageSize=25&search=${encodeURIComponent(q)}`
      );
      const json = await res.json();
      if (res.ok) {
        setLogs(json.items || []);
        setTotal(Number(json.total) || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page, search);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <AdminShell
      title="Admin Audit Logs"
      subtitle="Immutable trail of logins, content edits, store pricing changes, and user management."
    >
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadLogs(1, search);
          }}
          className="flex items-center gap-2 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-[#7d87b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, action, entity..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0f1535] border border-white/[0.1] text-xs text-white"
            />
          </div>
          <button type="submit" className="btn small text-xs">
            Filter
          </button>
        </form>

        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-[#a3abd6]">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff9a1f]" />
            <span className="text-xs">Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl p-12 bg-[#0f1535] border border-white/[0.08] text-center text-xs text-[#8f98c7] flex flex-col items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[#6f78a8]" />
            <span>No audit logs match this query.</span>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0f1535] border border-white/[0.08] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090d22] border-b border-white/[0.08] text-[#8f98c7] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#8f98c7]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{log.admin_email}</span>
                      <span className="ml-1.5 text-[10px] font-mono uppercase text-[#ff9a1f]">
                        {log.admin_role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#ff9a1f]/15 text-[#ff9a1f] font-mono font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#c7ccf0]">
                      {log.entity_type}
                      {log.entity_id ? ` (${log.entity_id})` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#7d87b8]">
                      {log.ip_address || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#8f98c7]">
                <span>
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded bg-[#141a42] text-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-[#141a42] text-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
