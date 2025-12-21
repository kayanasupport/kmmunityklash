import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Studio from "./Studio.jsx";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/studio", element: <Studio /> },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
