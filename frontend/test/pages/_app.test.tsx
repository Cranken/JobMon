import { render, screen, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { useRouter } from "next/router";
import MyApp from "@/pages/_app";
import { RouterContext } from "next/dist/shared/lib/router-context";
import { createMockRouter } from "@/mocks/mockRouter";
import { useGetUser } from '@/utils/user';
import { useHasNoAllowedRole, useIsAuthenticated } from "@/utils/auth";
import { ChakraProvider } from "@chakra-ui/react";


const server = setupServer(
  // Define mock API responses
  rest.get("/api/getUser", (req, res, ctx) => {
    return res(ctx.json({ roles: ["user"] }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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

      
  });
  
  
  // test("renders the component if there is no redirection needed", async () => {
  //   const router = createMockRouter({pathname: "/jobs"});
  //   (useGetUser as jest.Mock).mockReturnValue({}); 
    
  //   (useIsAuthenticated as jest.Mock).mockReturnValue(true); 
  //   (useHasNoAllowedRole as jest.Mock).mockReturnValue(false); 
  //   render(
  //     <ChakraProvider>
  //       <RouterContext.Provider value={router}>
  //         <MyApp Component={<div>Test Component</div>} pageProps={{}} />
  //       </RouterContext.Provider>
  //     </ChakraProvider>);
        
    
  //   await waitFor(() => {
  //     expect(router.push).toHaveBeenCalledWith('/jobs');
  //   });

  //   // TODO: redirectionString="Checking user-roles"

      
  // });

  test("redirects to /jobs if the is in /role-error and user has a defined role", async () => {
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

    // TODO: redirectionString="Redirecting to jobs..."

      
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

  // test("redirects to /jobs if user is authenticated and on /login", async () => {
  //   const router = createMockRouter({pathname: "/login"});
  //   (useGetUser as jest.Mock).mockReturnValue({}); 
  //   (useIsAuthenticated as jest.Mock).mockReturnValue(false); 
  //   render(
  //       <ChakraProvider>
  //         <RouterContext.Provider value={router}>
  //           <MyApp Component={<div>Test Component</div>} pageProps={{}} />
  //         </RouterContext.Provider>
  //       </ChakraProvider>);
        
  //   await waitFor(() => {
  //     expect(router.push).toHaveBeenCalledWith('/jobs');
  //   });
    
  // });

    

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

  // test("redirects to /login if user is not authenticated and not on /login", async () => {
  //   const router = createMockRouter({pathname: "/login"});
  //   (useGetUser as jest.Mock).mockReturnValue({}); 
    
  //   (useIsAuthenticated as jest.Mock).mockReturnValue(false); 
  //   render(
  //       <ChakraProvider>
  //         <RouterContext.Provider value={router}>
  //           <MyApp Component={<div>Test Component</div>} pageProps={{}} />
  //         </RouterContext.Provider>
  //       </ChakraProvider>);
        
  //   await waitFor(() => {
  //     expect(router.push).toHaveBeenCalledWith('/jobs');
  //   });
    
  // });



});
