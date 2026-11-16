import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ConverterView } from "@/components/converter/ConverterView";

const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));
vi.mock("@/lib/app-context", () => ({
  useApp: () => ({ currentUser: null }),
}));
vi.mock("@/hooks/use-formats", () => ({
  useFormats: () => ({ data: null }),
}));
vi.mock("@/lib/storage", () => ({
  primeStorage: async () => undefined,
}));

it("updates compatible output options and sends the selected format to the file queue", () => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });

  const { container } = render(<ConverterView />);
  const source = screen.getByLabelText("From");
  const output = screen.getByLabelText("To");

  fireEvent.change(source, { target: { value: "png" } });
  fireEvent.change(output, { target: { value: "gif" } });
  expect(output).toHaveValue("gif");

  fireEvent.change(source, { target: { value: "xlsx" } });
  expect(output).toHaveValue("");

  fireEvent.change(source, { target: { value: "pdf" } });
  fireEvent.change(output, { target: { value: "jpg" } });
  expect(output).toHaveValue("jpg");
  expect(window.location.search).toBe("?from=pdf&to=jpg");

  const fileInput = container.querySelector('input[type="file"]');
  expect(fileInput).toHaveAttribute("accept", ".pdf");
  fireEvent.change(fileInput!, {
    target: { files: [new File(["%PDF-1.4"], "example.pdf", { type: "application/pdf" })] },
  });
  expect(screen.getAllByText("example.pdf")[0]).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Output format for example.pdf" })).toHaveTextContent("JPG");

  act(() => window.dispatchEvent(new Event("convertek:reset-queue")));
  expect(screen.getByLabelText("From")).toHaveValue("");
  expect(screen.getByLabelText("To")).toHaveValue("");
  expect(window.location.search).toBe("");
});
