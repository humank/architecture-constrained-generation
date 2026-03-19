import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import { CashierPage } from "../CashierPage";

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

describe("CashierPage", () => {
  it("renders pending confirmation tab (happy path)", async () => {
    renderWithProviders(<CashierPage />);

    await waitFor(() => {
      // The default tab is "Pending Confirmation"; with PLACED orders it shows a Confirm button
      expect(screen.getByText(/Pending Confirmation/i)).toBeInTheDocument();
    });

    // Should show the PLACED order from our handler
    await waitFor(() => {
      expect(screen.getByText(/Table 1/i)).toBeInTheDocument();
    });
  });

  it("shows error state when ordering service is down", async () => {
    server.use(
      http.get("/api/orders", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithProviders(<CashierPage />);

    await waitFor(() => {
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });
  });

  it("renders sales report with correct fields", async () => {
    renderWithProviders(<CashierPage />);

    // Click on Sales Report tab
    const salesTab = await screen.findByText(/Sales Report/i);
    salesTab.click();

    await waitFor(() => {
      // Verify totalRevenue is in whole TWD (3600, not 360000)
      expect(screen.getByText(/3600 THB/)).toBeInTheDocument();
    });
  });
});
