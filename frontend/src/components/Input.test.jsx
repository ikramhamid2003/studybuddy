import { render, screen, fireEvent } from "@testing-library/react";
import { Input, Textarea, Select } from "./Input";

describe("Input", () => {
  test("renders label and accepts typed text", () => {
    const onChange = jest.fn();
    render(<Input label="Topic" value="" onChange={onChange} />);
    expect(screen.getByText("Topic")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "gravity" } });
    expect(onChange).toHaveBeenCalled();
  });

  test("surfaces error text with alert role", () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});

describe("Textarea", () => {
  test("renders and updates value", () => {
    const onChange = jest.fn();
    render(<Textarea label="Notes" value="hi" onChange={onChange} />);
    expect(screen.getByDisplayValue("hi")).toBeInTheDocument();
  });
});

describe("Select", () => {
  test("opens options and selects a value", () => {
    const onChange = jest.fn();
    render(
      <Select label="Level" value="beginner" onChange={onChange}>
        <option value="beginner">Beginner</option>
        <option value="advanced">Advanced</option>
      </Select>
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /advanced/i }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].target.value).toBe("advanced");
  });
});
