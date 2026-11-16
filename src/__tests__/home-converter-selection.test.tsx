import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConverterView } from "@/components/converter/ConverterView";

const searchParams = new URLSearchParams();
let currentUser: { id: string } | null = null;
const getLocalHistory = vi.fn();

afterEach(() => {
  currentUser = null;
  getLocalHistory.mockReset();
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));
vi.mock("@/lib/app-context", () => ({
  useApp: () => ({ currentUser }),
}));
vi.mock("@/hooks/use-formats", () => ({
  useFormats: () => ({ data: null }),
}));
vi.mock("@/lib/storage", () => ({
  primeStorage: async () => undefined,
  getLocalHistory: (...args: unknown[]) => getLocalHistory(...args),
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

it("shows the same uploader on a pair page and retains the pair defaults", () => {
  const { container } = render(<ConverterView embedded initialFrom="pdf" initialTo="jpg" />);

  expect(screen.getByLabelText("From")).toBeDisabled();
  expect(screen.getByLabelText("From")).toHaveValue("pdf");
  expect(screen.getByLabelText("To")).toHaveValue("jpg");
  expect(screen.getByRole("button", { name: "Choose PDF files" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Why Convertek?" })).toBeNull();

  const fileInput = container.querySelector('input[type="file"]');
  expect(fileInput).toHaveAttribute("accept", ".pdf");
  fireEvent.change(fileInput!, {
    target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
  });
  expect(screen.getByRole("combobox", { name: "Output format for sample.pdf" })).toHaveTextContent("JPG");
  expect(window.location.search).toBe("");
});


it("keeps signed-in conversion history collapsed below the uploader", async () => {
  currentUser = { id: "test-user" };
  getLocalHistory.mockResolvedValue([
    {
      id: "conversion-1",
      fileName: "previous.pdf",
      originalExt: "pdf",
      targetExt: "jpg",
      category: "document",
      status: "done",
      createdAt: "2026-11-16T12:00:00Z",
    },
  ]);

  render(<ConverterView />);

  const upload = screen.getByRole("button", { name: "Choose files" });
  const history = await screen.findByText("Recent conversions");
  const details = history.closest("details");
  expect(details).not.toHaveAttribute("open");
  const workspace = screen.getByRole("region", { name: "Convert your files" });
  expect(workspace).toContainElement(upload);
  expect(workspace).not.toContainElement(details);
  expect(upload.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText("previous.pdf")).not.toBeVisible();

  fireEvent.click(history);
  expect(details).toHaveAttribute("open");
  expect(screen.getByText("previous.pdf")).toBeVisible();
});
