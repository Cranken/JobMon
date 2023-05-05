import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "@/pages/login";
import { createMockRouter } from "@/mocks/mockRouter";
import { RouterContext } from "next/dist/shared/lib/router-context";
import 'whatwg-fetch'

describe("Login component", () => {
    test("Tests rendering.", () => {
        render(
            <RouterContext.Provider value={createMockRouter({})}>
                <Login />
            </RouterContext.Provider>
        );
        const usernameInput = screen.getByLabelText(/username/i);
        expect(usernameInput).toBeInTheDocument();
        const passwordInput = screen.getByLabelText(/password/i);
        expect(passwordInput).toBeInTheDocument();
        const loginButton = screen.getByRole("button", { name: 'Login' });
        expect(loginButton).toBeInTheDocument();
    });
    

    test("Tests form submission with correct credentials.", async () => {
        const router = createMockRouter({});
        render(
            <RouterContext.Provider value={router}>
                <Login />
            </RouterContext.Provider>
        );
        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');
        const loginButton = screen.getByRole("button", { name: 'Login' });
      
        fireEvent.change(usernameInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "testpassword" } });
      
        fireEvent.click(loginButton);
      
        await waitFor(() => {
            // In case of success, the user is redirected to the jobs page.
            expect(router.push).toHaveBeenCalledWith('/jobs');
        });
    });

    test("Tests form submission with incorrect credentials", async () => {
        const router = createMockRouter({query:{'login_failed':"true"}});
        render(
            <RouterContext.Provider value={router}>
                <Login />
            </RouterContext.Provider>
        );
        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');
        const loginButton = screen.getByRole("button", { name: 'Login' });
      
        fireEvent.change(usernameInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "testpassword1" } });
      
        fireEvent.click(loginButton);
      
        await waitFor(() => {
            // In the case of failure, the user is redirected to the login page with a query parameter.
            expect(router.push).toHaveBeenCalledWith('/login?login_failed');
        });
    });
    test("Tests oauth login.", async () => {
        const router = createMockRouter({});
        render(<RouterContext.Provider value={router}>
            <Login />
        </RouterContext.Provider>);

        const loginButton = screen.getByRole("button", { name: 'Login with OIDC' });
        fireEvent.click(loginButton);
        await waitFor(() => {
            // Oath login button redirects to the oauth URL.
            expect(router.push).toHaveBeenCalledWith(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/oauth/login`);
        
        });
    });
});