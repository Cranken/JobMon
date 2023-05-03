import { rest } from 'msw';
import { AuthUser, UserRole } from '@/utils/auth';

export const handlers = [
    // Handles a POST /login request.
    // rest.post(loginUrl, (req, res, ctx) => {
    //     sessionStorage.setItem('is-authenticated', true.toString())
    //     return res(
    //         ctx.status(200),
    //     )
    // }),
    rest.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/login`, async (req, res, ctx) => {
    
      const { username, password, _ } = await req.json();
      if (username === "testuser" && password === "testpassword") {
        return res(ctx.status(200));
      } else {
        return res(ctx.status(401), ctx.json({ message: "Unauthorized" }));
      }
    })

    // Handles a GET /user request.
    // rest.get(loginUrl, (req, res, ctx) => {
    //     // Check if the uses is authenticated in this session.
    //     const isAuthenticated = sessionStorage.getItem('is-authenticated')

    //     if (!isAuthenticated) {
    //         // If not authenticated, respond with a 403 error
    //         return res(
    //             ctx.status(403),
    //             ctx.json({
    //                 errorMessage: "Not authorized",
    //             }),
    //         )
    //     }
    //     // If authenticated, return a mocked user details.
    //     return res(
    //         ctx.status(200),
    //         ctx.json({
    //             username: 'admin',
    //         }),
    //     )
    // }),
    // rest.get(loginUrl, (req, res, ctx) => {
    //     const user: AuthUser = {
    //       Username: 'JohnDoe',
    //       Roles: [UserRole.User],
    //     };
    //     return res(
    //       ctx.status(200),
    //       ctx.json(user),
    //     );
    //   })
    
      // rest.get('/admin', (req, res, ctx) => {
      //   const user: AuthUser = {
      //     Username: 'Admin',
      //     Roles: [UserRole.Admin],
      //   };
      //   return res(
      //     ctx.status(200),
      //     ctx.json(user),
      //   );
      // }),
    
      // rest.get('/forbidden', (req, res, ctx) => {
      //   return res(
      //     ctx.status(403),
      //     ctx.json({ message: 'Forbidden' }),
      //   );
      // }),
]