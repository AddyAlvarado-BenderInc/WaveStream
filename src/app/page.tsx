"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useRouter } from 'next/navigation';
import ProductTemplate from './components/ProductTemplate/component';

interface ProductManager {
  _id?: string;
  name: string;
  productType: string;
  createdAt?: string;
}

export default function Home() {
  const [productManagers, setProductManagers] = useState<ProductManager[]>([]);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerType, setNewManagerType] = useState("");

  const handleDeleteProductManager = async (managerId: string) => {
    try {
      const response = await fetch(`/api/productManager/${managerId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Unexpected response:", text);
        throw new Error("Failed to delete product manager.");
      } else {
        setProductManagers(prev => prev.filter(manager => manager._id !== managerId));
      }
    } catch (error) {
      console.error("Failed to delete product manager:", error);
      throw new Error("Failed to delete product manager.");
    }
  };

    const handleToggleActive = async (managerId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/productManager/${managerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setProductManagers(prev => prev.map(manager => 
          manager._id === managerId ? { ...manager, isActive } : manager
        ));
      } else {
        throw new Error('Failed to update manager status');
      }
    } catch (error) {
      console.error('Error updating manager status:', error);
      alert('Failed to update manager status');
    }
  };

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
      console.log("New manager created:", newManager);
      setProductManagers((prev) => {
        console.log("Previous managers:", prev);
        console.log("Adding new manager:", newManager);
        return [...prev, newManager];
    });
      setNewManagerName("");
      console.log("New manager name:", newManagerName);
      setNewManagerType("");
      console.log("New manager type:", newManagerType);
    } catch (error: any) {
      console.error(error.message);
      alert(error.message);
    }
  };

  const handleManagerClick = (managerId: string) => {
    router.push(`/manager/${managerId}`);
  };

  console.log(productManagers);

  return (
    <div className={styles.page}>
      <header>
        <h1>Product Manager</h1>
        <h4>powered by <img src="/bender_logo_white.svg" alt="Bender Logo" width={100} height={100} /></h4>
      </header>
      <p>Total Managers: {productManagers.length}</p>
      <form className={styles.form} onSubmit={handleAddProductManager}>
        <input
          className={styles.input}
          type="text"
          value={newManagerName}
          onChange={(e) => setNewManagerName(e.target.value)}
          placeholder="Enter manager name"
          required
        />
        <select
          className={styles.select}
          value={newManagerType}
          onChange={(e) => setNewManagerType(e.target.value)}
          required
        >
          <option value="">Select a type</option>
          <option value="Ad-Hoc">Ad-Hoc</option>
          <option value="Static">Static</option>
          <option value="Product Matrix">Product Matrix</option>
        </select>
        <button className={styles.button} type="submit">Add manager</button>
      </form>
      <div className={styles.managerList}>
        {productManagers.map((manager) => (
          <ProductTemplate
            key={manager._id}
            manager={manager as Required<ProductManager>}
            onClick={handleManagerClick}
            onDelete={handleDeleteProductManager}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>
    </div>
  );
}
