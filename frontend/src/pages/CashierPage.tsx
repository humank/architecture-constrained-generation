import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi, reportingApi } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useToast } from "@/hooks/use-toast";

type Tab = "confirmation" | "payment" | "report";

function PendingConfirmationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", "PLACED"],
    queryFn: () => orderApi.getOrders("PLACED"),
    refetchInterval: 5000,
  });

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.confirmOrder(orderId),
    onSuccess: () => {
      toast({ title: "Order confirmed" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to confirm order",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const placedOrders = orders ?? [];

  if (placedOrders.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No pending orders to confirm
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Table</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {placedOrders.map((order) => (
          <TableRow key={order.orderId}>
            <TableCell className="font-mono text-xs">
              {order.orderId.slice(0, 8)}...
            </TableCell>
            <TableCell>Table {order.tableNumber}</TableCell>
            <TableCell className="max-w-xs truncate">
              {order.items
                .map((i) => `${i.quantity}x ${i.coffeeType} (${i.size})`)
                .join(", ")}
            </TableCell>
            <TableCell>{order.totalAmount} THB</TableCell>
            <TableCell>
              <StatusBadge status={order.status} />
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                onClick={() => confirmMutation.mutate(order.orderId)}
                disabled={confirmMutation.isPending}
              >
                Confirm
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PendingPaymentTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cashInputs, setCashInputs] = useState<Record<string, string>>({});
  const [paymentResults, setPaymentResults] = useState<
    Record<string, { cashReceived: number; changeGiven: number }>
  >({});

  const { data: orders, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", "CONFIRMED"],
    queryFn: () => orderApi.getOrders("CONFIRMED"),
    refetchInterval: 5000,
  });

  const payMutation = useMutation({
    mutationFn: ({
      orderId,
      cashReceived,
    }: {
      orderId: string;
      cashReceived: number;
    }) => orderApi.processPayment(orderId, cashReceived),
    onSuccess: (data: Order) => {
      toast({ title: "Payment processed successfully" });
      if (data.cashReceived !== null && data.changeGiven !== null) {
        setPaymentResults((prev) => ({
          ...prev,
          [data.orderId]: {
            cashReceived: data.cashReceived!,
            changeGiven: data.changeGiven!,
          },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Payment failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const confirmedOrders = orders ?? [];

  if (confirmedOrders.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No orders awaiting payment
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confirmedOrders.map((order) => {
        const cashStr = cashInputs[order.orderId] ?? "";
        const cashNum = parseFloat(cashStr);
        const result = paymentResults[order.orderId];

        return (
          <Card key={order.orderId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Order {order.orderId.slice(0, 8)}... - Table{" "}
                  {order.tableNumber}
                </CardTitle>
                <StatusBadge status={order.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <p className="text-sm text-muted-foreground">
                  {order.items
                    .map((i) => `${i.quantity}x ${i.coffeeType} (${i.size})`)
                    .join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-semibold">
                  Total: {order.totalAmount} THB
                </div>
                <Input
                  type="number"
                  placeholder="Cash received"
                  className="w-40"
                  value={cashStr}
                  onChange={(e) =>
                    setCashInputs((prev) => ({
                      ...prev,
                      [order.orderId]: e.target.value,
                    }))
                  }
                />
                <Button
                  onClick={() =>
                    payMutation.mutate({
                      orderId: order.orderId,
                      cashReceived: cashNum,
                    })
                  }
                  disabled={
                    payMutation.isPending ||
                    isNaN(cashNum) ||
                    cashNum < order.totalAmount
                  }
                >
                  Process Payment
                </Button>
              </div>
              {result && (
                <div className="mt-3 p-3 bg-green-50 rounded-md text-sm">
                  <p>
                    Cash Received: <strong>{result.cashReceived} THB</strong>
                  </p>
                  <p>
                    Change: <strong>{result.changeGiven} THB</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SalesReportTab() {
  const { data: report, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["salesReport"],
    queryFn: () => reportingApi.getSalesReport(),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!report) return null;

  const maxCount = Math.max(...report.ordersByHour.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{report.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{report.totalRevenue} THB</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {report.averageOrderValue.toFixed(0)} THB
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orders by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          {report.ordersByHour.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No sales data yet
            </p>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {report.ordersByHour.map((entry) => {
                const heightPct = (entry.count / maxCount) * 100;
                return (
                  <div
                    key={entry.hour}
                    className="flex-1 flex flex-col items-center justify-end"
                  >
                    <span className="text-xs mb-1">{entry.count}</span>
                    <div
                      className="w-full bg-primary rounded-t-sm min-h-[4px]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-xs mt-1 text-muted-foreground">
                      {entry.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CashierPage() {
  const [activeTab, setActiveTab] = useState<Tab>("confirmation");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cashier Dashboard</h1>

      <div className="flex gap-1 border-b">
        {[
          { id: "confirmation" as Tab, label: "Pending Confirmation" },
          { id: "payment" as Tab, label: "Pending Payment" },
          { id: "report" as Tab, label: "Sales Report" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "confirmation" && <PendingConfirmationTab />}
      {activeTab === "payment" && <PendingPaymentTab />}
      {activeTab === "report" && <SalesReportTab />}
    </div>
  );
}
