"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
  
      if (response.ok) {
        router.push("/");
      } else {
        const data = await response.json();
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    }
  };  

  return (
    <div className={styles.container}>
      <h1>Product Manager Login</h1>
      <form onSubmit={handleLogin} className={styles.form}>
        <input
        className={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
        className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className={styles.button} >Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}