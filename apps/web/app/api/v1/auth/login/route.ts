import { NextResponse } from "next/server";
import { users, createToken } from "../../../store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = users.get(normalizedEmail);

    // If logging in with demo credentials or any new email in dev mock
    if (!user) {
      if (normalizedEmail === "manufacturer@example.com" || normalizedEmail.includes("manufacturer")) {
        user = {
          id: "user-demo-manufacturer-1",
          email: normalizedEmail,
          passwordHash: password,
          fullName: "Apex Goods Corp",
          role: "MANUFACTURER",
          organizationName: "Apex Manufacturing Global"
        };
        users.set(normalizedEmail, user);
      } else {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    }

    const authUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    const accessToken = createToken(authUser);
    return NextResponse.json({ user: authUser, accessToken });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
