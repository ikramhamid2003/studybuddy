import { render, screen } from "@testing-library/react";
import { Input, Textarea, Select } from "./Input";

test("a label names its input, so assistive tech and getByLabelText find it", () => {
  render(<Input label="Username" placeholder="Choose a username" />);
  expect(screen.getByLabelText("Username")).toBe(screen.getByPlaceholderText("Choose a username"));
});

test("a label names its textarea", () => {
  render(<Textarea label="Notes" />);
  expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
});

test("a caller-supplied id is respected", () => {
  render(<Input label="Email" id="email-field" />);
  expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email-field");
});

test("two fields on one page get different ids, so each error points at its own field", () => {
  render(
    <>
      <Input label="Password" error="Too short" />
      <Input label="Confirm password" error="Does not match" />
    </>,
  );
  const first = screen.getByLabelText("Password");
  const second = screen.getByLabelText("Confirm password");
  expect(first.id).not.toBe(second.id);
  expect(first).toHaveAccessibleDescription("Too short");
  expect(second).toHaveAccessibleDescription("Does not match");
});

test("hints describe the field when there is no error", () => {
  render(<Input label="Password" hint="Minimum 8 characters" />);
  expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("Minimum 8 characters");
});

test("a select's label names its trigger and its error is linked", () => {
  render(
    <Select label="Difficulty" error="Pick one" options={[{ value: "easy", label: "Easy" }]} />,
  );
  const trigger = screen.getByRole("combobox", { name: "Difficulty" });
  expect(trigger).toHaveAccessibleDescription("Pick one");
});
