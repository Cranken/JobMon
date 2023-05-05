import { rest } from 'msw';

export const handlers = [
  rest.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/login`, async (req, res, ctx) => {
    const { username, password, _ } = await req.json();
    if (username === "testuser" && password === "testpassword") {
      return res(ctx.status(200), ctx.json({ message: "Logged in" }));
    } else {
      return res(ctx.status(401), ctx.json({ message: "Login failed" }));
    }
  }),

  rest.get('https://example.com', (req, res, ctx) => {
    return res(ctx.json({ data: 'example' }), ctx.status(200));
  }),

  rest.get('https://example.com/unauthorized', (req, res, ctx) => {
    return res(ctx.status(401));
  }),

  rest.get('https://example.com/forbidden', (req, res, ctx) => {
    return res(ctx.status(403));
  })
]