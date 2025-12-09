import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Dashboard routes require authentication
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        // All other routes are public
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
