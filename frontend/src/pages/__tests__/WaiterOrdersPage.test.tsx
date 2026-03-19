import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import { WaiterOrdersPage } from "../WaiterOrdersPage";

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

describe("WaiterOrdersPage", () => {
  it("renders active orders from API (happy path)", async () => {
    renderWithProviders(<WaiterOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Table 1/i)).toBeInTheDocument();
    });

    // Verify field mapping: totalAmount is whole TWD
    expect(screen.getByText(/120 THB/)).toBeInTheDocument();
    // Verify status badge renders
    expect(screen.getByText(/PLACED/)).toBeInTheDocument();
  });

  it("shows error state when backend is unavailable", async () => {
    server.use(
      http.get("/api/orders", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithProviders(<WaiterOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    renderWithProviders(<WaiterOrdersPage />);
    // LoadingState uses animate-pulse skeleton divs
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
