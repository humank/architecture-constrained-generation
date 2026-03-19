import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { orderApi } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus } from "lucide-react";

const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PAID", "READY", "DELIVERED"];

export function WaiterOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", "active"],
    queryFn: () => orderApi.getOrders("active"),
    refetchInterval: 5000,
  });

  const deliverMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.deliverOrder(orderId),
    onSuccess: () => {
      toast({ title: "Order marked as delivered" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update order status",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.completeOrder(orderId),
    onSuccess: () => {
      toast({ title: "Order completed" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to complete order",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <LoadingState rows={5} />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  const activeOrders = (orders ?? []).filter((o) =>
    ACTIVE_STATUSES.includes(o.status)
  );
  const readyOrders = activeOrders.filter((o) => o.status === "READY");
  const deliveredOrders = activeOrders.filter((o) => o.status === "DELIVERED");

  const summarizeItems = (order: Order) =>
    order.items
      .map((i) => `${i.quantity}x ${i.coffeeType} (${i.size})`)
      .join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Active Orders</h1>
        <Button asChild>
          <Link to="/waiter/orders/new">
            <Plus className="h-4 w-4 mr-1" />
            New Order
          </Link>
        </Button>
      </div>

      {activeOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active orders
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOrders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-mono text-xs">
                      {order.orderId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>Table {order.tableNumber}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {summarizeItems(order)}
                    </TableCell>
                    <TableCell>{order.totalAmount} THB</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.placedAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {readyOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ready for Delivery</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyOrders.map((order) => (
              <Card key={order.orderId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Table {order.tableNumber}
                    </CardTitle>
                    <StatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {summarizeItems(order)}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => deliverMutation.mutate(order.orderId)}
                    disabled={deliverMutation.isPending}
                  >
                    {deliverMutation.isPending ? "Delivering..." : "Deliver"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {deliveredOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Delivered - Pending Completion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveredOrders.map((order) => (
              <Card key={order.orderId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Table {order.tableNumber}
                    </CardTitle>
                    <StatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {summarizeItems(order)}
                  </p>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => completeMutation.mutate(order.orderId)}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? "Completing..." : "Complete"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
