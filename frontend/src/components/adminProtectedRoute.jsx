import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
        return <Navigate to="/" replace />;
    }

    try {
        const partes = adminToken.split(".");

        if (partes.length !== 3) {
            throw new Error("Token inválido");
        }

        const payload = JSON.parse(
            atob(
                partes[1]
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")
            )
        );

        if (payload.rol !== "admin") {
            throw new Error("No es administrador");
        }

        return children;

    } catch (error) {
        console.error(
            "Token de administrador inválido:",
            error
        );

        localStorage.removeItem("adminToken");

        return <Navigate to="/" replace />;
    }
}

export default AdminProtectedRoute;