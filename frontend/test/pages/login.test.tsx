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

describe("Login component", () => {
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
        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');
        const loginButton = screen.getByRole("button", { name: 'Login' });
      
        fireEvent.change(usernameInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "testpassword" } });
      
        fireEvent.click(loginButton);
      
        await waitFor(() => {
          expect(screen.queryByText(/login_failed/i)).not.toBeInTheDocument();
        //   expect(screen.getByText(/success/i)).toBeInTheDocument();
        });
    });
});


