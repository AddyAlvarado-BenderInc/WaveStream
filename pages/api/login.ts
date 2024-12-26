import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    console.log("Invalid request method:", req.method);
    return res
      .status(405)
      .setHeader("Allow", ["POST"])
      .json({ message: `Method ${req.method} Not Allowed` });
  }

  const { username, password } = req.body;
  const loginUsername = process.env.USERNAME;
  const loginPassword = process.env.PASSWORD;

  console.log("Login request payload:", { username, password });

  if (username === loginUsername && password === loginPassword) {
    const token = "VALID_TOKEN";
    res.setHeader(
      "Set-Cookie",
      serialize("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      })
    );
    console.log("Login successful, token set.");
    return res.status(200).json({ message: "Login successful" });
  }

  console.log("Invalid username or password.");
  return res.status(401).json({ message: "Invalid username or password" });
}