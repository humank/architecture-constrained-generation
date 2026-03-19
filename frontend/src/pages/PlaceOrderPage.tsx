import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { orderApi } from "@/lib/api";
import { MENU, CUSTOMIZATIONS, type PlaceOrderRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface OrderItemForm {
  id: number;
  coffeeType: string;
  size: string;
  quantity: number;
  customizations: string[];
}

let nextItemId = 1;

function getAvailableSizes(coffeeType: string) {
  const product = MENU.find((p) => p.name === coffeeType);
  return product?.sizes ?? [];
}

function getAvailableCustomizations(coffeeType: string) {
  return CUSTOMIZATIONS.filter((c) => c.appliesTo.includes(coffeeType));
}

function getPrice(coffeeType: string, size: string): number {
  const product = MENU.find((p) => p.name === coffeeType);
  const sizeInfo = product?.sizes.find((s) => s.size === size);
  return sizeInfo?.price ?? 0;
}

function getSurcharge(customizations: string[]): number {
  return customizations.reduce((sum, c) => {
    const cust = CUSTOMIZATIONS.find((x) => x.name === c);
    return sum + (cust?.surcharge ?? 0);
  }, 0);
}

function calcLineTotal(item: OrderItemForm): number {
  const unitPrice = getPrice(item.coffeeType, item.size);
  const surcharge = getSurcharge(item.customizations);
  return (unitPrice + surcharge) * item.quantity;
}

export function PlaceOrderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tableNumber, setTableNumber] = useState<string>("");
  const [items, setItems] = useState<OrderItemForm[]>([
    { id: nextItemId++, coffeeType: "", size: "", quantity: 1, customizations: [] },
  ]);

  const mutation = useMutation({
    mutationFn: (data: PlaceOrderRequest) => orderApi.placeOrder(data),
    onSuccess: () => {
      toast({ title: "Order placed successfully!" });
      navigate("/waiter/orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: nextItemId++, coffeeType: "", size: "", quantity: 1, customizations: [] },
    ]);
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: number, updates: Partial<OrderItemForm>) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, ...updates };
          // Reset size and customizations when coffee type changes
          if (updates.coffeeType && updates.coffeeType !== item.coffeeType) {
            updated.size = "";
            updated.customizations = [];
          }
          return updated;
        })
      );
    },
    []
  );

  const toggleCustomization = useCallback(
    (itemId: number, customization: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const has = item.customizations.includes(customization);
          return {
            ...item,
            customizations: has
              ? item.customizations.filter((c) => c !== customization)
              : [...item.customizations, customization],
          };
        })
      );
    },
    []
  );

  const orderTotal = items.reduce((sum, item) => sum + calcLineTotal(item), 0);

  const isValid =
    tableNumber !== "" &&
    items.length > 0 &&
    items.every(
      (item) =>
        item.coffeeType !== "" &&
        item.size !== "" &&
        item.quantity > 0
    );

  const handleSubmit = () => {
    if (!isValid) return;
    mutation.mutate({
      tableNumber: parseInt(tableNumber, 10),
      items: items.map((item) => ({
        coffeeType: item.coffeeType,
        size: item.size,
        quantity: item.quantity,
        customizations: item.customizations,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Place New Order</h1>
        <Button variant="outline" onClick={() => navigate("/waiter/orders")}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Table Number</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={tableNumber} onValueChange={setTableNumber}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((t) => (
                <SelectItem key={t} value={t.toString()}>
                  Table {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Items</h2>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        {items.map((item, index) => {
          const sizes = getAvailableSizes(item.coffeeType);
          const customizations = getAvailableCustomizations(item.coffeeType);
          const lineTotal = calcLineTotal(item);

          return (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label htmlFor={`coffee-type-${item.id}`} className="text-sm font-medium mb-1 block">
                      Coffee Type
                    </label>
                    <Select
                      value={item.coffeeType}
                      onValueChange={(v) =>
                        updateItem(item.id, { coffeeType: v })
                      }
                    >
                      <SelectTrigger id={`coffee-type-${item.id}`}>
                        <SelectValue placeholder="Select coffee" />
                      </SelectTrigger>
                      <SelectContent>
                        {MENU.map((product) => (
                          <SelectItem key={product.name} value={product.name}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor={`size-${item.id}`} className="text-sm font-medium mb-1 block">
                      Size
                    </label>
                    <Select
                      value={item.size}
                      onValueChange={(v) => updateItem(item.id, { size: v })}
                      disabled={!item.coffeeType}
                    >
                      <SelectTrigger id={`size-${item.id}`}>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((s) => (
                          <SelectItem key={s.size} value={s.size}>
                            {s.size} - {s.price} THB
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor={`quantity-${item.id}`} className="text-sm font-medium mb-1 block">
                      Quantity
                    </label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min={1}
                      max={10}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                    />
                  </div>
                </div>

                {customizations.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">
                      Customizations
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {customizations.map((c) => {
                        const isSelected = item.customizations.includes(c.name);
                        return (
                          <Button
                            key={c.name}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              toggleCustomization(item.id, c.name)
                            }
                          >
                            {c.name}
                            {c.surcharge > 0 && ` (+${c.surcharge})`}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {item.coffeeType && item.size && (
                  <div className="text-right text-sm font-medium">
                    Line Total: {lineTotal} THB
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Order Total</span>
            <span className="text-lg font-bold">{orderTotal} THB</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!isValid || mutation.isPending}
        >
          {mutation.isPending ? "Placing Order..." : "Place Order"}
        </Button>
      </div>
    </div>
  );
}
