import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import Login from "@/pages/login";

jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/",
            pathname: "",
            query: "",
            asPath: "",
        };
    },
}));
const server = setupServer(
  rest.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/login`, (req, res, ctx) => {
    
    const { username, password, remember } = req;
    if (username === "testuser" && password === "testpassword") {
      return res(ctx.json({ success: true }));
    } else {
      return res(ctx.status(401), ctx.json({ message: "Unauthorized" }));
    }
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders the login form", () => {
  render(<Login />);
  const usernameInput = screen.getByLabelText(/username/i);
  expect(usernameInput).toBeInTheDocument();
  const passwordInput = screen.getByLabelText(/password/i);
  expect(passwordInput).toBeInTheDocument();
  const loginButton = screen.getByRole("button", { name: 'Login' });
  expect(loginButton).toBeInTheDocument();
});

test("submits the login form", async () => {
  render(<Login />);
  const usernameInput = screen.getByLabelText(/username/i);
  const passwordInput = screen.getByLabelText(/password/i);
  //   const loginButton = screen.getByRole("button", { name: /login/i });

  fireEvent.change(usernameInput, { target: { value: "testuser" } });
  fireEvent.change(passwordInput, { target: { value: "testpassword" } });

  // fireEvent.click(loginButton);

  await waitFor(() => {
    expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
