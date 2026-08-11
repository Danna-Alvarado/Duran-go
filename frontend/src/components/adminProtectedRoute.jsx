import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
        return <Navigate to="/chofer" replace />;
    }

    let esAdmin = false;

    try {
        const partes = adminToken.split(".");

        if (partes.length === 3) {
            const payload = JSON.parse(
                atob(partes[1])
            );

            esAdmin = payload.rol === "admin";
        }
    } catch (error) {
        console.error(
            "Token de administrador inválido:",
            error
        );

        localStorage.removeItem("adminToken");
    }

    if (!esAdmin) {
        localStorage.removeItem("adminToken");

        return <Navigate to="/chofer" replace />;
    }

    return children;
}

export default AdminProtectedRoute;
