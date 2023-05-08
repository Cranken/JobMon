import { render, screen, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '@/mocks/server';
import RoleError from '@/pages/role-error';
import { useGetUser, UserRole, AuthUser } from '@/utils/user';


// mocks useGetUser
jest.mock('@/utils/user', () => ({
    ...jest.requireActual('@/utils/user'),
    useGetUser: jest.fn(),
}));


describe("RoleError", () => {
    test("renders the error message", () => {
      (useGetUser as jest.Mock).mockReturnValue({
        Username: "testuser",
        Roles: [UserRole.User]
      });  
      render(<RoleError />);
  
      expect(screen.getByText(/not permitted to access/i)).toBeInTheDocument();
    });
    test("renders the request access button", () => {
        (useGetUser as jest.Mock).mockReturnValue({
          Username: "testuser",
          Roles: [UserRole.User]
        });  
        render(<RoleError />);
    
        expect(screen.getByText('Request Access')).toBeInTheDocument();
      });
    // TODO: Fix the error!!!
    // test("sends a request when the request access button is clicked", async () => {
    //     (useGetUser as jest.Mock).mockReturnValue({
    //         Username: "testuser",
    //         Roles: [UserRole.User]
    //       }); 
    //     render(<RoleError />);
    //     fireEvent.click(screen.getByText('Request Access'));
    //     await screen.queryByText('The request was send successfully');
    //   });
})