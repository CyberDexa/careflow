export { auth as proxy } from "@/auth"

export const config = {
  matcher: [
    "/((?!api/auth|api/family-auth|_next/static|_next/image|favicon.ico|login|register|family|manifest.json|icons|sw.js).*)",
  ],
}
