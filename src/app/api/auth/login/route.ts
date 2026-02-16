import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();
    if (!login || !password) {
      return NextResponse.json(
        { error: "Логин и пароль обязательны" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findFirst({
      where: { OR: [{ login: login.trim() }, { email: login.trim() }] },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const res = NextResponse.json({
      user: { id: user.id, login: user.login, email: user.email, name: user.name, role: user.role },
    });
    res.cookies.set("userId", user.id, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
