import axios, { AxiosError } from "axios";
import type {
  Order,
  Preparation,
  InventoryItem,
  SalesReport,
  PlaceOrderRequest,
} from "./types";

const api = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let message = "An unexpected error occurred";
    if (error.response) {
      const data = error.response.data;
      if (typeof data === "string") {
        message = data;
      } else if (data && typeof data === "object" && "message" in data) {
        message = (data as { message: string }).message;
      } else if (data && typeof data === "object" && "error" in data) {
        message = (data as { error: string }).error;
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export const orderApi = {
  getOrders: async (status?: string): Promise<Order[]> => {
    const params = status ? { status } : {};
    const { data } = await api.get<Order[]>("/api/orders", { params });
    return data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const { data } = await api.get<Order>(`/api/orders/${id}`);
    return data;
  },

  placeOrder: async (order: PlaceOrderRequest): Promise<Order> => {
    const { data } = await api.post<Order>("/api/orders", order);
    return data;
  },

  confirmOrder: async (id: string): Promise<Order> => {
    const { data } = await api.patch<Order>(`/api/orders/${id}/confirm`);
    return data;
  },

  processPayment: async (
    id: string,
    cashReceived: number
  ): Promise<Order> => {
    const { data } = await api.post<Order>(`/api/orders/${id}/pay`, {
      cashReceived,
    });
    return data;
  },

  deliverOrder: async (id: string): Promise<Order> => {
    const { data } = await api.patch<Order>(`/api/orders/${id}/deliver`);
    return data;
  },

  completeOrder: async (id: string): Promise<Order> => {
    const { data } = await api.patch<Order>(`/api/orders/${id}/complete`);
    return data;
  },
};

export const preparationApi = {
  getPreparations: async (status?: string): Promise<Preparation[]> => {
    const params = status ? { status } : {};
    const { data } = await api.get<Preparation[]>("/api/preparations", {
      params,
    });
    return data;
  },

  startPreparation: async (
    prepId: string,
    itemId: string
  ): Promise<Preparation> => {
    const { data } = await api.patch<Preparation>(
      `/api/preparations/${prepId}/items/${itemId}/start`
    );
    return data;
  },

  completePreparation: async (
    prepId: string,
    itemId: string
  ): Promise<Preparation> => {
    const { data } = await api.patch<Preparation>(
      `/api/preparations/${prepId}/items/${itemId}/complete`
    );
    return data;
  },
};

export const inventoryApi = {
  getInventoryItems: async (): Promise<InventoryItem[]> => {
    const { data } = await api.get<InventoryItem[]>("/api/inventory");
    return data;
  },

  requestReplenishment: async (materialId: string): Promise<void> => {
    await api.post(`/api/inventory/${materialId}/replenish`);
  },
};

export const reportingApi = {
  getSalesReport: async (): Promise<SalesReport> => {
    const { data } = await api.get<SalesReport>("/api/reporting/sales");
    return data;
  },

  getInventoryReport: async (): Promise<InventoryItem[]> => {
    const { data } = await api.get<InventoryItem[]>(
      "/api/reporting/inventory"
    );
    return data;
  },
};
