import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { WaiterOrdersPage } from "@/pages/WaiterOrdersPage";
import { PlaceOrderPage } from "@/pages/PlaceOrderPage";
import { CashierPage } from "@/pages/CashierPage";
import { BaristaPage } from "@/pages/BaristaPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/waiter/orders" replace />,
      },
      {
        path: "waiter/orders",
        element: <WaiterOrdersPage />,
      },
      {
        path: "waiter/orders/new",
        element: <PlaceOrderPage />,
      },
      {
        path: "cashier",
        element: <CashierPage />,
      },
      {
        path: "barista",
        element: <BaristaPage />,
      },
    ],
  },
]);
