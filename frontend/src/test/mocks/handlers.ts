import { http, HttpResponse } from "msw";

export const handlers = [
  // GET /api/orders?status=active — semantic filter
  http.get("/api/orders", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    if (status === "active") {
      return HttpResponse.json([
        {
          orderId: "order-1",
          tableNumber: 1,
          status: "PLACED",
          totalAmount: 120,
          cashReceived: null,
          changeGiven: null,
          placedAt: "2024-03-15T10:30:00",
          confirmedAt: null,
          paidAt: null,
          deliveredAt: null,
          completedAt: null,
          items: [
            {
              itemId: "item-1",
              coffeeType: "LATTE",
              size: "TALL",
              quantity: 1,
              customizations: [],
              unitPrice: 120,
              surcharge: 0,
              lineTotal: 120,
            },
          ],
        },
        {
          orderId: "order-2",
          tableNumber: 3,
          status: "CONFIRMED",
          totalAmount: 280,
          cashReceived: null,
          changeGiven: null,
          placedAt: "2024-03-15T10:35:00",
          confirmedAt: "2024-03-15T10:36:00",
          paidAt: null,
          deliveredAt: null,
          completedAt: null,
          items: [
            {
              itemId: "item-2",
              coffeeType: "CAPPUCCINO",
              size: "GRANDE",
              quantity: 1,
              customizations: ["WhippedCream"],
              unitPrice: 140,
              surcharge: 20,
              lineTotal: 160,
            },
            {
              itemId: "item-3",
              coffeeType: "LATTE",
              size: "TALL",
              quantity: 1,
              customizations: [],
              unitPrice: 120,
              surcharge: 0,
              lineTotal: 120,
            },
          ],
        },
      ]);
    }

    if (status === "PLACED") {
      return HttpResponse.json([
        {
          orderId: "order-1",
          tableNumber: 1,
          status: "PLACED",
          totalAmount: 120,
          cashReceived: null,
          changeGiven: null,
          placedAt: "2024-03-15T10:30:00",
          confirmedAt: null,
          paidAt: null,
          deliveredAt: null,
          completedAt: null,
          items: [],
        },
      ]);
    }

    if (status === "CONFIRMED") {
      return HttpResponse.json([
        {
          orderId: "order-2",
          tableNumber: 3,
          status: "CONFIRMED",
          totalAmount: 280,
          cashReceived: null,
          changeGiven: null,
          placedAt: "2024-03-15T10:35:00",
          confirmedAt: "2024-03-15T10:36:00",
          paidAt: null,
          deliveredAt: null,
          completedAt: null,
          items: [],
        },
      ]);
    }

    if (status === "READY") {
      return HttpResponse.json([]);
    }

    // No status param — empty list
    return HttpResponse.json([]);
  }),

  // GET /api/preparations?status=Pending,InProgress
  http.get("/api/preparations", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    if (status === "PENDING,IN_PROGRESS") {
      return HttpResponse.json([
        {
          preparationId: "prep-1",
          orderId: "order-3",
          tableNumber: 2,
          status: "PENDING",
          createdAt: "2024-03-15T10:40:00",
          completedAt: null,
          items: [
            {
              itemId: "item-4",
              coffeeType: "ESPRESSO",
              size: "DOUBLE",
              customizations: "",
              status: "PENDING",
              startedAt: null,
              completedAt: null,
            },
          ],
        },
      ]);
    }

    return HttpResponse.json([]);
  }),

  // GET /api/inventory
  http.get("/api/inventory", () => {
    return HttpResponse.json([
      {
        materialId: "coffee_beans",
        materialName: "Coffee Beans",
        currentLevel: 80000,
        maxCapacity: 100000,
        unit: "g",
        percentage: 80.0,
        alertTriggered: false,
      },
      {
        materialId: "milk",
        materialName: "Milk",
        currentLevel: 25000,
        maxCapacity: 100000,
        unit: "ml",
        percentage: 25.0,
        alertTriggered: true,
      },
      {
        materialId: "soy_milk",
        materialName: "Soy Milk",
        currentLevel: 30000,
        maxCapacity: 40000,
        unit: "ml",
        percentage: 75.0,
        alertTriggered: false,
      },
      {
        materialId: "filter_paper",
        materialName: "Filter Paper",
        currentLevel: 15000,
        maxCapacity: 20000,
        unit: "sheets",
        percentage: 75.0,
        alertTriggered: false,
      },
    ]);
  }),

  // GET /api/reporting/sales
  http.get("/api/reporting/sales", () => {
    return HttpResponse.json({
      totalOrders: 15,
      totalRevenue: 3600,
      averageOrderValue: 240,
      ordersByHour: [
        { hour: "09:00", count: 3 },
        { hour: "10:00", count: 5 },
        { hour: "11:00", count: 4 },
        { hour: "14:00", count: 3 },
      ],
    });
  }),

  // POST /api/orders — PlaceOrder
  http.post("/api/orders", async () => {
    return HttpResponse.json(
      {
        orderId: "order-new",
        totalAmount: 120,
        status: "PLACED",
      },
      { status: 201 }
    );
  }),

  // PATCH /api/orders/:id/confirm
  http.patch("/api/orders/:id/confirm", () => {
    return HttpResponse.json({
      orderId: "order-1",
      tableNumber: 1,
      status: "CONFIRMED",
      totalAmount: 120,
      items: [],
      placedAt: "2024-03-15T10:30:00",
      confirmedAt: "2024-03-15T10:31:00",
    });
  }),

  // POST /api/orders/:id/pay
  http.post("/api/orders/:id/pay", () => {
    return HttpResponse.json({
      orderId: "order-2",
      tableNumber: 3,
      status: "PAID",
      totalAmount: 280,
      cashReceived: 300,
      changeGiven: 20,
      items: [],
      placedAt: "2024-03-15T10:35:00",
      confirmedAt: "2024-03-15T10:36:00",
      paidAt: "2024-03-15T10:37:00",
    });
  }),

  // PATCH /api/orders/:id/deliver
  http.patch("/api/orders/:id/deliver", () => {
    return HttpResponse.json({ orderId: "order-1", status: "DELIVERED" });
  }),

  // PATCH /api/orders/:id/complete
  http.patch("/api/orders/:id/complete", () => {
    return HttpResponse.json({ orderId: "order-1", status: "COMPLETED" });
  }),

  // PATCH preparations start/complete
  http.patch("/api/preparations/:prepId/items/:itemId/start", () => {
    return HttpResponse.json({ preparationId: "prep-1", status: "IN_PROGRESS" });
  }),

  http.patch("/api/preparations/:prepId/items/:itemId/complete", () => {
    return HttpResponse.json({ preparationId: "prep-1", status: "READY" });
  }),

  // POST /api/inventory/:materialId/replenish
  http.post("/api/inventory/:materialId/replenish", () => {
    return HttpResponse.json({ replenishmentId: "repl-1", status: "REQUESTED" });
  }),

  // GET /api/inventory/replenishments
  http.get("/api/inventory/replenishments", () => {
    return HttpResponse.json([]);
  }),

  // GET /api/reporting/inventory
  http.get("/api/reporting/inventory", () => {
    return HttpResponse.json([]);
  }),
];
