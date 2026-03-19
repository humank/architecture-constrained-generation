export interface OrderItem {
  itemId: string;
  coffeeType: string;
  size: string;
  quantity: number;
  customizations: string[];
  unitPrice: number;
  surcharge: number;
  lineTotal: number;
}

export interface Order {
  orderId: string;
  tableNumber: number;
  items: OrderItem[];
  totalAmount: number;
  cashReceived: number | null;
  changeGiven: number | null;
  status: string;
  placedAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
}

export interface PlaceOrderRequest {
  tableNumber: number;
  items: {
    coffeeType: string;
    size: string;
    quantity: number;
    customizations: string[];
  }[];
}

export interface PreparationItem {
  itemId: string;
  coffeeType: string;
  size: string;
  customizations: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface Preparation {
  preparationId: string;
  orderId: string;
  tableNumber: number;
  items: PreparationItem[];
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface InventoryItem {
  materialId: string;
  materialName: string;
  currentLevel: number;
  maxCapacity: number;
  unit: string;
  percentage: number;
  alertTriggered: boolean;
}

export interface SalesReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByHour: { hour: string; count: number }[];
}

export interface MenuProduct {
  name: string;
  sizes: { size: string; price: number }[];
}

export interface Customization {
  name: string;
  appliesTo: string[];
  options?: string[];
  surcharge: number;
}

export const MENU: MenuProduct[] = [
  {
    name: "Espresso",
    sizes: [
      { size: "Single", price: 60 },
      { size: "Double", price: 80 },
    ],
  },
  {
    name: "Americano",
    sizes: [
      { size: "Short", price: 80 },
      { size: "Tall", price: 100 },
      { size: "Grande", price: 120 },
      { size: "Venti", price: 140 },
    ],
  },
  {
    name: "Latte",
    sizes: [
      { size: "Short", price: 100 },
      { size: "Tall", price: 120 },
      { size: "Grande", price: 140 },
      { size: "Venti", price: 160 },
    ],
  },
  {
    name: "Cappuccino",
    sizes: [
      { size: "Short", price: 100 },
      { size: "Tall", price: 120 },
      { size: "Grande", price: 140 },
      { size: "Venti", price: 160 },
    ],
  },
];

export const CUSTOMIZATIONS: Customization[] = [
  {
    name: "no foam",
    appliesTo: ["Latte"],
    surcharge: 0,
  },
  {
    name: "with foam",
    appliesTo: ["Latte"],
    surcharge: 0,
  },
  {
    name: "more foam",
    appliesTo: ["Latte"],
    surcharge: 0,
  },
  {
    name: "dry foam (1:2 milk-to-foam)",
    appliesTo: ["Cappuccino"],
    surcharge: 0,
  },
  {
    name: "wet foam (2:1 milk-to-foam)",
    appliesTo: ["Cappuccino"],
    surcharge: 0,
  },
  {
    name: "Whipped cream",
    appliesTo: ["Cappuccino"],
    surcharge: 20,
  },
  {
    name: "Soy milk substitution",
    appliesTo: ["Latte", "Cappuccino"],
    surcharge: 0,
  },
];
