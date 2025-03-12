import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  // Routes that can be accessed without auth
  publicRoutes: [
    "/", 
    "/api/webhooks(.*)"
  ],
  
  // Routes excluded from auth entirely
  ignoredRoutes: [
    "/((?!api|trpc))(_next.*|.+\\.[\w]+$)"
  ],
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/(api|trpc)(.*)"],
}

