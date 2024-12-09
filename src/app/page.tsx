"use client";

import React, { useEffect, useState } from "react";
import ProductManager from "./components/ProductManager"; // Adjust the path if necessary
import styles from "./page.module.css";

interface ProductManagerData {
  _id: string;
  name: string;
  createdAt: string;
}

export default function Home() {
  const [productManagers, setProductManagers] = useState<ProductManagerData[]>([]);

  useEffect(() => {
    const fetchProductManagers = async () => {
      try {
        const response = await fetch("/api/productManagers");
        const data = await response.json();
        setProductManagers(data);
      } catch (error) {
        console.error("Failed to fetch product managers:", error);
      }
    };

    fetchProductManagers();
  }, []);

  const handleProductManagerClick = (id: string) => {
    console.log(`Navigating to product manager with ID: ${id}`);
    // Implement navigation logic here
  };

  return (
    <div className={styles.page}>
      <h1>Product Managers</h1>
      {productManagers.length > 0 ? (
        productManagers.map((manager) => (
          <ProductManager
            key={manager._id}
            name={manager.name}
            createdAt={manager.createdAt}
            onClick={() => handleProductManagerClick(manager._id)}
          />
        ))
      ) : (
        <p>No product managers found. Start by adding one!</p>
      )}
    </div>
  );
}
