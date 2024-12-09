import React from "react";

interface ProductManagerProps {
  name: string;
  createdAt: string;
  onClick: () => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ name, createdAt, onClick }) => {
  return (
    <div onClick={onClick} style={{ border: "1px solid #ddd", padding: "10px", margin: "10px 0", cursor: "pointer" }}>
      <h3>{name}</h3>
      <p>Created At: {new Date(createdAt).toLocaleString()}</p>
    </div>
  );
};

export default ProductManager;
