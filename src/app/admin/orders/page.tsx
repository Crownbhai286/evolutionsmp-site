"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  Filter,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { useToast } from "@/components/NotificationToast";

interface OrderItem {
  slug: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
  coinAmount?: number;
}

interface StoreOrder {
  id: string;
  order_id: string;
  famgateway_order_id: string | null;
  username: string;
  amount: number;
  currency: string;
  original_usd_total: number;
  items: OrderItem[];
  delivery_commands: string[];
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  payment_status: "unpaid" | "paid" | "failed" | "expired";
  payment_method: string;
  utr: string | null;
  sender_upi: string | null;
  checkout_url: string;
  delivery_status: "pending" | "delivered" | "failed" | "manual_review";
  delivered_at: string | null;
  delivery_error: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [tableNotice, setTableNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [copiedCmdIdx, setCopiedCmdIdx] = useState<number | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        showToast("Error", json.error || "Failed loading orders.", "warning");
        return;
      }
      setOrders(json.orders || []);
      setTableReady(json.tableReady ?? true);
      if (json.notice) setTableNotice(json.notice);
    } catch {
      showToast("Error", "Network error fetching orders.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleCopyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmdIdx(idx);
    setTimeout(() => setCopiedCmdIdx(null), 2000);
    showToast("Command Copied", cmd, "info");
  };

  const handleMarkDelivered = async (orderId: string) => {
    setMarkingDelivered(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_status: "delivered",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("Error", json.error || "Failed to update delivery.", "warning");
        return;
      }
      showToast("Delivery Updated", "Order marked as delivered.", "success");
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(json.order);
      }
      fetchOrders();
    } catch {
      showToast("Error", "Network error updating order.", "warning");
    } finally {
      setMarkingDelivered(false);
    }
  };

  // Metrics
  const totalRevenueInr = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const paidCount = orders.filter((o) => o.payment_status === "paid").length;
  const pendingCount = orders.filter((o) => o.payment_status === "unpaid" && o.status === "pending").length;

  return (
    <AdminShell
      title="Orders & UPI Payments"
      subtitle="Track FamGateway UPI payments, bank UTR references, and Minecraft perk delivery status."
      actions={
        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="btn glass py-2 px-3.5 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {!tableReady && (
        <div className="mb-6 rounded-2xl p-4 bg-[#ff9a1f]/10 border border-[#ff9a1f]/30 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#ff9a1f] shrink-0 mt-0.5" />
          <div className="text-xs text-[#d1d7f0] leading-relaxed">
            <b className="text-white block font-bold mb-1">Database Table Notice</b>
            {tableNotice || "Run supabase/migrations/002_famgateway_orders.sql in Supabase SQL Editor to initialize the orders table."}
          </div>
        </div>
      )}

      {/* In-Game Delivery Notice Banner */}
      <div className="mb-6 rounded-2xl p-4 bg-[#3aa0ff]/10 border border-[#3aa0ff]/25 flex items-start gap-3">
        <PackageCheck className="h-5 w-5 text-[#3aa0ff] shrink-0 mt-0.5" />
        <div className="text-xs text-[#d1d7f0] leading-relaxed">
          <b className="text-white block font-bold mb-0.5">In-Game Delivery Status & Management</b>
          Paid UPI orders generate verified Minecraft console commands (e.g. LuckPerms ranks or economy coins). Staff can review and copy commands directly below to run in the server console, or connect an in-game sync plugin using <code className="text-[#3aa0ff] bg-black/40 px-1 py-0.5 rounded">MINECRAFT_SYNC_API_KEY</code> to dispatch commands automatically.
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4 bg-[#141a42] border border-white/[0.08]">
          <span className="text-xs font-bold text-[#a3abd6] uppercase tracking-wider block mb-1">
            Total UPI Revenue
          </span>
          <div className="font-head text-3xl font-bold text-[#10b981]">
            ₹{totalRevenueInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <small className="text-xs text-[#a3abd6] mt-1 block">From verified paid orders</small>
        </div>

        <div className="rounded-2xl p-4 bg-[#141a42] border border-white/[0.08]">
          <span className="text-xs font-bold text-[#a3abd6] uppercase tracking-wider block mb-1">
            Paid Orders
          </span>
          <div className="font-head text-3xl font-bold text-white">
            {paidCount}
          </div>
          <small className="text-xs text-[#10b981] mt-1 block">Completed transactions</small>
        </div>

        <div className="rounded-2xl p-4 bg-[#141a42] border border-white/[0.08]">
          <span className="text-xs font-bold text-[#a3abd6] uppercase tracking-wider block mb-1">
            Pending Orders
          </span>
          <div className="font-head text-3xl font-bold text-[#ff9a1f]">
            {pendingCount}
          </div>
          <small className="text-xs text-[#a3abd6] mt-1 block">Awaiting UPI confirmation</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3abd6]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, Minecraft IGN, or Bank UTR..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141a42] text-white border border-white/[0.08] text-xs focus:outline-none focus:border-[#3aa0ff]"
            />
          </div>
          <button type="submit" className="btn py-2 px-4 text-xs font-bold">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#a3abd6]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-[#141a42] text-white border border-white/[0.08] py-2 px-3 text-xs focus:outline-none focus:border-[#3aa0ff]"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#141a42] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0a0d22]/50 text-[#a3abd6] uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer IGN</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Delivery</th>
                <th className="py-3 px-4">Bank UTR</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-[#d1d7f0]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#a3abd6]">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#3aa0ff]" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#a3abd6]">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isPaid = order.payment_status === "paid";
                  const isDelivered = order.delivery_status === "delivered";

                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {order.order_id}
                        {order.famgateway_order_id && (
                          <span className="block font-normal text-[10px] text-[#a3abd6]">
                            {order.famgateway_order_id}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <img
                            src={`https://mc-heads.net/avatar/${order.username}/20`}
                            alt={order.username}
                            className="w-5 h-5 rounded-sm bg-black/40"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <span>{order.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        ₹{Number(order.amount).toFixed(2)}
                        <span className="block font-normal text-[10px] text-[#a3abd6]">
                          ${Number(order.original_usd_total).toFixed(2)} USD
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </span>
                        ) : order.status === "failed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </span>
                        ) : order.status === "expired" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#6b7280]/15 text-[#9ca3af] border border-[#6b7280]/30">
                            <Clock className="h-3 w-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[#ff9a1f]/30">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isDelivered ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#3aa0ff]/15 text-[#3aa0ff] border border-[#3aa0ff]/30">
                            <PackageCheck className="h-3 w-3" />
                            Delivered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ff9a1f]/15 text-[#ff9a1f] border border-[#ff9a1f]/30">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#a3abd6]">
                        {order.utr || "—"}
                      </td>
                      <td className="py-3 px-4 text-[#a3abd6] text-[11px] whitespace-nowrap">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="btn glass py-1.5 px-3 text-xs font-bold"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0a0d22] border border-white/[0.12] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div>
                <h3 className="font-head text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#3aa0ff]" />
                  Order {selectedOrder.order_id}
                </h3>
                <span className="text-xs text-[#a3abd6]">
                  Gateway ID: {selectedOrder.famgateway_order_id || "None"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[#a3abd6] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#141a42] border border-white/[0.08]">
                <div>
                  <span className="text-[#a3abd6] block text-[10px] uppercase font-bold">Customer</span>
                  <span className="font-bold text-white text-sm">{selectedOrder.username}</span>
                </div>
                <div>
                  <span className="text-[#a3abd6] block text-[10px] uppercase font-bold">Amount (INR)</span>
                  <span className="font-bold text-[#10b981] text-sm">₹{Number(selectedOrder.amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#a3abd6] block text-[10px] uppercase font-bold">Payment</span>
                  <span className="font-bold text-white capitalize">{selectedOrder.payment_status}</span>
                </div>
                <div>
                  <span className="text-[#a3abd6] block text-[10px] uppercase font-bold">Bank UTR</span>
                  <span className="font-mono text-white font-bold">{selectedOrder.utr || "Pending"}</span>
                </div>
              </div>

              {/* Items Purchased */}
              <div>
                <h4 className="font-bold text-white mb-2 uppercase text-[11px] tracking-wider text-[#a3abd6]">
                  Purchased Items
                </h4>
                <div className="rounded-xl bg-[#141a42] border border-white/[0.08] divide-y divide-white/[0.06]">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div>
                          <b className="text-white block">{item.name}</b>
                          <span className="text-[#a3abd6] text-[11px]">
                            Qty: {item.quantity} &bull; ${item.unitPriceUsd?.toFixed(2)} USD each
                          </span>
                        </div>
                        <span className="font-bold text-white">
                          ${item.subtotalUsd?.toFixed(2)} USD
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-[#a3abd6]">No items list saved.</div>
                  )}
                </div>
              </div>

              {/* In-game Delivery Commands */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-[#a3abd6] flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-[#3aa0ff]" />
                    In-game Delivery Commands
                  </h4>
                  <span className="text-[11px] text-[#a3abd6]">
                    Status: <b className="text-white capitalize">{selectedOrder.delivery_status}</b>
                  </span>
                </div>
                <div className="rounded-xl bg-[#060814] border border-white/[0.08] p-3 space-y-2">
                  {selectedOrder.delivery_commands && selectedOrder.delivery_commands.length > 0 ? (
                    selectedOrder.delivery_commands.map((cmd, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                      >
                        <code className="font-mono text-[#3aa0ff] break-all">{cmd}</code>
                        <button
                          type="button"
                          onClick={() => handleCopyCommand(cmd, idx)}
                          className="text-[#a3abd6] hover:text-white shrink-0 p-1"
                          title="Copy command"
                        >
                          {copiedCmdIdx === idx ? (
                            <Check className="h-3.5 w-3.5 text-[#10b981]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-[#a3abd6] text-[11px]">No delivery commands generated.</div>
                  )}
                </div>
              </div>

              {selectedOrder.checkout_url && (
                <div>
                  <a
                    href={selectedOrder.checkout_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3aa0ff] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open FamGateway Checkout Page
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-between items-center">
              {selectedOrder.delivery_status !== "delivered" && (
                <button
                  type="button"
                  onClick={() => handleMarkDelivered(selectedOrder.id)}
                  disabled={markingDelivered}
                  className="btn py-2 px-4 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white flex items-center gap-1.5"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  <span>Mark as Delivered</span>
                </button>
              )}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn glass py-2 px-4 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
