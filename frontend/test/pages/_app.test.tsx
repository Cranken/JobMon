import { render, screen, waitFor } from "@testing-library/react";
import MyApp from "@/pages/_app";
import { RouterContext } from "next/dist/shared/lib/router-context";
import { createMockRouter } from "@/mocks/mockRouter";
import { useGetUser } from '@/utils/user';
import { useHasNoAllowedRole, useIsAuthenticated } from "@/utils/auth";
import { ChakraProvider } from "@chakra-ui/react";



// Mock useIsAuthenticated hook
jest.mock('@/utils/user', () => ({
    ...jest.requireActual('@/utils/user'),
    useGetUser: jest.fn(),
}));

jest.mock('@/utils/auth', () => ({
    ...jest.requireActual('@/utils/auth'),
    useIsAuthenticated: jest.fn(),
    useHasNoAllowedRole: jest.fn(),
}));


describe("MyApp component", () => {
  test("redirects to /role-error if user has no allowed role", async () => {
    const router = createMockRouter({pathname: "/jobs"});
    (useGetUser as jest.Mock).mockReturnValue({}); 
    (useIsAuthenticated as jest.Mock).mockReturnValue(true); 
    (useHasNoAllowedRole as jest.Mock).mockReturnValue(true); 
    render(
        <ChakraProvider>
          <RouterContext.Provider value={router}>
            <MyApp Component={<div>Test Component</div>} pageProps={{}} />
          </RouterContext.Provider>
        </ChakraProvider>);
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/role-error');
    });
    expect(screen.getByText('Checking user-roles')).toBeInTheDocument();
  });
  
  
  test("renders the component if there is no redirection needed", async () => {
    const router = createMockRouter({pathname: "/role-error"});
    (useGetUser as jest.Mock).mockReturnValue({}); 
    
    (useIsAuthenticated as jest.Mock).mockReturnValue(true); 
    (useHasNoAllowedRole as jest.Mock).mockReturnValue(false); 
    render(
      <ChakraProvider>
        <RouterContext.Provider value={router}>
          <MyApp Component={<div>Test Component</div>} pageProps={{}} />
        </RouterContext.Provider>
      </ChakraProvider>);
        
    
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/jobs');
    });
    expect(screen.getByText('Redirecting to jobs...')).toBeInTheDocument();
  });

  
  test("redirects to /login if user is not authenticated and not on /login", async () => {
    const router = createMockRouter({pathname: "/jobs"});
    (useGetUser as jest.Mock).mockReturnValue({}); 
    
    (useIsAuthenticated as jest.Mock).mockReturnValue(false); 
    render(
        <ChakraProvider>
          <RouterContext.Provider value={router}>
            <MyApp Component={<div>Test Component</div>} pageProps={{}} />
          </RouterContext.Provider>
        </ChakraProvider>);
        
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/login');
    });
    
  });

  test("redirects to /jobs if user is authenticated and on /login", async () => {
    const router = createMockRouter({pathname: "/login"});
    (useGetUser as jest.Mock).mockReturnValue({}); 
    (useIsAuthenticated as jest.Mock).mockReturnValue(true); 
    render(
        <ChakraProvider>
          <RouterContext.Provider value={router}>
            <MyApp Component={<div>Test Component</div>} pageProps={{}} />
          </RouterContext.Provider>
        </ChakraProvider>);
        
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/jobs');
    });
    
  });


  test("redirects to /login if user is not authenticated and not on /login", async () => {
    const router = createMockRouter({pathname: "/jobs"});
    (useGetUser as jest.Mock).mockReturnValue({}); 
    
    (useIsAuthenticated as jest.Mock).mockReturnValue(false); 
    render(
        <ChakraProvider>
          <RouterContext.Provider value={router}>
            <MyApp Component={<div>Test Component</div>} pageProps={{}} />
          </RouterContext.Provider>
        </ChakraProvider>);
        
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/login');
    });
    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
  });

  test("redirects to /login if user is authenticated and /login", async () => {
    const router = createMockRouter({pathname: "/login"});
    (useGetUser as jest.Mock).mockReturnValue({}); 
    
    (useIsAuthenticated as jest.Mock).mockReturnValue(true); 
    render(
        <ChakraProvider>
          <RouterContext.Provider value={router}>
            <MyApp Component={<div>Test Component</div>} pageProps={{}} />
          </RouterContext.Provider>
        </ChakraProvider>);
        
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/jobs');
    });
    expect(screen.getByText('Redirecting to jobs...')).toBeInTheDocument();
    
  });

});
