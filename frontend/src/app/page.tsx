"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import ProductTemplate from "./components/ProductTemplate/component";

interface ProductManager {
  _id?: string;
  name: string;
  productType: string;
  createdAt?: string;
  runManager?: boolean;
  icon: string;
  descriptionFooter: string;
  label: string;
  displayAs?: string;
}

export default function Home() {
  const [productManagers, setProductManagers] = useState<ProductManager[]>([]);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerType, setNewManagerType] = useState("");
  const [theme, setTheme] = useState<"Light" | "Dark">("Dark");

  const handleDeleteProductManager = async (managerId: string, productType: string) => {
    try {
      const response = await fetch(`/api/productManager/${productType}/${managerId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Unexpected response:", text);
        throw new Error("Failed to delete product manager.");
      } else {
        setProductManagers((prev) => prev.filter((manager) => manager._id !== managerId));
      }
    } catch (error) {
      console.error("Failed to delete product manager:", error);
      throw new Error("Failed to delete product manager.");
    }
  };

  const handleEditName = async (managerId: string, newName: string) => {
    try {
      const response = await fetch(`/api/productManager/${managerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        setProductManagers((prev) =>
          prev.map((manager) =>
            manager._id === managerId ? { ...manager, name: newName } : manager
          )
        );
      } else {
        throw new Error("Failed to update manager name");
      }
    } catch (error) {
      console.error("Error updating manager name:", error);
      alert("Failed to update manager name");
    }
  }

  const router = useRouter();

  useEffect(() => {
    const fetchProductManagers = async () => {
      try {
        const response = await fetch("/api/productManager");
        const data = await response.json();
        setProductManagers(data);
      } catch (error) {
        console.error("Failed to fetch product managers:", error);
      }
    };

    fetchProductManagers();
  }, []);

  const handleAddProductManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerName.trim()) return alert("Manager name is required!");
    if (!newManagerType) return alert("Product type is required!");

    try {
      const response = await fetch("/api/productManager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newManagerName, productType: newManagerType }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Unexpected response:", text);
        throw new Error("Failed to add product manager.");
      }

      const newManager = await response.json();
      setProductManagers((prev) => [...prev, newManager]);
      setNewManagerName("");
      setNewManagerType("");
    } catch (error: any) {
      console.error(error.message);
      alert(error.message);
    }
  };

  const handleManagerClick = (managerId: string) => {
    router.push(`/manager/${managerId}`);
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as "Dark" | "Light");
  };

  const handleLogout = () => {
    router.push(`/login`);
  }

  return (
    <div className={`${styles.page} ${theme === "Light" ? styles.lightTheme : styles.darkTheme}`}>
      <header>
        <div className={styles.leftHeader}>
          <h1>WaveKey Manager</h1>
          <div className={styles.poweredContent}>
            <h4>
              powered by{" "}
              <img
                className={styles.companyLogo}
                src="/bender_logo_white.svg"
                alt="Bender Logo"
                width={100}
                height={100}
              />
            </h4>
          </div>
        </div>
        <button name="logout-button" className={styles.button}
          onClick={handleLogout}>
          Logout
        </button>
      </header>
      <p>Total Keys: {productManagers.length}</p>
      <form className={styles.form} onSubmit={handleAddProductManager}>
        <input
          className={styles.input}
          type="text"
          value={newManagerName}
          onChange={(e) => setNewManagerName(e.target.value)}
          placeholder="Enter Key Name"
          required
        />
        <select
          className={styles.select}
          value={newManagerType}
          onChange={(e) => setNewManagerType(e.target.value)}
          required
        >
          <option value="">Select A Type</option>
          <option value="Manager">Manager</option>
        </select>
        <button className={styles.button} type="submit">
          Add Key
        </button>
      </form>
      <div className={styles.managerList}>
        {productManagers.map((manager) => (
          <ProductTemplate
            key={manager._id}
            manager={manager as Required<ProductManager>}
            onClick={handleManagerClick}
            onDelete={handleDeleteProductManager}
            onEditName={handleEditName}
          />
        ))}
      </div>
      <select className={styles.themeSelect} value={theme} onChange={handleThemeChange}>
        <option value="Dark">Dark</option>
        <option value="Light">Light</option>
      </select>
    </div>
  );
}