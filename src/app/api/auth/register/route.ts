import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { login, password, passwordConfirm, name } = await req.json();
    if (!login?.trim() || !password || !name?.trim()) {
      return NextResponse.json(
        { error: "Логин, пароль и имя обязательны" },
        { status: 400 }
      );
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: "Пароли не совпадают" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль не менее 6 символов" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ login: login.trim() }, { email: login.trim() }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Такой логин уже занят" }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { login: login.trim(), password: hash, name: name.trim(), role: "member" },
      select: { id: true, login: true, name: true, role: true },
    });
    const res = NextResponse.json({ user });
    res.cookies.set("userId", user.id, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
