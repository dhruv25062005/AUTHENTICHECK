import { NextResponse } from "next/server";
import { users, createToken } from "../../../store";
import { randomUUID } from "node:crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, role = "CONSUMER", organizationName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (users.has(normalizedEmail)) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const id = randomUUID();
    const newUser = {
      id,
      email: normalizedEmail,
      passwordHash: password, // In-memory mock
      fullName: fullName.trim(),
      role: role === "MANUFACTURER" ? ("MANUFACTURER" as const) : ("CONSUMER" as const),
      organizationName: role === "MANUFACTURER" ? organizationName : undefined
    };

    users.set(normalizedEmail, newUser);

    const authUser = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role
    };

    const accessToken = createToken(authUser);
    return NextResponse.json({ user: authUser, accessToken }, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
