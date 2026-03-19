import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { preparationApi, inventoryApi } from "@/lib/api";
import type { Preparation, PreparationItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useToast } from "@/hooks/use-toast";

type Tab = "queue" | "inventory";

function PreparationQueueTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preparations, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["preparations"],
    queryFn: () => preparationApi.getPreparations("PENDING,IN_PROGRESS"),
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: ({ prepId, itemId }: { prepId: string; itemId: string }) =>
      preparationApi.startPreparation(prepId, itemId),
    onSuccess: () => {
      toast({ title: "Preparation started" });
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to start preparation",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ prepId, itemId }: { prepId: string; itemId: string }) =>
      preparationApi.completePreparation(prepId, itemId),
    onSuccess: () => {
      toast({ title: "Preparation completed" });
      queryClient.invalidateQueries({ queryKey: ["preparations"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to complete preparation",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const preps = preparations ?? [];

  if (preps.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No orders in queue
      </div>
    );
  }

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "border-l-gray-400";
      case "IN_PROGRESS":
        return "border-l-yellow-400";
      case "READY":
        return "border-l-green-400";
      default:
        return "border-l-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      {preps.map((prep: Preparation) => (
        <Card key={prep.preparationId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Order {prep.orderId.slice(0, 8)}... - Table {prep.tableNumber}
              </CardTitle>
              <StatusBadge status={prep.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prep.items.map((item: PreparationItem) => (
                <div
                  key={item.itemId}
                  className={`border-l-4 ${getItemStatusColor(item.status)} pl-4 py-2 bg-muted/30 rounded-r-md`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {item.coffeeType} - {item.size}
                      </div>
                      {item.customizations && (
                        <div className="text-sm text-muted-foreground">
                          {item.customizations}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            startMutation.mutate({
                              prepId: prep.preparationId,
                              itemId: item.itemId,
                            })
                          }
                          disabled={startMutation.isPending}
                        >
                          Start
                        </Button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            completeMutation.mutate({
                              prepId: prep.preparationId,
                              itemId: item.itemId,
                            })
                          }
                          disabled={completeMutation.isPending}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InventoryTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.getInventoryItems(),
    refetchInterval: 5000,
  });

  const replenishMutation = useMutation({
    mutationFn: (materialId: string) =>
      inventoryApi.requestReplenishment(materialId),
    onSuccess: () => {
      toast({ title: "Replenishment requested" });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to request replenishment",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const inventory = items ?? [];

  const getBarColor = (percentage: number) => {
    if (percentage > 50) return "bg-green-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCardBorder = (percentage: number) => {
    if (percentage > 50) return "";
    if (percentage >= 30) return "border-yellow-300";
    return "border-red-300";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {inventory.map((item) => (
        <Card key={item.materialId} className={getCardBorder(item.percentage)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{item.materialName}</CardTitle>
              {item.alertTriggered && (
                <StatusBadge status="LOW STOCK" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.currentLevel.toLocaleString()} / {item.maxCapacity.toLocaleString()}{" "}
                  {item.unit}
                </span>
                <span className="font-medium">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`${getBarColor(item.percentage)} h-3 rounded-full transition-all`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
              {item.percentage < 30 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    replenishMutation.mutate(item.materialId)
                  }
                  disabled={replenishMutation.isPending}
                >
                  Request Replenishment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BaristaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("queue");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Barista Dashboard</h1>

      <div className="flex gap-1 border-b">
        {[
          { id: "queue" as Tab, label: "Preparation Queue" },
          { id: "inventory" as Tab, label: "Inventory" },
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

      {activeTab === "queue" && <PreparationQueueTab />}
      {activeTab === "inventory" && <InventoryTab />}
    </div>
  );
}
