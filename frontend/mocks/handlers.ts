import { rest } from 'msw';
import { AuthUser, UserRole } from '@/utils/user';

export const handlers = [
    
    rest.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/login`, async (req, res, ctx) => {
    
      const { username, password, _ } = await req.json();
      if (username === "testuser" && password === "testpassword") {
        return res(ctx.status(200), ctx.json({ message: "Logged in" }));
      } else {
        return res(ctx.status(401), ctx.json({ message: "Login failed" }));
      }
    })
]