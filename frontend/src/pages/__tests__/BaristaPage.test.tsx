import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import { BaristaPage } from "../BaristaPage";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BaristaPage", () => {
  it("renders preparation queue (happy path)", async () => {
    renderWithProviders(<BaristaPage />);

    await waitFor(() => {
      expect(screen.getByText(/ESPRESSO/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Table 2/i)).toBeInTheDocument();
  });

  it("shows error state when preparation service is down", async () => {
    server.use(
      http.get("/api/preparations", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithProviders(<BaristaPage />);

    await waitFor(() => {
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });
  });

  it("renders inventory with alertTriggered field (not isAlertTriggered)", async () => {
    renderWithProviders(<BaristaPage />);

    // Click inventory tab
    const inventoryTab = await screen.findByText(/Inventory/i);
    inventoryTab.click();

    await waitFor(() => {
      // Milk should show as low stock (25%, alertTriggered=true)
      // Use getAllByText since "Milk" matches both "Milk" and "Soy Milk"
      const milkElements = screen.getAllByText(/Milk/i);
      expect(milkElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Coffee Beans/i)).toBeInTheDocument();
    });

    // Verify LOW STOCK badge appears for Milk (alertTriggered=true)
    expect(screen.getByText(/LOW STOCK/i)).toBeInTheDocument();
  });
});
